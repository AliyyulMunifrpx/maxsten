import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import path from "path";
import { unlink, readdir, mkdir } from "fs/promises";

const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("create product", () => {
  let cookies;
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

    // 4. Login untuk dapat tiket (cookie)
    const login = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = login.headers["set-cookie"];

    // 5. Buat Toko Tumbal secara manual
    const createStoreRes = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
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
      )
      .attach("logo", FAKE_LOGO_BUFFER, "logo.png");

    storeId = createStoreRes.body.data.public_id;
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL ---
    // Karena kita tidak tahu public_id toko secara pasti (kecuali di-query),
    // lebih aman hapus berdasarkan user_id.

    // 1. Ambil data produk milik user ini untuk dapet URL gambarnya
    const productsToDelete = await prisma.product.findMany({
      where: { store: { user_id: userId } },
      select: { image_url: true },
    });

    // 2. Ambil data toko milik user ini untuk dapet URL logonya
    const storesToDelete = await prisma.store.findMany({
      where: { user_id: userId },
      select: { id: true, logo_url: true },
    });
    const internalStoreIds = storesToDelete.map((s) => s.id);

    // 3. Hapus file fisik gambar produk
    for (const product of productsToDelete) {
      if (product.image_url) {
        try {
          const cleanPath = product.image_url.startsWith("/")
            ? product.image_url.substring(1)
            : product.image_url;
          const filePath = path.join(process.cwd(), "public", cleanPath);
          await unlink(filePath);
        } catch (error) {}
      }
    }

    // 4. Hapus file fisik logo toko
    for (const store of storesToDelete) {
      if (store.logo_url) {
        try {
          const cleanPath = store.logo_url.startsWith("/")
            ? store.logo_url.substring(1)
            : store.logo_url;
          const filePath = path.join(process.cwd(), "public", cleanPath);
          await unlink(filePath);
        } catch (error) {}
      }
    }

    // 5. Eksekusi hapus data dari database (Child -> Parent -> User)
    if (internalStoreIds.length > 0) {
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
      .set("Cookie", cookies)
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
  }, 20000);

  test("should successfully create product with minimal data (no variants/addons)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
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
      .set("Cookie", cookies)
      .field("description", "produk tanpa nama dan harga");

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain('"name"');
  }, 20000);

  test("should reject if price is not a valid number (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product invalid price")
      .field("price", "bukan_angka");

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain('"price"');
  }, 20000);

  test("should reject if addon_group_ids is not a valid GUID (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
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
      .set("Cookie", cookies)
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
      .set("Cookie", cookies)
      .field("name", "test product duplicate")
      .field("description", "test product minimal")
      .field("price", "20000");

    // 2. Bikin lagi pakai nama yang sama persis
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
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
      .set("Cookie", cookies)
      .field("name", "test product not found addon")
      .field("price", "20000")
      .field("addon_group_ids", JSON.stringify([FAKE_VALID_UUID]));

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain("Some add-on groups are not valid");
  }, 20000);

  test("should delete uploaded image from disk if creating product fails (prevent zombie files)", async () => {
    // 1. Kita bikin produk pertama biar namanya ke-register
    await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product zombie")
      .field("description", "test product minimal")
      .field("price", "20000");

    // 2. Siapkan folder uploads dan hitung jumlah file SEBELUM nge-hit API yang gagal
    const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filesBefore = await readdir(UPLOAD_DIR);

    // 💡 PENINGKATAN: Gunakan Date.now() di nama file agar tidak ada tabrakan antar test concurrent
    const dynamicZombieFilename = `zombie-image-${Date.now()}.png`;

    // 3. Hit API lagi pakai nama yang sama persis (Pasti gagal / 400), dengan melampirkan gambar!
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product zombie")
      .field("price", "25000")
      .attach("image", FAKE_LOGO_BUFFER, dynamicZombieFilename);

    // Pastikan API benar-benar menolak karena duplicate
    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("already exists in this store");

    // 4. Hitung jumlah file di folder uploads SETELAH API gagal
    const filesAfter = await readdir(UPLOAD_DIR);

    // 5. Kunci Utamanya: Karena API gagal, controller harusnya otomatis menghapus file 'zombie-image.png'.
    expect(filesAfter.length).toBe(filesBefore.length);
  }, 20000);
});
