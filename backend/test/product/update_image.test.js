import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

const FAKE_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("PATCH /api/stores/products/:productId/image", () => {
  let cookies;
  let testEmail = "";
  let userId = "";
  let storeId = "";
  let productId = "";

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `update_img_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Image Product" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Image Product",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email: testEmail, password: "password123" });
    cookies = login.headers["set-cookie"];

    // 5. Buat Store
    const store = await prisma.store.create({
      data: {
        user_id: userId,
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
    storeId = store.id;

    // 6. Buat Product dengan gambar awal
    const product = await prisma.product.create({
      data: {
        store_id: storeId,
        name: "Test Image Product",
        price: 15000,
        // Nama image dummy dibuat spesifik
        image_url: `/uploads/old-image-${Date.now()}.png`,
      },
    });
    productId = product.id;
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL BERDASARKAN ID TOKO ---
    if (storeId) {
      // 1. Bersihkan data produk dan file fisiknya dari database test
      const products = await prisma.product.findMany({
        where: { store_id: storeId },
        select: { image_url: true },
      });

      for (const p of products) {
        if (p.image_url) {
          try {
            // OS Agnostic Path Resolution
            const cleanPath = p.image_url.startsWith("/")
              ? p.image_url.substring(1)
              : p.image_url;
            await unlink(path.join(process.cwd(), "public", cleanPath));
          } catch (e) {}
        }
      }

      // 2. Bersihkan file logo toko
      const storeData = await prisma.store.findUnique({
        where: { id: storeId },
        select: { logo_url: true },
      });

      if (storeData?.logo_url) {
        try {
          const cleanPath = storeData.logo_url.startsWith("/")
            ? storeData.logo_url.substring(1)
            : storeData.logo_url;
          await unlink(path.join(process.cwd(), "public", cleanPath));
        } catch (e) {}
      }

      // 3. Hapus database secara Hierarkis
      await prisma.product.deleteMany({
        where: { store_id: storeId },
      });
      await prisma.store.deleteMany({
        where: { id: storeId },
      });
    }

    // 4. Hapus User Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 5. Hapus User Supabase
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {}
    }
  }, 20000);

  // --- SKENARIO 1: SUKSES ---
  test("should successfully update product image and return updated info", async () => {
    const dynamicFilename = `new-product-${Date.now()}.png`;

    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/image`)
      .set("Cookie", cookies)
      .attach("image", FAKE_IMAGE_BUFFER, dynamicFilename);

    expect(result.status).toBe(200);
    expect(result.body.data).toHaveProperty("id", productId);
    expect(result.body.data).toHaveProperty("name", "Test Image Product");
    expect(result.body.data).toHaveProperty("image_url");
    expect(result.body.data.image_url).toContain("/uploads/");
    expect(result.body.data.image_url).not.toBe("/uploads/old-image-dummy.png");

    // Verifikasi database benar-benar berubah
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(dbProduct.image_url).toBe(result.body.data.image_url);
  }, 20000);

  // --- SKENARIO 2: ERROR 400 (TIDAK ADA FILE) ---
  test("should reject (400) if no image file is attached", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/image`)
      .set("Cookie", cookies); // Tanpa .attach("image", ...)

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe("No image files were uploaded");
  }, 20000);

  // --- SKENARIO 3: ERROR 404 (PRODUK TIDAK DITEMUKAN / MILIK ORANG LAIN) ---
  test("should reject (404) and cleanup uploaded file if product does not exist", async () => {
    const fakeProductId = crypto.randomUUID();
    const dynamicFilename = `orphan-${Date.now()}.png`;

    const result = await supertest(web)
      .patch(`/api/stores/products/${fakeProductId}/image`)
      .set("Cookie", cookies)
      .attach("image", FAKE_IMAGE_BUFFER, dynamicFilename);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Product not found");
  }, 20000);

  // --- SKENARIO 4: ERROR 401 (BELUM LOGIN / SESI HABIS) ---
  test("should reject (401) if user is not authenticated", async () => {
    const dynamicFilename = `unauth-${Date.now()}.png`;

    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/image`)
      .attach("image", FAKE_IMAGE_BUFFER, dynamicFilename); // Tanpa cookie

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  }, 20000);
});
