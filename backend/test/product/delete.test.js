import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin & client
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import crypto from "crypto";

// 🔥 Hapus fs/promises dan path karena kita tidak lagi menyimpan file lokal

const BUCKET_NAME = "product-images";

// Buffer gambar transparan kecil untuk disuntikkan ke Supabase selama testing
const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("DELETE /api/stores/products/:productId", () => {
  let cookies;
  let testEmail = "";
  let userId = "";
  let store;
  let product;
  let guest;
  let dummyImageFileName;

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `delete_product_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Delete Product" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Delete Product",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email: testEmail, password: "password123" });
    cookies = login.headers["set-cookie"];

    // 5. Seed Store
    store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Warung Delete Test",
        public_id: crypto.randomUUID(),
        street_address: "Jl. Test No. 1",
        village: "Village Test",
        district: "District Test",
        city: "City Test",
        province: "Province Test",
        postal_code: "12345",
        timezone: "Asia/Jakarta",
        latitude: -6.2,
        longitude: 106.8,
      },
    });

    // 6. 🟢 UPLOAD GAMBAR "DUMMY" KE SUPABASE
    // Gunakan Date.now() agar file test benar-benar unik antar run paralel
    dummyImageFileName = `test-delete-${Date.now()}.png`;
    const fullPath = `images/${dummyImageFileName}`;

    await supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, FAKE_LOGO_BUFFER, { contentType: "image/png" });

    // Dapatkan URL Publiknya
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fullPath);

    // 7. Seed Product & Variants dengan URL Supabase
    product = await prisma.product.create({
      data: {
        store_id: store.id,
        name: "Test Delete Product",
        price: 30000,
        image_url: publicUrlData.publicUrl, // <--- Gunakan URL Cloud
        variants: {
          create: [
            { name: "Pedas", additional_price: 2000 },
            { name: "Sedang", additional_price: 1000 },
          ],
        },
      },
      include: { variants: true },
    });

    // 8. Seed Guest (Diperlukan untuk Queue)
    guest = await prisma.guest.create({
      data: {
        id: `guest-test-${crypto.randomUUID().slice(0, 24)}`, // Char(36)
      },
    });
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP ABSOLUT BERDASARKAN ID ---
    if (store?.id) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: store.id } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: store.id },
      });
      await prisma.variant.deleteMany({
        // <-- Sesuaikan dengan schema ProductVariant mu
        where: { product: { store_id: store.id } },
      });
      await prisma.product.deleteMany({
        where: { store_id: store.id },
      });
      await prisma.store.deleteMany({
        where: { id: store.id },
      });
    }

    if (guest?.id) {
      await prisma.guest.deleteMany({
        where: { id: guest.id },
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

    // 🧹 Hapus gambar dummy di Supabase jika masih tersisa (bila testnya gagal hapus produk)
    if (dummyImageFileName) {
      try {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([`images/${dummyImageFileName}`]);
      } catch (e) {}
    }
  }, 20000);

  // --- SKENARIO 1: SUKSES ---
  test("should successfully soft delete product, its variants, and remove image file from Supabase", async () => {
    const result = await supertest(web)
      .delete(`/api/stores/products/${product.id}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");

    // 1. Cek status soft delete product di DB
    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { variants: true }, // Pastikan ini namanya variants atau variant sesuai dengan relasimu
    });
    expect(dbProduct.is_delete).toBe(true);

    // 2. Cek varian ter-soft delete
    dbProduct.variants.forEach((v) => {
      expect(v.is_delete).toBe(true);
    });

    // 3. ☁️ Cek file gambar fisik terhapus dari bucket Supabase
    const { data: fileList } = await supabase.storage
      .from(BUCKET_NAME)
      .list("images");

    // Ekspektasi: File yang bernama dummyImageFileName sudah tidak ada di dalam daftar Supabase
    const stillExists =
      fileList && fileList.some((f) => f.name === dummyImageFileName);
    expect(stillExists).toBe(false);
  }, 20000);

  // --- SKENARIO 2: ERROR VALIDASI JOI ---
  test("should reject (400) if productId is not a valid UUID", async () => {
    const result = await supertest(web)
      .delete("/api/stores/products/bukan-uuid-valid")
      .set("Cookie", cookies);
    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  // --- SKENARIO 3: ERROR ACTIVE QUEUE ---
  test("should reject (400) if product has active queue in progress (DIPROSES)", async () => {
    // Bikin Queue & QueueDetail sesuai schema Prisma
    const queue = await prisma.queue.create({
      data: {
        store_id: store.id,
        guest_id: guest.id,
        queue_number: 1, // Int
        total_price: 30000,
        status: "DIPROSES",
        expired_at: new Date(Date.now() + 30 * 60 * 1000), // 30 menit ke depan
      },
    });

    await prisma.queueDetail.create({
      data: {
        queue_id: queue.id,
        product_id: product.id,
        quantity: 1,
      },
    });

    const result = await supertest(web)
      .delete(`/api/stores/products/${product.id}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain(
      "Cannot delete product with active orders in progress",
    );

    // Pastikan produk TIDAK ter-delete di DB
    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.is_delete).toBe(false);
  }, 20000);

  // --- SKENARIO 4: ERROR NOT FOUND / OWNERSHIP ---
  test("should reject (404) if product does not exist or belongs to another user", async () => {
    const fakeUuid = crypto.randomUUID();

    const result = await supertest(web)
      .delete(`/api/stores/products/${fakeUuid}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  // --- SKENARIO 5: ERROR UNAUTHENTICATED ---
  test("should reject (401) if user is not logged in", async () => {
    const result = await supertest(web).delete(
      `/api/stores/products/${product.id}`,
    ); // Tanpa menyematkan cookie

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  }, 20000);
});
