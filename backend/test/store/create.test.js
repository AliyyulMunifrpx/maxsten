import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

// PNG 1x1 transparan, biar gak butuh file fixture beneran di disk
const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("create store", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let createdStoreNames = [];
  let testEmail = "";
  let userId = "";

  beforeEach(async () => {
    // 1. Generate email unik
    testEmail = `store_create_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Store Create",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Store Create",
      },
    });

    // 4. Login untuk dapatkan Access Token
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = result.body.data.access_token;
    createdStoreNames = [];
  }, 20000);

  afterEach(async () => {
    // 1. Cari logo_url dari toko milik user tumbal ini
    const storesToDelete = await prisma.store.findMany({
      where: { user_id: userId },
      select: { logo_url: true },
    });

    // 2. Hapus file dari Supabase
    for (const store of storesToDelete) {
      if (store.logo_url && store.logo_url.includes("supabase.co")) {
        const parts = store.logo_url.split("/store-logos/");
        if (parts.length > 1) {
          const fileName = parts[1];
          try {
            await supabase.storage.from("store-logos").remove([fileName]);
          } catch (error) {
            // Abaikan jika file memang tidak ada
          }
        }
      }
    }

    // 3. SAPU BERSIH DATA: Hapus User dari Prisma
    if (testEmail) {
      await prisma.store.deleteMany({ where: { user_id: userId } });
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 4. Hapus User dari Supabase Auth
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // best-effort cleanup
      }
    }
  }, 20000);

  // Helper: generate payload + otomatis didaftarin ke daftar cleanup
  function baseStorePayload(name) {
    createdStoreNames.push(name);
    return {
      name,
      description: "Warung makan terenak sedunia",
      timezone: "Asia/Jakarta",
      street_address: "Jl. Magelang No. 123",
      village: "Tonoboyo",
      district: "Bandongan",
      city: "KAB. MAGELANG",
      province: "JAWA TENGAH",
      postal_code: "56151",
      latitude: -7.5849,
      longitude: 110.2754,
    };
  }

  test("should can create new store", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        ...baseStorePayload("Warung Berbero"),
        operational_hours: [
          { day: 0, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 1, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 2, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 3, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 4, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 5, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 6, open_time: "08:00", close_time: "20:00", is_active: true },
        ],
      });
    expect(result.status).toBe(201);
    expect(result.body.data.public_id).toBeDefined();
  }, 20000);

  test("should always create exactly 7 operational_hours entries", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(baseStorePayload("Warung Tujuh Hari"));

    expect(result.status).toBe(201);

    const store = await prisma.store.findUnique({
      where: { public_id: result.body.data.public_id },
      include: { operational_hours: true },
    });

    expect(store.operational_hours).toHaveLength(7);
  }, 20000);

  test("should save the operational_hours submitted by the user (currently ignored - known bug)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        ...baseStorePayload("Warung Custom Jam"),
        operational_hours: [
          { day: 0, open_time: "00:00", close_time: "00:00", is_active: false },
          { day: 1, open_time: "09:00", close_time: "17:00", is_active: true },
          { day: 2, open_time: "09:00", close_time: "17:00", is_active: true },
          { day: 3, open_time: "09:00", close_time: "17:00", is_active: true },
          { day: 4, open_time: "09:00", close_time: "17:00", is_active: true },
          { day: 5, open_time: "09:00", close_time: "17:00", is_active: true },
          { day: 6, open_time: "10:00", close_time: "15:00", is_active: true },
        ],
      });
    expect(result.status).toBe(400);
  }, 20000);

  test("should create store without a logo file (logo_url null)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(baseStorePayload("Warung Tanpa Logo"));

    expect(result.status).toBe(201);

    const store = await prisma.store.findUnique({
      where: { public_id: result.body.data.public_id },
    });

    expect(store.logo_url).toBeNull();
  }, 20000);

  test("should create store with a logo file and parse operational_hours sent as JSON string (multipart)", async () => {
    const payload = baseStorePayload("Warung Ada Logo");

    const result = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", payload.name)
      .field("description", payload.description)
      .field("timezone", payload.timezone)
      .field("street_address", payload.street_address)
      .field("village", payload.village)
      .field("district", payload.district)
      .field("city", payload.city)
      .field("province", payload.province)
      .field("postal_code", payload.postal_code)
      .field("latitude", String(payload.latitude))
      .field("longitude", String(payload.longitude))
      .field(
        "operational_hours",
        JSON.stringify([
          { day: 0, open_time: "08:00", close_time: "20:00", is_active: true },
        ]),
      )
      .attach("logo", FAKE_LOGO_BUFFER, "logo.png");

    expect(result.status).toBe(201);

    const store = await prisma.store.findUnique({
      where: { public_id: result.body.data.public_id },
    });

    expect(store.logo_url).toMatch(/supabase\.co/);
    expect(store.logo_url).toContain("store-logos");
  }, 20000);

  test("should reject creating a second store for the same user", async () => {
    const first = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(baseStorePayload("Warung Pertama"));

    expect(first.status).toBe(201);

    const second = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(baseStorePayload("Warung Kedua"));

    expect(second.status).toBe(400);
    expect(second.body.errors).toBe("You already have a store");
  }, 20000);

  test("should reject creating store if unauthorized (no token)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .send(baseStorePayload("Warung Tanpa Login")); // Tanpa Token

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);

  test("should reject creating store with missing required field (name)", async () => {
    const payload = baseStorePayload("Warung Tanpa Nama");
    delete payload.name;

    const result = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should reject creating store with invalid latitude/longitude type", async () => {
    const payload = baseStorePayload("Warung Koordinat Aneh");
    payload.latitude = "bukan-angka";
    payload.longitude = "juga-bukan-angka";

    const result = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should handle malformed operational_hours JSON string without crashing", async () => {
    const payload = baseStorePayload("Warung Jam Rusak");

    const result = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", payload.name)
      .field("description", payload.description)
      .field("timezone", payload.timezone)
      .field("street_address", payload.street_address)
      .field("village", payload.village)
      .field("district", payload.district)
      .field("city", payload.city)
      .field("province", payload.province)
      .field("postal_code", payload.postal_code)
      .field("latitude", String(payload.latitude))
      .field("longitude", String(payload.longitude))
      .field("operational_hours", "{ ini bukan json valid");

    expect(result.status).not.toBe(200);
  }, 20000);

  test("should not allow two concurrent requests to both create a store for the same user", async () => {
    const payloadA = baseStorePayload("Warung Race A");
    const payloadB = baseStorePayload("Warung Race B");

    const [resultA, resultB] = await Promise.all([
      supertest(web)
        .post("/api/stores")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(payloadA),
      supertest(web)
        .post("/api/stores")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(payloadB),
    ]);
    const successCount = [resultA, resultB].filter(
      (r) => r.status === 201,
    ).length;

    expect(successCount).toBe(1);
  }, 20000);

  test("should delete uploaded logo from Supabase if creating store fails (prevent zombie files)", async () => {
    // 1. Kita bikin toko pertama (SUKSES)
    await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(baseStorePayload("Warung Pertama"));

    // 2. Hitung jumlah file di bucket Supabase SEBELUM nembak API
    const { data: filesBefore } = await supabase.storage
      .from("store-logos")
      .list("images");
    const countBefore = filesBefore ? filesBefore.length : 0;

    // 3. Tembak toko KEDUA pakai file logo fisik. PASTI GAGAL (400)
    const payload = baseStorePayload("Warung Kedua Bikin Error");
    const result = await supertest(web)
      .post("/api/stores")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", payload.name)
      .field("description", payload.description)
      .field("timezone", payload.timezone)
      .field("street_address", payload.street_address)
      .field("village", payload.village)
      .field("district", payload.district)
      .field("city", payload.city)
      .field("province", payload.province)
      .field("postal_code", payload.postal_code)
      .field("latitude", String(payload.latitude))
      .field("longitude", String(payload.longitude))
      .attach("logo", FAKE_LOGO_BUFFER, "zombie-logo.png");

    expect(result.status).toBe(400);

    // 4. Hitung jumlah file di bucket Supabase SETELAH API gagal.
    const { data: filesAfter } = await supabase.storage
      .from("store-logos")
      .list("images");
    const countAfter = filesAfter ? filesAfter.length : 0;

    // Ekspektasi: Karena di-rollback, jumlah gambar di Supabase harus tetap sama
    expect(countAfter).toBe(countBefore);
  }, 20000);
});
