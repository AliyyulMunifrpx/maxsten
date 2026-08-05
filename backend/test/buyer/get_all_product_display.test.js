import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { beforeAll, afterAll, describe, expect, test } from "vitest";
import crypto from "crypto";

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
  let storePublicId;
  let specificProductId;
  let guestId;

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Setup dilakukan CUMA 1 KALI di awal file
  //    Tanpa Hit Supabase karena ini Public Endpoint (Tanpa Auth)
  // =================================================================
  beforeAll(async () => {
    // 1. Bikin User murni di DB lokal (Cepat Kilat)
    const user = await prisma.user.create({
      data: {
        email: `katalog_${Date.now()}@test.com`,
        supabase_id: crypto.randomUUID(), // Dummy ID
        name: "Owner Katalog",
      },
    });
    userId = user.id;

    // 2. Bikin Toko (Public ID Dinamis anti-tubruk)
    storePublicId = crypto.randomUUID();
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        public_id: storePublicId,
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

    // 3. Bikin Guest untuk Antrean
    const guest = await prisma.guest.create({
      data: {
        id: crypto.randomUUID(), // Harus string UUID 36 char
      },
    });
    guestId = guest.id;

    // 4. Bikin Produk (Kita bikin 22 produk untuk test paginasi 20 limit)
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
      where: { name: "Ayam Bakar Madu Spesial", store_id: internalStoreId },
    });
    specificProductId = specificProduct.id;

    // 5. Bikin Antrean
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
  }, 20000);

  // =================================================================
  // ⚡ CLEANUP UTAMA: Dilakukan CUMA 1 KALI di akhir Test
  // =================================================================
  afterAll(async () => {
    // Hapus hirarkis BERDASARKAN ID, BUKAN DELETE ALL
    if (internalStoreId) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: internalStoreId } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: internalStoreId },
      });
      await prisma.product.deleteMany({
        where: { store_id: internalStoreId },
      });
      await prisma.storeOperationalHour.deleteMany({
        where: { store_id: internalStoreId },
      });
      await prisma.store.deleteMany({
        where: { id: internalStoreId },
      });
    }

    if (guestId) {
      await prisma.guest.deleteMany({ where: { id: guestId } });
    }

    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("should get page 1 catalog with 20 items and correct pagination metadata", async () => {
    const response = await supertest(web).get(
      `/api/stores/${storePublicId}/products`,
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
      `/api/stores/${storePublicId}/products?page=2`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.currentPage).toHaveLength(2);
    expect(response.body.data.nextPage).toHaveLength(0);
  });

  test("should return 404 if store is not found", async () => {
    // Random UUID yang gak ada di database
    const fakeStoreId = crypto.randomUUID();

    const response = await supertest(web).get(
      `/api/stores/${fakeStoreId}/products`,
    );
    expect(response.status).toBe(404);
  });

  test("should correctly aggregate total_sold ONLY from SELESAI queues", async () => {
    const response = await supertest(web).get(
      `/api/stores/${storePublicId}/products`,
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
      `/api/stores/${storePublicId}/products?keyword=Ayam Bakar Madu`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.currentPage[0].name).toBe(
      "Ayam Bakar Madu Spesial",
    );
  });

  test("should return fuzzy match (typo tolerance) using search keyword", async () => {
    const response = await supertest(web).get(
      `/api/stores/${storePublicId}/products?keyword=Ayan`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.currentPage[0].name).toBe(
      "Ayam Bakar Madu Spesial",
    );
  });
});
