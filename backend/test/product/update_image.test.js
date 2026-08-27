import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin & client
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import crypto from "crypto";

// 🔥 Hapus impor fs/promises dan path karena tidak ada lagi file fisik di server

const BUCKET_NAME = "product-images";

const FAKE_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("PATCH /api/stores/products/:productId/image", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";
  let storeId = "";
  let productId = "";
  let oldImageFileName = "";

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

    // 4. Login untuk dapat Access Token
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email: testEmail, password: "password123" });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = login.body.data.access_token;

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

    // 6. ☁️ Upload Gambar Lama ke Supabase
    oldImageFileName = `old-image-${Date.now()}.png`;
    const fullPath = `images/${oldImageFileName}`;

    await supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, FAKE_IMAGE_BUFFER, { contentType: "image/png" });

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fullPath);

    // 7. Buat Product dengan URL gambar Supabase
    const product = await prisma.product.create({
      data: {
        store_id: storeId,
        name: "Test Image Product",
        price: 15000,
        image_url: publicUrlData.publicUrl, // <--- Gunakan URL Cloud
      },
    });
    productId = product.id;
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL BERDASARKAN ID TOKO ---
    if (storeId) {
      // 1. ☁️ Bersihkan gambar produk dari bucket Supabase
      const products = await prisma.product.findMany({
        where: { store_id: storeId },
        select: { image_url: true },
      });

      for (const p of products) {
        if (p.image_url && p.image_url.includes("supabase.co")) {
          const parts = p.image_url.split(`/${BUCKET_NAME}/`);
          if (parts.length > 1) {
            await supabase.storage
              .from(BUCKET_NAME)
              .remove([parts[1]])
              .catch(() => {});
          }
        }
      }

      // Bersihkan gambar dummy lama jika API gagal menghapusnya (jaga-jaga test fail)
      if (oldImageFileName) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([`images/${oldImageFileName}`])
          .catch(() => {});
      }

      // 2. ☁️ Bersihkan file logo toko (jika ada)
      const storeData = await prisma.store.findUnique({
        where: { id: storeId },
        select: { logo_url: true },
      });

      if (storeData?.logo_url && storeData.logo_url.includes("supabase.co")) {
        const parts = storeData.logo_url.split("/store-logos/");
        if (parts.length > 1) {
          await supabase.storage
            .from("store-logos")
            .remove([parts[1]])
            .catch(() => {});
        }
      }

      // 3. Hapus database secara Hierarkis
      await prisma.productVariant
        ?.deleteMany({ where: { product: { store_id: storeId } } })
        .catch(() => {});
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
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("image", FAKE_IMAGE_BUFFER, dynamicFilename);

    expect(result.status).toBe(200);
    expect(result.body.data).toHaveProperty("id", productId);
    expect(result.body.data).toHaveProperty("name", "Test Image Product");

    // Verifikasi API mengembalikan URL Supabase yang baru
    expect(result.body.data.image_url).toMatch(/supabase\.co/);
    expect(result.body.data.image_url).not.toContain(oldImageFileName);

    // Verifikasi database benar-benar berubah
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(dbProduct.image_url).toBe(result.body.data.image_url);

    // ☁️ Verifikasi gambar LAMA sudah benar-benar lenyap dari Supabase
    const { data: fileList } = await supabase.storage
      .from(BUCKET_NAME)
      .list("images");
    const oldExists =
      fileList && fileList.some((f) => f.name === oldImageFileName);
    expect(oldExists).toBe(false);
  }, 20000);

  // --- SKENARIO 2: ERROR 400 (TIDAK ADA FILE) ---
  test("should reject (400) if no image file is attached", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/image`)
      .set("Authorization", `Bearer ${accessToken}`); // Tanpa .attach("image", ...)

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe("No image files were uploaded");
  }, 20000);

  // --- SKENARIO 3: ERROR 404 (PRODUK TIDAK DITEMUKAN / MILIK ORANG LAIN) ---
  test("should reject (404) if product does not exist", async () => {
    const fakeProductId = crypto.randomUUID();
    const dynamicFilename = `orphan-${Date.now()}.png`;

    const result = await supertest(web)
      .patch(`/api/stores/products/${fakeProductId}/image`)
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("image", FAKE_IMAGE_BUFFER, dynamicFilename);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Product not found");
  }, 20000);

  // --- SKENARIO 4: ERROR 401 (BELUM LOGIN / SESI HABIS) ---
  test("should reject (401) if user is not authenticated", async () => {
    const dynamicFilename = `unauth-${Date.now()}.png`;

    const result = await supertest(web)
      .patch(`/api/stores/products/${productId}/image`)
      .attach("image", FAKE_IMAGE_BUFFER, dynamicFilename); // Tanpa token

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  }, 20000);
});
