import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

// 🔥 Hapus import path dan fs

const BUCKET_NAME = "product-images";

const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("create product", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";
  let storeId = ""; // Untuk menyimpan id toko yang baru dibuat

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `create_product_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Product Maker" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Product Maker",
      },
    });

    // 4. Login untuk dapat Access Token
    const login = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = login.body.data.access_token;

    // 5. Buat Toko Tumbal secara manual
    const createStoreRes = await supertest(web)
      .post("/api/stores")
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "Warung Produk Baru")
      .field("description", "Menyediakan berbagai macam masakan")
      .field("timezone", "Asia/Jakarta")
      .field("street_address", "Jl. Jendral Sudirman No. 45")
      .field("village", "Setiabudi")
      .field("district", "Setiabudi")
      .field("city", "Jakarta Selatan")
      .field("province", "DKI Jakarta")
      .field("postal_code", "12910")
      .field("latitude", "-6.2088")
      .field("longitude", "106.8456")
      .field(
        "operational_hours",
        JSON.stringify([
          { day: 0, open_time: "08:00", close_time: "20:00", is_active: true },
        ]),
      );

    storeId = createStoreRes.body.data.public_id;
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL ---

    // 1. Ambil data produk milik user ini untuk dapet URL gambar produknya
    const productsToDelete = await prisma.product.findMany({
      where: { store: { user_id: userId } },
      select: { image_url: true },
    });

    // 2. Ambil data toko milik user ini untuk dapet ID-nya
    const storesToDelete = await prisma.store.findMany({
      where: { user_id: userId },
      select: { id: true, logo_url: true }, // logo toko
    });
    const internalStoreIds = storesToDelete.map((s) => s.id);

    // 3. Hapus file gambar produk dari bucket Supabase 'product-images'
    for (const product of productsToDelete) {
      if (product.image_url && product.image_url.includes("supabase.co")) {
        const parts = product.image_url.split(`/${BUCKET_NAME}/`);
        if (parts.length > 1) {
          await supabase.storage
            .from(BUCKET_NAME)
            .remove([parts[1]])
            .catch(() => {});
        }
      }
    }

    // 4. Hapus file logo toko (jika ada) dari bucket 'store-logos'
    for (const store of storesToDelete) {
      if (store.logo_url && store.logo_url.includes("supabase.co")) {
        const parts = store.logo_url.split(`/store-logos/`);
        if (parts.length > 1) {
          await supabase.storage
            .from("store-logos")
            .remove([parts[1]])
            .catch(() => {});
        }
      }
    }

    // 5. Eksekusi hapus data dari database (Child -> Parent -> User)
    if (internalStoreIds.length > 0) {
      // Hapus varian dan Addon yang mungkin nyantol di produk tersebut
      await prisma.variant.deleteMany({
        where: { product: { store_id: { in: internalStoreIds } } },
      });
      await prisma.productAddonGroup.deleteMany({
        where: { product: { store_id: { in: internalStoreIds } } },
      });
      await prisma.product.deleteMany({
        where: { store_id: { in: internalStoreIds } },
      });
      await prisma.storeOperationalHour.deleteMany({
        where: { store_id: { in: internalStoreIds } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: internalStoreIds } },
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

  test("should successfully create product with full data (variants & image)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product full")
      .field("price", "20000")
      .field("description", "testing product with variants")
      .field(
        "variants",
        JSON.stringify([
          { name: "Pedas", additional_price: 2000 },
          { name: "Sedang", additional_price: 0 },
        ]),
      )
      .attach("image", FAKE_LOGO_BUFFER, "product.png");

    expect(result.status).toBe(201);
    expect(result.body.data.name).toBe("test product full");
    expect(result.body.data.variants).toHaveLength(2);
    expect(result.body.data.image_url).toMatch(/supabase\.co/); // Pastikan url nya menunjuk ke Supabase
  }, 20000);

  test("should successfully create product with minimal data (no variants/addons)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product minimal")
      .field("description", "test product minimal")
      .field("price", "15000");

    expect(result.status).toBe(201);
    expect(result.body.data.name).toBe("test product minimal");
  }, 20000);

  // ==========================================
  // KATEGORI 2: JOI VALIDATIONS (DATA FORMAT ERROR)
  // ==========================================

  test("should reject if required fields (name, price) are missing (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("description", "produk tanpa nama dan harga");

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain('"name"');
  }, 20000);

  test("should reject if price is not a valid number (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product invalid price")
      .field("price", "bukan_angka");

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain('"price"');
  }, 20000);

  test("should reject if addon_group_ids is not a valid GUID (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product invalid guid")
      .field("price", "20000")
      .field("addon_group_ids", JSON.stringify(["id-ngasal-123"]));

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain(
      '"addon_group_ids[0]" must be a valid GUID',
    );
  }, 20000);

  test("should reject if variants data is malformed (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product bad variant")
      .field("price", "20000")
      .field("variants", JSON.stringify([{ additional_price: 1000 }]));

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain('"variants[0]'); // Menangkap error Joi di index 0
  }, 20000);

  // ==========================================
  // KATEGORI 3: BUSINESS LOGIC (DATABASE / PRISMA ERROR)
  // ==========================================

  test("should reject if product name already exists in the same store (P2002)", async () => {
    // 1. Bikin produk pertama
    await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product duplicate")
      .field("description", "test product minimal")
      .field("price", "20000");

    // 2. Bikin lagi pakai nama yang sama persis
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product duplicate")
      .field("price", "25000");
    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("already exists in this store");
  }, 20000);

  test("should reject if valid addon_group_ids is not found in database", async () => {
    // Format GUID-nya benar (lolos Joi), tapi datanya fiktif (ditolak Database)
    const FAKE_VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product not found addon")
      .field("price", "20000")
      .field("addon_group_ids", JSON.stringify([FAKE_VALID_UUID]));

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain("Some add-on groups are not valid");
  }, 20000);

  test("should delete uploaded image from Supabase if creating product fails (prevent zombie files)", async () => {
    // 1. Kita bikin produk pertama biar namanya ke-register
    await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product zombie")
      .field("description", "test product minimal")
      .field("price", "20000");

    // 2. Hitung jumlah file di bucket Supabase SEBELUM nge-hit API yang gagal
    const { data: filesBefore } = await supabase.storage
      .from(BUCKET_NAME)
      .list("images");
    const countBefore = filesBefore ? filesBefore.length : 0;

    const dynamicZombieFilename = `zombie-image-${Date.now()}.png`;

    // 3. Hit API lagi pakai nama yang sama persis (Pasti gagal / 400), dengan melampirkan gambar!
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "test product zombie")
      .field("price", "25000")
      .attach("image", FAKE_LOGO_BUFFER, dynamicZombieFilename);

    // Pastikan API benar-benar menolak karena duplicate
    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("already exists in this store");

    // 4. Hitung jumlah file di bucket Supabase SETELAH API gagal
    const { data: filesAfter } = await supabase.storage
      .from(BUCKET_NAME)
      .list("images");
    const countAfter = filesAfter ? filesAfter.length : 0;

    // 5. Kunci Utamanya: Karena API gagal, controller harusnya otomatis menghapus file upload dari Supabase.
    expect(countAfter).toBe(countBefore);
  }, 20000);
});
