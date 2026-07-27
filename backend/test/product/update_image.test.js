import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

const FAKE_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const email = "aliyyulmunif780@gmail.com";
const password = "aliyyul";

describe("PATCH /api/stores/products/:productId/image", () => {
  let cookies;
  let user;
  let store;
  let product;

  const cleanup = async () => {
    // Bersihkan data produk dan file fisiknya dari database test
    const products = await prisma.product.findMany({
      where: { name: { contains: "Test Image" } },
      select: { image_url: true },
    });

    for (const p of products) {
      if (p.image_url) {
        try {
          await unlink(path.join(process.cwd(), "public", p.image_url));
        } catch (e) {}
      }
    }

    const stores = await prisma.store.findMany({
      where: { name: "Warung Nasi Image Test" },
      select: { logo_url: true },
    });

    for (const s of stores) {
      if (s.logo_url) {
        try {
          await unlink(path.join(process.cwd(), "public", s.logo_url));
        } catch (e) {}
      }
    }

    await prisma.product.deleteMany({
      where: { name: { contains: "Test Image" } },
    });
    await prisma.store.deleteMany({
      where: { name: "Warung Nasi Image Test" },
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

    // 2. Buat Store
    store = await prisma.store.create({
      data: {
        user_id: user.id,
        name: "Warung Nasi Image Test",
        public_id: crypto.randomUUID(),
        street_address: "Jalan Test",
        village: "Test",
        district: "Test",
        city: "Test",
        province: "Test",
        postal_code: "12345",
        timezone: "Asia/Jakarta",
        latitude: -6.2,
        longitude: 106.8,
      },
    });

    // 3. Buat Product dengan gambar awal
    product = await prisma.product.create({
      data: {
        store_id: store.id,
        name: "Test Image Product",
        price: 15000,
        image_url: "/uploads/old-image-dummy.png",
      },
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  // --- SKENARIO 1: SUKSES ---
  test("should successfully update product image and return updated info", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}/image`)
      .set("Cookie", cookies)
      .attach("image", FAKE_IMAGE_BUFFER, "new-product.png");

    expect(result.status).toBe(200);
    expect(result.body.data).toHaveProperty("id", product.id);
    expect(result.body.data).toHaveProperty("name", "Test Image Product");
    expect(result.body.data).toHaveProperty("image_url");
    expect(result.body.data.image_url).toContain("/uploads/");
    expect(result.body.data.image_url).not.toBe("/uploads/old-image-dummy.png");

    // Verifikasi database benar-benar berubah
    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.image_url).toBe(result.body.data.image_url);
  });

  // --- SKENARIO 2: ERROR 400 (TIDAK ADA FILE) ---
  test("should reject (400) if no image file is attached", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}/image`)
      .set("Cookie", cookies); // Tanpa .attach("image", ...)

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe("No image files were uploaded");
  });

  // --- SKENARIO 3: ERROR 404 (PRODUK TIDAK DITEMUKAN / MILIK ORANG LAIN) ---
  test("should reject (404) and cleanup uploaded file if product does not exist", async () => {
    const fakeProductId = crypto.randomUUID();

    const result = await supertest(web)
      .patch(`/api/stores/products/${fakeProductId}/image`)
      .set("Cookie", cookies)
      .attach("image", FAKE_IMAGE_BUFFER, "orphan.png");

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Product not found");
  });

  // --- SKENARIO 4: ERROR 401 (BELUM LOGIN / SESI HABIS) ---
  test("should reject (401) if user is not authenticated", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}/image`)
      .attach("image", FAKE_IMAGE_BUFFER, "unauthorized.png"); // Tanpa cookie

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});
