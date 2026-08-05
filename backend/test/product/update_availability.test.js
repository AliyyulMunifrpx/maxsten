import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import crypto from "crypto";

describe("PATCH /api/stores/products/:productId/availability", () => {
  let cookies;
  let testEmail = "";
  let userId = "";
  let storeId = "";
  let productId = "";

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `update_avail_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Availability" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Availability",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email: testEmail, password: "password123" });
    cookies = login.headers["set-cookie"];

    // 5. Buat Store via Prisma
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Warung Availability Test",
        public_id: crypto.randomUUID(),
        street_address: "Jl. Test No. 123",
        village: "Village Test",
        district: "District Test",
        city: "City Test",
        province: "Province Test",
        postal_code: "12345",
        timezone: "Asia/Jakarta",
        latitude: -6.2,
        longitude: 106.8,
      },
    });
    storeId = store.id;

    // 6. Buat Product dengan status awal default (is_available = true)
    const product = await prisma.product.create({
      data: {
        store_id: storeId,
        name: "Test Availability Product",
        price: 20000,
        is_available: true,
      },
    });
    productId = product.id;
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL BERDASARKAN ID ---
    if (storeId) {
      // Hapus data secara hierarkis untuk menghindari kendala relasi
      await prisma.product.deleteMany({
        where: { store_id: storeId },
      });
      await prisma.store.deleteMany({
        where: { id: storeId },
      });
    }

    // Hapus User Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // Hapus User Auth Supabase
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {}
    }
  }, 20000);

  // --- SKENARIO SUKSES ---

  test("should successfully set product availability to false", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/availability`)
      .set("Cookie", cookies)
      .send({ is_available: false });

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      id: productId,
      name: "Test Availability Product",
      is_available: false,
    });

    // Verifikasi perubahan di database
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(dbProduct.is_available).toBe(false);
  }, 20000);

  test("should successfully set product availability back to true", async () => {
    // Ubah dulu ke false via DB
    await prisma.product.update({
      where: { id: productId },
      data: { is_available: false },
    });

    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/availability`)
      .set("Cookie", cookies)
      .send({ is_available: true });

    expect(result.status).toBe(200);
    expect(result.body.data.is_available).toBe(true);

    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(dbProduct.is_available).toBe(true);
  }, 20000);

  // --- SKENARIO ERROR / VALIDASI ---

  test("should reject (400) if is_available field is missing", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/availability`)
      .set("Cookie", cookies)
      .send({}); // Body kosong

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should reject (400) if is_available is not a boolean", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/availability`)
      .set("Cookie", cookies)
      .send({ is_available: "bukan_boolean" });

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should reject (404) if product does not exist or belongs to another user store", async () => {
    const fakeProductId = crypto.randomUUID();

    const result = await supertest(web)
      .patch(`/api/stores/products/${fakeProductId}/availability`)
      .set("Cookie", cookies)
      .send({ is_available: false });

    expect(result.status).toBe(404);
    expect(result.body.errors).toContain("Product not found");
  }, 20000);

  test("should reject (401) if user is not logged in", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/availability`)
      .send({ is_available: false }); // Tanpa Cookie

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  }, 20000);
});
