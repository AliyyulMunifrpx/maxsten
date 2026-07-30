import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { unlink, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const email = "aliyyulmunif780@gmail.com";
const password = "aliyyul";

describe("DELETE /api/stores/products/:productId", () => {
  let cookies;
  let user;
  let store;
  let product;
  let guest;
  let dummyImagePath;

  const cleanup = async () => {
    // 1. Bersihkan queue_details & queues
    await prisma.queueDetail.deleteMany({
      where: { product: { name: { contains: "Test Delete Product" } } },
    });
    await prisma.queue.deleteMany({
      where: { store: { name: "Warung Delete Test" } },
    });
    await prisma.guest.deleteMany({
      where: { id: { contains: "guest-test" } },
    });

    // 2. Bersihkan variants & products
    await prisma.variant.deleteMany({
      where: { product: { name: { contains: "Test Delete Product" } } },
    });
    await prisma.product.deleteMany({
      where: { name: { contains: "Test Delete Product" } },
    });

    // 3. Bersihkan store
    await prisma.store.deleteMany({
      where: { name: "Warung Delete Test" },
    });

    // 4. Hapus dummy file gambar jika masih tersisa
    if (dummyImagePath) {
      try {
        await unlink(dummyImagePath);
      } catch (e) {}
    }
  };

  beforeEach(async () => {
    await cleanup();

    // 1. Authenticate user
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email, password });
    cookies = login.headers["set-cookie"];

    user = await prisma.user.findUnique({ where: { email } });

    // 2. Seed Store
    store = await prisma.store.create({
      data: {
        user_id: user.id,
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

    // 3. Create dummy image file for cleanup testing
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `test-delete-${Date.now()}.png`;
    dummyImagePath = path.join(uploadDir, filename);
    await writeFile(dummyImagePath, Buffer.from("dummy image content"));

    // 4. Seed Product & Variants
    product = await prisma.product.create({
      data: {
        store_id: store.id,
        name: "Test Delete Product",
        price: 30000,
        image_url: `/uploads/${filename}`,
        variants: {
          create: [
            { name: "Pedas", additional_price: 2000 },
            { name: "Sedang", additional_price: 1000 },
          ],
        },
      },
      include: { variants: true },
    });

    // 5. Seed Guest (Diperlukan jika nanti buat Queue)
    guest = await prisma.guest.create({
      data: {
        id: `guest-test-${crypto.randomUUID().slice(0, 24)}`, // Char(36)
      },
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  // --- SKENARIO 1: SUKSES ---

  test("should successfully soft delete product, its variants, and remove image file", async () => {
    const result = await supertest(web)
      .delete(`/api/stores/products/${product.id}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");

    // 1. Cek status soft delete product di DB
    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { variants: true },
    });
    expect(dbProduct.is_delete).toBe(true);

    // 2. Cek varian ter-soft delete
    dbProduct.variants.forEach((v) => {
      expect(v.is_delete).toBe(true);
    });

    // 3. Cek file gambar fisik terhapus dari disk
    await expect(unlink(dummyImagePath)).rejects.toThrow();
  });

  // --- SKENARIO 2: ERROR VALIDASI JOI ---

  test("should reject (400) if productId is not a valid UUID", async () => {
    const result = await supertest(web)
      .delete("/api/stores/products/bukan-uuid-valid")
      .set("Cookie", cookies);
    console.log(result.body)
    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  // --- SKENARIO 3: ERROR ACTIVE QUEUE ---

  test("should reject (400) if product has active queue in progress (DIPROSES)", async () => {
    // Bikin Queue & QueueDetail sesuai schema Prisma terbaru
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
  });

  // --- SKENARIO 4: ERROR NOT FOUND / OWNERSHIP ---

  test("should reject (404) if product does not exist or belongs to another user", async () => {
    const fakeUuid = crypto.randomUUID();

    const result = await supertest(web)
      .delete(`/api/stores/products/${fakeUuid}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
  });

  // --- SKENARIO 5: ERROR UNAUTHENTICATED ---

  test("should reject (401) if user is not logged in", async () => {
    const result = await supertest(web).delete(
      `/api/stores/products/${product.id}`,
    );

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});
