import supertest from "supertest";
import { web } from "../../src/application/web.js"; // Sesuaikan path
import { prisma } from "../../src/application/database.js"; // Sesuaikan path
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const STORE_PUBLIC_ID = "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d"; // Pakai format UUID beneran

// Helper jadwal buka 24 jam
function fullOpenSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: true,
  }));
}

describe("GET /api/stores/:storeId/products (Buyer Catalog)", () => {
  let userId;
  let internalStoreId;
  let specificProductId;
  let guestId;

  beforeEach(async () => {
    // 1. Bersihkan database (urutan dari tabel anak ke bapak)
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.storeOperationalHour.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Bikin User (Sesuai Schema: Wajib ada supabase_id)
    const user = await prisma.user.create({
      data: {
        email: "owner_katalog@test.com",
        supabase_id: "dummy-supabase-uuid-123",
        name: "Owner Katalog",
      },
    });
    userId = user.id;

    // 3. Bikin Toko
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        public_id: STORE_PUBLIC_ID,
        name: "Warung Makan Enak",
        description: "Testing API Pembeli",
        street_address: "Jl. Pembeli 1",
        village: "Desa",
        district: "Kecamatan",
        city: "Kota",
        province: "Provinsi",
        postal_code: "12345",
        latitude: -7.0,
        longitude: 110.0,
        timezone: "Asia/Jakarta",
        is_delete: false,
        operational_hours: { create: fullOpenSchedule() },
      },
    });
    internalStoreId = store.id;

    // 4. Bikin Guest untuk Antrean
    const guest = await prisma.guest.create({
      data: {
        id: "guest-uuid-1234-5678-9012-3456789012", // Harus string UUID 36 char
      },
    });
    guestId = guest.id;

    // 5. Bikin Produk (Kita bikin 22 produk untuk test paginasi 20 limit)
    const productData = [];
    for (let i = 1; i <= 21; i++) {
      productData.push({
        store_id: internalStoreId,
        name: `Produk Dummy ${i}`,
        price: 10000,
        is_delete: false,
        created_at: new Date(Date.now() - i * 1000),
      });
    }
    // Produk Spesifik untuk Fuse.js & Total Sold
    productData.push({
      store_id: internalStoreId,
      name: "Ayam Bakar Madu Spesial",
      price: 25000,
      is_delete: false,
      created_at: new Date(),
    });

    await prisma.product.createMany({ data: productData });

    const specificProduct = await prisma.product.findFirst({
      where: { name: "Ayam Bakar Madu Spesial" },
    });
    specificProductId = specificProduct.id;

    // 6. Bikin Antrean (Sesuai schema: queue_number Int, wajib expired_at & guest_id)
    const queueSelesai = await prisma.queue.create({
      data: {
        store_id: internalStoreId,
        guest_id: guestId,
        status: "SELESAI",
        queue_number: 1,
        total_price: 75000,
        expired_at: new Date(Date.now() + 1000 * 60 * 30), // Expired 30 mnt
      },
    });

    // QueueDetail TIDAK ada kolom price di schema lu
    await prisma.queueDetail.create({
      data: {
        queue_id: queueSelesai.id,
        product_id: specificProductId,
        quantity: 3,
      },
    });

    const queueBatal = await prisma.queue.create({
      data: {
        store_id: internalStoreId,
        guest_id: guestId,
        status: "DIBATALKAN",
        queue_number: 2,
        total_price: 125000,
        expired_at: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    await prisma.queueDetail.create({
      data: {
        queue_id: queueBatal.id,
        product_id: specificProductId,
        quantity: 5,
      },
    });
  });

  afterEach(async () => {
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.storeOperationalHour.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});
  });

  test("should get page 1 catalog with 20 items and correct pagination metadata", async () => {
    const response = await supertest(web).get(
      `/api/stores/${STORE_PUBLIC_ID}/products`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.store.name).toBe("Warung Makan Enak");
    expect(response.body.data.store.city).toBe("Kota");
    expect(response.body.data.store.is_open).toBe(true);

    expect(response.body.data.currentPage).toHaveLength(20);
    expect(response.body.data.nextPage).toHaveLength(2);

    expect(response.body.data.pagination.currentPage).toBe(1);
    expect(response.body.data.pagination.totalRows).toBe(22);
    expect(response.body.data.pagination.totalPages).toBe(2);
  });

  test("should get page 2 catalog", async () => {
    const response = await supertest(web).get(
      `/api/stores/${STORE_PUBLIC_ID}/products?page=2`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.currentPage).toHaveLength(2);
    expect(response.body.data.nextPage).toHaveLength(0);
  });

  test("should return 404 if store is not found", async () => {
    const response = await supertest(web).get(
      `/api/stores/123e4567-e89b-12d3-a456-426614174000/products`,
    );
    expect(response.status).toBe(404);
  });

  test("should correctly aggregate total_sold ONLY from SELESAI queues", async () => {
    const response = await supertest(web).get(
      `/api/stores/${STORE_PUBLIC_ID}/products`,
    );

    const ayamProduct = response.body.data.currentPage.find(
      (p) => p.name === "Ayam Bakar Madu Spesial",
    );

    expect(ayamProduct).toBeDefined();
    // Validasi bahwa yang batal (quantity 5) tidak ikut dihitung
    expect(ayamProduct.total_sold).toBe(3);
  });

  test("should return exact match using search keyword (Fuse.js logic)", async () => {
    const response = await supertest(web).get(
      `/api/stores/${STORE_PUBLIC_ID}/products?keyword=Ayam Bakar Madu`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.currentPage[0].name).toBe(
      "Ayam Bakar Madu Spesial",
    );
  });

  test("should return fuzzy match (typo tolerance) using search keyword", async () => {
    const response = await supertest(web).get(
      `/api/stores/${STORE_PUBLIC_ID}/products?keyword=Ayan`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.currentPage[0].name).toBe(
      "Ayam Bakar Madu Spesial",
    );
  });
});
