import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { unlink } from "fs/promises";
import path from "path";

const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("GET /api/stores/products/:productId", () => {
  let cookies;
  let testEmail = "";
  let userId = "";
  let storeId = ""; // Internal ID untuk proses cleanup
  let productId = "";

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `get_product_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Get Product" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Get Product",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const login = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = login.headers["set-cookie"];

    // 5. Buat Toko melalui API
    const storeResponse = await supertest(web)
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
      .attach("logo", FAKE_LOGO_BUFFER, `logo-${Date.now()}.png`); // Nama file dinamis

    // Tangkap internal storeId untuk cleanup
    const storeDb = await prisma.store.findUnique({
      where: { public_id: storeResponse.body.data.public_id },
    });
    storeId = storeDb.id;

    // 6. Buat Product melalui API
    const productResponse = await supertest(web)
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
      .attach("image", FAKE_LOGO_BUFFER, `product-${Date.now()}.png`); // Nama file dinamis

    productId = productResponse.body.data.id;
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL BERDASARKAN ID TOKO ---
    if (storeId) {
      // 1. Ambil data produk milik toko ini untuk hapus foto fisik
      const productsToDelete = await prisma.product.findMany({
        where: { store_id: storeId },
        select: { image_url: true },
      });

      for (const product of productsToDelete) {
        if (product.image_url) {
          try {
            const cleanPath = product.image_url.startsWith("/")
              ? product.image_url.substring(1)
              : product.image_url;
            await unlink(path.join(process.cwd(), "public", cleanPath));
          } catch (error) {}
        }
      }

      // 2. Ambil data toko ini untuk hapus logo fisik
      const storeToDelete = await prisma.store.findUnique({
        where: { id: storeId },
        select: { logo_url: true },
      });

      if (storeToDelete?.logo_url) {
        try {
          const cleanPath = storeToDelete.logo_url.startsWith("/")
            ? storeToDelete.logo_url.substring(1)
            : storeToDelete.logo_url;
          await unlink(path.join(process.cwd(), "public", cleanPath));
        } catch (error) {}
      }

      // 3. Eksekusi hapus data dari database (Relasi Varian akan terhapus jika onDelete Cascade, tapi kita buat aman)
      await prisma.variant.deleteMany({
        where: { product: { store_id: storeId } },
      });
      await prisma.product.deleteMany({
        where: { store_id: storeId },
      });
      await prisma.storeOperationalHour.deleteMany({
        where: { store_id: storeId },
      });
      await prisma.store.deleteMany({
        where: { id: storeId },
      });
    }

    // 4. Hapus User
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {}
    }
  }, 20000);

  test("should successfully get the product with complete data", async () => {
    const result = await supertest(web)
      .get(`/api/stores/products/${productId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.id).toBe(productId);
    expect(result.body.data.name).toBe("test product full");
    expect(result.body.data.price).toBe(20000);

    // Pastikan relasi dan default value aggregate ikut terbawa
    expect(result.body.data.variants).toHaveLength(2);
    expect(result.body.data.total_sold).toBe(0); // Karena belum ada pesanan SELESAI
    expect(result.body.data.image_url).toBeDefined();
  }, 20000);

  test("should reject if product id format is invalid (Joi Validation)", async () => {
    const result = await supertest(web)
      .get(`/api/stores/products/id-ngasal-bukan-uuid`)
      .set("Cookie", cookies);

    expect(result.status).toBe(400); // Bad Request karena gagal validasi
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should reject if product is not found (or belongs to another store)", async () => {
    // Pakai UUID valid, tapi fiktif/nggak ada di database
    const FAKE_VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

    const result = await supertest(web)
      .get(`/api/stores/products/${FAKE_VALID_UUID}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404); // Not Found
    expect(result.body.errors).toContain("Product not found");
  }, 20000);
});
