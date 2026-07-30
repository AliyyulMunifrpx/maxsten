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

describe("GET /api/stores/all-products/:publicId", () => {
  let cookies;
  let storePublicId;

  beforeEach(async () => {
    // 1. Login
    const login = await supertest(web).post("/api/users/login").send({
      email,
      password,
    });
    cookies = login.headers["set-cookie"];

    // 2. Create Store
    const storeResponse = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
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
      .attach("logo", FAKE_LOGO_BUFFER, "logo.png");

    storePublicId = storeResponse.body.data.public_id;

    // 3. Create Products (Bikin 3 produk buat ngetest bentuk array-nya)
    await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product satu")
      .field("price", "15000")
      .attach("image", FAKE_LOGO_BUFFER, "product1.png");

    await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product dua")
      .field("price", "25000")
      .attach("image", FAKE_LOGO_BUFFER, "product2.png");

    await supertest(web)
      .post("/api/stores/products")
      .set("Cookie", cookies)
      .field("name", "test product tiga")
      .field("price", "10000")
      .attach("image", FAKE_LOGO_BUFFER, "product3.png");
  });

  afterEach(async () => {
    // Hapus file gambar produk
    const productsToDelete = await prisma.product.findMany({
      where: { name: { contains: "test product" } },
      select: { image_url: true },
    });
    for (const product of productsToDelete) {
      if (product.image_url) {
        try {
          await unlink(path.join(process.cwd(), "public", product.image_url));
        } catch (error) {}
      }
    }

    // Hapus file logo toko
    const storesToDelete = await prisma.store.findMany({
      where: { name: "Warung Nasi Makmur" },
      select: { logo_url: true },
    });
    for (const store of storesToDelete) {
      if (store.logo_url) {
        try {
          await unlink(path.join(process.cwd(), "public", store.logo_url));
        } catch (error) {}
      }
    }

    // Hapus data dari DB (Queue/QueueDetail kalau ada, lalu Product, baru Store)
    // Hapus QueueDetail dulu kalau lu sempet bikin relasinya manual nanti
    await prisma.product.deleteMany({
      where: { name: { contains: "test product" } },
    });

    await prisma.store.deleteMany({
      where: { name: "Warung Nasi Makmur" },
    });
  });

  test("should successfully get all products with pagination metadata (Default Page 1)", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${storePublicId}/products`)
      .set("Cookie", cookies);

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
  });

  test("should successfully get products for a specific page", async () => {
    // Kita request page 2, padahal data cuma 3 (yang harusnya habis di page 1)
    const result = await supertest(web)
      .get(`/api/stores/${storePublicId}/products?page=2`)
      .set("Cookie", cookies);
    console.log(result.body);
    expect(result.status).toBe(200);
    expect(result.body.data.pagination.currentPage).toBe(2);
    expect(result.body.data.currentPage.length).toBe(0); // Harusnya kosong
    expect(result.body.data.nextPage.length).toBe(0);
  });

  test("should reject (400) if publicId is not a valid UUID", async () => {
    const result = await supertest(web)
      .get(`/api/stores/uuid asal asalan/products`)
      .set("Cookie", cookies);
   
    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  test("should reject (400) if page parameter is a negative number or zero", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${storePublicId}/products?page=0`)
      .set("Cookie", cookies);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  test("should reject (400) if page parameter is not an integer", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${storePublicId}/products?page=satu`)
      .set("Cookie", cookies);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  test("should reject (404) if store does not exist or belongs to another user", async () => {
    // UUID format valid tapi nggak ada di DB
    const FAKE_VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

    const result = await supertest(web)
      .get(`/api/stores/${FAKE_VALID_UUID}/products`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toContain("Store not found");
  });
});
