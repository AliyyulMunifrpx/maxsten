import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import crypto from "crypto";

const email = "aliyyulmunif780@gmail.com";
const password = "aliyyul";

describe("PATCH /api/stores/products/:productId/availability", () => {
  let cookies;
  let user;
  let store;
  let product;

  // Cleanup helper untuk membersihkan data test
  const cleanup = async () => {
    await prisma.product.deleteMany({
      where: { name: { contains: "Test Availability Product" } },
    });
    await prisma.store.deleteMany({
      where: { name: "Warung Availability Test" },
    });
  };

  beforeEach(async () => {
    await cleanup();

    // 1. Login user
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email, password });
    cookies = login.headers["set-cookie"];

    user = await prisma.user.findUnique({ where: { email } });

    // 2. Buat Store via Prisma
    store = await prisma.store.create({
      data: {
        user_id: user.id,
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

    // 3. Buat Product dengan status awal default (is_available = true)
    product = await prisma.product.create({
      data: {
        store_id: store.id,
        name: "Test Availability Product",
        price: 20000,
        is_available: true,
      },
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  // --- SKENARIO SUKSES ---

  test("should successfully set product availability to false", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}/availability`)
      .set("Cookie", cookies)
      .send({ is_available: false });

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      id: product.id,
      name: "Test Availability Product",
      is_available: false,
    });

    // Verifikasi perubahan di database
    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.is_available).toBe(false);
  });

  test("should successfully set product availability back to true", async () => {
    // Ubah dulu ke false via DB
    await prisma.product.update({
      where: { id: product.id },
      data: { is_available: false },
    });

    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}/availability`)
      .set("Cookie", cookies)
      .send({ is_available: true });

    expect(result.status).toBe(200);
    expect(result.body.data.is_available).toBe(true);

    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.is_available).toBe(true);
  });

  // --- SKENARIO ERROR / VALIDASI ---

  test("should reject (400) if is_available field is missing", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}/availability`)
      .set("Cookie", cookies)
      .send({}); // Body kosong

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  test("should reject (400) if is_available is not a boolean", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}/availability`)
      .set("Cookie", cookies)
      .send({ is_available: "bukan_boolean" });

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  test("should reject (404) if product does not exist or belongs to another user store", async () => {
    const fakeProductId = crypto.randomUUID();

    const result = await supertest(web)
      .patch(`/api/stores/products/${fakeProductId}/availability`)
      .set("Cookie", cookies)
      .send({ is_available: false });

    expect(result.status).toBe(404);
    expect(result.body.errors).toContain("Product not found");
  });

  test("should reject (401) if user is not logged in", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}/availability`)
      .send({ is_available: false }); // Tanpa Cookie

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});