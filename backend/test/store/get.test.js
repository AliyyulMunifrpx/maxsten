import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

// Jadwal "buka 24 jam" tiap hari, biar is_open deterministik = true
// tanpa perlu mock waktu (integration test pakai jam beneran).
function fullOpenSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: true,
  }));
}

// Jadwal "tutup terus", buat test yang butuh schedule bilang tutup.
function fullClosedSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: false,
  }));
}

describe("get store", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";
  let createdStoreIds = [];

  beforeEach(async () => {
    // 1. Generate email unik
    testEmail = `store_get_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Get Store",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId, // Hapus jika Prisma ID pakai auto-generate default
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Get Store",
      },
    });

    // 4. Login untuk dapatkan Access Token
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = result.body.data.access_token;

    // 5. Reset array id toko.
    // Gak perlu lagi hapus toko lama, karena user ini 100% baru.
    createdStoreIds = [];
  }, 20000);

  afterEach(async () => {
    // 1. Hapus toko-toko yang dibuat selama test ini berjalan
    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }

    // 2. Hapus User dari tabel Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 3. Hapus User dari Supabase Auth
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // best-effort cleanup
      }
    }
  }, 20000);

  // Helper: langsung insert store + operational_hours via Prisma, supaya
  // manual_status / manual_updated_at / schedule bisa dikontrol penuh
  async function createStoreDirect({
    name,
    schedule = fullOpenSchedule(),
    manual_status = null,
    manual_updated_at = null,
    timezone = "Asia/Jakarta",
  }) {
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name,
        description: "Warung test",
        timezone,
        street_address: "Jl. Test No. 1",
        village: "Tonoboyo",
        district: "Bandongan",
        city: "KAB. MAGELANG",
        province: "JAWA TENGAH",
        postal_code: "56151",
        latitude: -7.5849,
        longitude: 110.2754,
        manual_status,
        manual_updated_at,
        is_delete: false,
        operational_hours: { create: schedule },
      },
    });
    createdStoreIds.push(store.public_id);
    return store;
  }

  test("should get the logged-in user's store with expected fields", async () => {
    await createStoreDirect({ name: "Warung Get 1" });

    const result = await supertest(web)
      .get("/api/stores/me")
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.public_id).toBeDefined();
    expect(result.body.data.name).toBe("Warung Get 1");
    expect(typeof result.body.data.is_open).toBe("boolean");
    expect(result.body.data.operational_hours).toHaveLength(7);
  }, 20000);

  test("should return 404 when the logged-in user has no store", async () => {
    // Sengaja gak bikin store apapun
    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should return 401 when unauthorized (no token)", async () => {
    await createStoreDirect({ name: "Warung Get 2" });

    const result = await supertest(web).get("/api/stores/me"); // Tanpa Token

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);

  test("should reflect is_open=true from schedule when there is no manual override", async () => {
    await createStoreDirect({
      name: "Warung Buka 24 Jam",
      schedule: fullOpenSchedule(),
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.is_open).toBe(true);
  }, 20000);

  test("should reflect is_open=false from schedule when there is no manual override", async () => {
    await createStoreDirect({
      name: "Warung Tutup Terus",
      schedule: fullClosedSchedule(),
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.is_open).toBe(false);
  }, 20000);

  test("should force is_open=false via manual override even when schedule says open", async () => {
    await createStoreDirect({
      name: "Warung Override Tutup",
      schedule: fullOpenSchedule(),
      manual_status: "CLOSED",
      manual_updated_at: new Date(),
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.is_open).toBe(false);
  }, 20000);

  test("should force is_open=true via manual override even when schedule says closed", async () => {
    await createStoreDirect({
      name: "Warung Override Buka",
      schedule: fullClosedSchedule(),
      manual_status: "OPEN",
      manual_updated_at: new Date(),
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.is_open).toBe(true);
  }, 20000);

  test("should ignore a stale manual override from a previous day and fall back to schedule", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await createStoreDirect({
      name: "Warung Override Basi",
      schedule: fullOpenSchedule(),
      manual_status: "CLOSED",
      manual_updated_at: yesterday,
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    // Override kemarin sudah basi -> harus balik ke jadwal (buka)
    expect(result.body.data.is_open).toBe(true);
  }, 20000);

  test("should not return a soft-deleted store (is_delete=true)", async () => {
    await createStoreDirect({ name: "Warung Dihapus" });
    await prisma.store.updateMany({
      where: { user_id: userId },
      data: { is_delete: true },
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(404);
  }, 20000);
});
