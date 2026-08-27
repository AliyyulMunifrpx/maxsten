import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin & client
import { supabase } from "../../src/application/supabase.js";
import { beforeAll, afterAll, describe, expect, test } from "vitest";

// 🔥 Hapus fs/promises dan path

const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("GET /api/stores/me/all-products/:publicId", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";
  let storePublicId = "";
  let storeInternalId = ""; // Untuk cleanup yang lebih mudah

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Setup dilakukan CUMA 1 KALI di awal file
  // =================================================================
  beforeAll(async () => {
    // 1. Generate email unik per test
    testEmail = `get_all_products_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Get All Products" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Get All Products",
      },
    });

    // 4. Login untuk dapat Access Token
    const login = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = login.body.data.access_token;

    // 5. Create Store Tumbal via API
    const storeResponse = await supertest(web)
      .post("/api/stores")
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "Warung Nasi Makmur")
      .field("description", "Menyediakan masakan rumahan")
      .field("timezone", "Asia/Jakarta")
      .field("street_address", "Jl. Jendral Sudirman No. 45")
      .field("village", "Setiabudi")
      .field("district", "Setiabudi")
      .field("city", "Jakarta Selatan")
      .field("province", "DKI Jakarta")
      .field("postal_code", "12910")
      .field("latitude", "-6.2088")
      .field("longitude", "106.8456")
      .attach("logo", FAKE_LOGO_BUFFER, `logo-${Date.now()}.png`);

    storePublicId = storeResponse.body.data.public_id;

    // Ambil internal id untuk bantu cleanup nanti
    const storeDb = await prisma.store.findUnique({
      where: { public_id: storePublicId },
    });
    storeInternalId = storeDb.id;

    // 6. Create Products (Bikin 3 produk buat ngetest bentuk array-nya)
    await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product satu")
      .field("price", "15000")
      .attach("image", FAKE_LOGO_BUFFER, `product1-${Date.now()}.png`);

    await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product dua")
      .field("price", "25000")
      .attach("image", FAKE_LOGO_BUFFER, `product2-${Date.now()}.png`);

    await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product tiga")
      .field("price", "10000")
      .attach("image", FAKE_LOGO_BUFFER, `product3-${Date.now()}.png`);
  }, 20000);

  // =================================================================
  // ⚡ CLEANUP: Dilakukan CUMA 1 KALI setelah semua test selesai
  // =================================================================
  afterAll(async () => {
    // 1. Ambil Data URL Gambar Produk
    const productsToDelete = await prisma.product.findMany({
      where: { store_id: storeInternalId },
      select: { image_url: true },
    });

    // 🔥 Hapus file produk dari bucket Supabase 'product-images'
    for (const product of productsToDelete) {
      if (product.image_url && product.image_url.includes("supabase.co")) {
        const parts = product.image_url.split("/product-images/");
        if (parts.length > 1) {
          await supabase.storage
            .from("product-images")
            .remove([parts[1]])
            .catch(() => {});
        }
      }
    }

    // 2. Ambil Data URL Logo Toko
    const storesToDelete = await prisma.store.findMany({
      where: { id: storeInternalId },
      select: { logo_url: true },
    });

    // 🔥 Hapus file logo dari bucket Supabase 'store-logos'
    for (const store of storesToDelete) {
      if (store.logo_url && store.logo_url.includes("supabase.co")) {
        const parts = store.logo_url.split("/store-logos/");
        if (parts.length > 1) {
          await supabase.storage
            .from("store-logos")
            .remove([parts[1]])
            .catch(() => {});
        }
      }
    }

    // 3. Hapus Data dari Database (Child -> Parent -> User)
    if (storeInternalId) {
      await prisma.product.deleteMany({
        where: { store_id: storeInternalId },
      });
      await prisma.storeOperationalHour.deleteMany({
        where: { store_id: storeInternalId },
      });
      await prisma.store.deleteMany({
        where: { id: storeInternalId },
      });
    }

    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {}
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("should successfully get all products with pagination metadata (Default Page 1)", async () => {
    const result = await supertest(web)
      .get(`/api/stores/me/${storePublicId}/products`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);

    // Verifikasi struktur root
    expect(result.body.data).toHaveProperty("currentPage");
    expect(result.body.data).toHaveProperty("nextPage");
    expect(result.body.data).toHaveProperty("pagination");

    // Verifikasi data pagination
    expect(result.body.data.pagination.currentPage).toBe(1); // Default Joi
    expect(result.body.data.pagination.limit).toBe(20);
    expect(result.body.data.pagination.totalRows).toBe(3); // Kita bikin 3 produk di atas
    expect(result.body.data.pagination.totalPages).toBe(1); // 3/20 dibulatkan ke atas jadi 1

    // Verifikasi currentPage
    expect(Array.isArray(result.body.data.currentPage)).toBe(true);
    expect(result.body.data.currentPage.length).toBe(3);

    // Verifikasi nextPage (Karena total produk cuma 3, nextPage harusnya kosong)
    expect(Array.isArray(result.body.data.nextPage)).toBe(true);
    expect(result.body.data.nextPage.length).toBe(0);

    // Cek struktur object produk dan mapping total_sold
    const firstProduct = result.body.data.currentPage[0];
    expect(firstProduct).toHaveProperty("id");
    expect(firstProduct).toHaveProperty("name");
    expect(firstProduct).toHaveProperty("price");
    expect(firstProduct).toHaveProperty("total_sold", 0); // Default 0 karena belum ada Queue
  }, 20000);

  test("should successfully get products for a specific page", async () => {
    // Kita request page 2, padahal data cuma 3 (yang harusnya habis di page 1)
    const result = await supertest(web)
      .get(`/api/stores/me/${storePublicId}/products?page=2`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.pagination.currentPage).toBe(2);
    expect(result.body.data.currentPage.length).toBe(0); // Harusnya kosong
    expect(result.body.data.nextPage.length).toBe(0);
  }, 20000);

  test("should reject (400) if publicId is not a valid UUID", async () => {
    const result = await supertest(web)
      .get(`/api/stores/me/uuid asal asalan/products`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should reject (400) if page parameter is a negative number or zero", async () => {
    const result = await supertest(web)
      .get(`/api/stores/me/${storePublicId}/products?page=0`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should reject (400) if page parameter is not an integer", async () => {
    const result = await supertest(web)
      .get(`/api/stores/me/${storePublicId}/products?page=satu`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should reject (404) if store does not exist or belongs to another user", async () => {
    // UUID format valid tapi nggak ada di DB
    const FAKE_VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

    const result = await supertest(web)
      .get(`/api/stores/me/${FAKE_VALID_UUID}/products`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(404);
    expect(result.body.errors).toContain("Store not found");
  }, 20000);
});
