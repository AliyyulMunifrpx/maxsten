import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { unlink } from "fs/promises";
import path from "path";
const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const email = "aliyyulmunif780@gmail.com";
const password = "aliyyul";

describe("create product", () => {
  let cookies;
  let productId;
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
    productId = result.body.data.id;
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
          const filePath = path.join(
            process.cwd(),
            "public",
            product.image_url,
          );
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

  test("should successfully get the product with complete data", async () => {
    const result = await supertest(web)
      .get(`/api/stores/product/${productId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.id).toBe(productId);
    expect(result.body.data.name).toBe("test product full");
    expect(result.body.data.price).toBe(20000);
    // Pastikan relasi dan default value aggregate ikut terbawa
    expect(result.body.data.variants).toHaveLength(2);
    expect(result.body.data.total_sold).toBe(0); // Karena belum ada pesanan SELESAI
    expect(result.body.data.image_url).toBeDefined();
  });

  test("should reject if product id format is invalid (Joi Validation)", async () => {
    const result = await supertest(web)
      .get(`/api/stores/product/id-ngasal-bukan-uuid`)
      .set("Cookie", cookies);

    expect(result.status).toBe(400); // Bad Request karena gagal validasi
    expect(result.body.errors).toBeDefined();
  });

  test("should reject if product is not found (or belongs to another store)", async () => {
    // Pakai UUID valid, tapi fiktif/nggak ada di database
    const FAKE_VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

    const result = await supertest(web)
      .get(`/api/stores/product/${FAKE_VALID_UUID}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404); // Not Found
    expect(result.body.errors).toContain("Product not found");
  });
});
