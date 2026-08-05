import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const ENDPOINT = "/api/stores/me";

function baseProfilePayload(name) {
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
    payment_timeout: 15,
  };
}

describe("update store profile", () => {
  let cookies = [];
  let testEmail = "";
  let userId = "";
  let createdStoreIds = [];

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `update_profile_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Update Profile",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId, // Hapus jika Prisma ID lu pakai auto-generate UUID/Int
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Update Profile",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });
    cookies = result.headers["set-cookie"];

    // 5. Reset Array.
    // Tidak butuh hapus toko lama di sini karena user ini 100% fresh.
    createdStoreIds = [];
  }, 20000);

  afterEach(async () => {
    // 1. Hapus Relasi Toko Prisma
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

  async function createStoreDirect(name) {
    const store = await prisma.store.create({
      data: { user_id: userId, ...baseProfilePayload(name), is_delete: false },
    });
    createdStoreIds.push(store.public_id);
    return store;
  }

  test("should update the store profile and return recalculated store data", async () => {
    await createStoreDirect("Warung Profil Awal");

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send(baseProfilePayload("Warung Profil Baru"));

    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("Warung Profil Baru");
    expect(typeof result.body.data.is_open).toBe("boolean");
  }, 20000);

  test("should return 404 when the user has no store", async () => {
    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send(baseProfilePayload("Warung Gak Ada"));

    expect(result.status).toBe(404);
  }, 20000);

  test("should return 401 when unauthorized", async () => {
    await createStoreDirect("Warung Profil Tanpa Login");

    const result = await supertest(web)
      .patch(ENDPOINT)
      .send(baseProfilePayload("Warung Ganti Diam Diam")); // Tanpa cookie

    expect(result.status).toBe(401);
  }, 20000);

  test("shouldn't be able to enter a random time zone", async () => {
    await createStoreDirect("Warung Timezone Aneh");

    const payload = baseProfilePayload("Warung Timezone Aneh");
    payload.timezone = "Bukan/Timezone_Valid";

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send(payload);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe("Invalid timezone");

    // Pastikan di database tidak ada perubahan zona waktu (tetap yang lama)
    const store = await prisma.store.findFirst({ where: { user_id: userId } });
    expect(store.timezone).toBe("Asia/Jakarta");
  }, 20000);

  test("preserves other fields when sending a partial payload", async () => {
    const original = await createStoreDirect("Warung Partial Profil");

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({ name: "Cuma Ganti Nama" });

    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("Cuma Ganti Nama");

    // INI yang belum ada - pastiin field lain gak ke-null-in
    expect(result.body.data.street_address).toBe(original.street_address);
    expect(result.body.data.city).toBe(original.city);
    expect(result.body.data.payment_timeout).toBe(original.payment_timeout);
  }, 20000);

  test("should not crash when two full-profile updates race for the same store", async () => {
    await createStoreDirect("Warung Race Profil");

    const [resultA, resultB] = await Promise.all([
      supertest(web)
        .patch(ENDPOINT)
        .set("Cookie", cookies)
        .send(baseProfilePayload("Nama A")),
      supertest(web)
        .patch(ENDPOINT)
        .set("Cookie", cookies)
        .send(baseProfilePayload("Nama B")),
    ]);

    expect([resultA.status, resultB.status]).not.toContain(500);

    const store = await prisma.store.findFirst({ where: { user_id: userId } });
    expect(["Nama A", "Nama B"]).toContain(store.name);
  }, 20000);
});
