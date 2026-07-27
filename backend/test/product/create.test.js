import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import path from "path";
import { unlink } from "fs/promises";

const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const email = "aliyyulmunif780@gmail.com";
const password = "aliyyul";

describe("create product", () => {
  let cookies;

  beforeEach(async () => {
    const login = await supertest(web).post("/api/users/login").send({
      email,
      password,
    });
    cookies = login.headers["set-cookie"];

    await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .field("name", "Warung Nasi Makmur")
      .field(
        "description",
        "Menyediakan berbagai macam masakan rumahan enak dan murah",
      )
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
  });

afterEach(async () => {
    // 1. Ambil data produk yang mau dihapus untuk dapet URL gambarnya
    const productsToDelete = await prisma.product.findMany({
      where: { name: { contains: "test" } },
      select: { image_url: true },
    });

    // 2. Ambil data toko untuk dapet URL logonya (Sesuaikan 'logo_url' dengan nama field di schema lu)
    const storesToDelete = await prisma.store.findMany({
      where: { name: "Warung Nasi Makmur" },
      select: { logo_url: true }, // Kalau di schema lu namanya 'image_url' atau 'logo', ganti di sini ya
    });

    // 3. Hapus file fisik gambar produk
    for (const product of productsToDelete) {
      if (product.image_url) {
        try {
          // product.image_url bentuknya "/uploads/namafile.png"
          // Kita gabungin pakai process.cwd() biar path-nya absolut nuju ke folder public
          const filePath = path.join(process.cwd(), "public", product.image_url);
          await unlink(filePath);
        } catch (error) {
          // Abaikan kalau file nggak ketemu (ENOENT)
        }
      }
    }

    // 4. Hapus file fisik logo toko
    for (const store of storesToDelete) {
      // Sesuaikan 'logo_url' dengan yang lu select di atas
      if (store.logo_url) { 
        try {
          const filePath = path.join(process.cwd(), "public", store.logo_url);
          await unlink(filePath);
        } catch (error) {
          // Abaikan
        }
      }
    }

    // 5. Baru eksekusi hapus data dari database (Child dulu, baru Parent)
    await prisma.product.deleteMany({
      where: { name: { contains: "test" } },
    });

    await prisma.store.deleteMany({
      where: { name: "Warung Nasi Makmur" },
    });
  });

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

    expect(result.status).toBe(201); // Atau 201 tergantung API lu
    expect(result.body.data.name).toBe("test product full");
    expect(result.body.data.variants).toHaveLength(2);
  });

  test("should successfully create product with minimal data (no variants/addons)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product minimal")
      .field("description", "test product minimal")
      .field("price", "15000");

    expect(result.status).toBe(201);
    expect(result.body.data.name).toBe("test product minimal");
  });

  // ==========================================
  // KATEGORI 2: JOI VALIDATIONS (DATA FORMAT ERROR)
  // ==========================================

  test("should reject if required fields (name, price) are missing (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("description", "produk tanpa nama dan harga");

    expect(result.status).toBe(400);
    // Asumsi Joi mengembalikan pesan error seperti '"name" is required'
    expect(result.body.errors).toContain('"name"');
  });

  test("should reject if price is not a valid number (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product invalid price")
      .field("price", "bukan_angka");

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain('"price"');
  });

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
  });

  test("should reject if variants data is malformed (Joi Validation)", async () => {
    const result = await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product bad variant")
      .field("price", "20000")
      // Mengirim array objek kosong yang harusnya punya "name" minimal
      .field("variants", JSON.stringify([{ additional_price: 1000 }]));

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain('"variants[0]'); // Menangkap error Joi di index 0
  });

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

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain("already exists in this store");
  });

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
  });
});
