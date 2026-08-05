import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { beforeAll, afterAll, describe, expect, test } from "vitest";
import crypto from "crypto";

describe("GET /api/stores/:storeId/queues/:queueId", () => {
  let userId;
  let user2Id;
  let storeId;
  let otherStoreId;
  let queueId;

  // Variabel Master Data
  let storePublicId = "";
  let otherStorePublicId = "";
  let guestId = "";
  let hackerGuestId = "";

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Setup dilakukan CUMA 1 KALI di awal file
  //    Tanpa Hit Supabase karena ini Public Endpoint (Tanpa Auth)
  // =================================================================
  beforeAll(async () => {
    // 1. Generate UUID untuk Guest & Store (Dynamic)
    storePublicId = crypto.randomUUID();
    otherStorePublicId = crypto.randomUUID();
    guestId = crypto.randomUUID();
    hackerGuestId = crypto.randomUUID();

    // 2. Setup Data Dasar - BIKIN 2 USER BERBEDA LANGSUNG DI DATABASE
    const user1 = await prisma.user.create({
      data: {
        email: `queue_owner1_${Date.now()}@test.com`,
        supabase_id: crypto.randomUUID(),
        name: "Owner Asli",
      },
    });
    userId = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `queue_owner2_${Date.now()}@test.com`,
        supabase_id: crypto.randomUUID(),
        name: "Owner Toko Lain",
      },
    });
    user2Id = user2.id;

    // 3. Bikin Toko 1 (Milik User 1)
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        public_id: storePublicId,
        name: "Toko Asli",
        timezone: "Asia/Jakarta",
      },
    });
    storeId = store.id;

    // 4. Bikin Toko 2 (Milik User 2)
    const otherStore = await prisma.store.create({
      data: {
        user_id: user2Id,
        public_id: otherStorePublicId,
        name: "Toko Lain",
        timezone: "Asia/Jakarta",
      },
    });
    otherStoreId = otherStore.id;

    // 5. Bikin Guest
    await prisma.guest.createMany({
      data: [{ id: guestId }, { id: hackerGuestId }],
    });

    // 6. Bikin Product dan Variant
    const product = await prisma.product.create({
      data: { store_id: storeId, name: "Mie Goreng", price: 15000 },
    });

    const variant = await prisma.variant.create({
      data: {
        product_id: product.id,
        name: "Pedas Mampus",
        additional_price: 2000,
      },
    });

    // 7. BIKIN ANTREAN
    const queue = await prisma.queue.create({
      data: {
        store_id: storeId,
        guest_id: guestId,
        queue_number: 10,
        status: "BELUM_BAYAR",
        total_price: 20000,
        expired_at: new Date(Date.now() + 30 * 60000),
      },
    });
    queueId = queue.id;

    // Masukkan Snapshot persis seperti hasil dari fungsi createQueue
    await prisma.queueDetail.create({
      data: {
        queue_id: queueId,
        product_id: product.id,
        variant_id: variant.id,
        quantity: 1,
        selected_addons: [
          { id: "uuid-addon-1", name: "Telor Mata Sapi", price: 3000 },
        ],
      },
    });
  }, 20000);

  // =================================================================
  // ⚡ CLEANUP UTAMA: Dilakukan CUMA 1 KALI di akhir
  // =================================================================
  afterAll(async () => {
    // 1. Karantina pembersihan hanya pada ID Toko yang terlibat
    const activeStoreIds = [storeId, otherStoreId].filter(Boolean);
    if (activeStoreIds.length > 0) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: { in: activeStoreIds } } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: { in: activeStoreIds } },
      });
      await prisma.variant.deleteMany({
        where: { product: { store_id: { in: activeStoreIds } } },
      });
      await prisma.product.deleteMany({
        where: { store_id: { in: activeStoreIds } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: activeStoreIds } },
      });
    }

    // 2. Hapus Guest
    const activeGuestIds = [guestId, hackerGuestId].filter(Boolean);
    if (activeGuestIds.length > 0) {
      await prisma.guest.deleteMany({
        where: { id: { in: activeGuestIds } },
      });
    }

    // 3. Hapus User
    const activeUserIds = [userId, user2Id].filter(Boolean);
    if (activeUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: activeUserIds } },
      });
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("[SUCCESS] should return complete queue details with snapshot addons", async () => {
    const response = await supertest(web)
      .get(`/api/stores/${storePublicId}/queues/${queueId}`)
      .set("Cookie", [`guest_id=${guestId}`]);

    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.id).toBe(queueId);
    expect(data.guest_id).toBe(guestId);
    expect(data.server_now).toBeDefined(); // Penting untuk timer FE

    expect(data.queueDetails).toHaveLength(1);
    expect(data.queueDetails[0].product.name).toBe("Mie Goreng");
    expect(data.queueDetails[0].variant.name).toBe("Pedas Mampus");

    // Pastikan snapshot Addon aman dan bisa diakses
    expect(data.queueDetails[0].selected_addons).toHaveLength(1);
    expect(data.queueDetails[0].selected_addons[0].name).toBe(
      "Telor Mata Sapi",
    );
  });

  test("[ERROR] should return 401 Unauthorized if guest cookie is missing", async () => {
    const response = await supertest(web).get(
      `/api/stores/${storePublicId}/queues/${queueId}`,
    );

    expect(response.status).toBe(401);
    expect(response.body.errors).toContain("Unauthorized");
  });

  test("[ERROR] should return 404 if HACKER tries to access someone else's queue", async () => {
    // Skenario: Hacker nyoba nembak ID antrean orang lain menggunakan cookie-nya sendiri
    const response = await supertest(web)
      .get(`/api/stores/${storePublicId}/queues/${queueId}`)
      .set("Cookie", [`guest_id=${hackerGuestId}`]);

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("No queue found");
  });

  test("[ERROR] should return 404 if accessed via wrong store's public_id", async () => {
    // Skenario: User pakai ID antrean yang bener, tapi nembak public_id toko tetangga
    const response = await supertest(web)
      .get(`/api/stores/${otherStorePublicId}/queues/${queueId}`)
      .set("Cookie", [`guest_id=${guestId}`]);

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("No queue found");
  });

  test("[ERROR] should return 400 Bad Request if queueId is not a number", async () => {
    const response = await supertest(web)
      .get(`/api/stores/${storePublicId}/queues/bukan-angka`)
      .set("Cookie", [`guest_id=${guestId}`]);

    // Ditolak oleh Joi Validation
    expect(response.status).toBe(400);
  });

  test("[ERROR] should return 400 Bad Request if publicId is not a valid UUID", async () => {
    const response = await supertest(web)
      .get(`/api/stores/bukan-uuid-valid/queues/${queueId}`)
      .set("Cookie", [`guest_id=${guestId}`]);

    // Ditolak oleh Joi Validation
    expect(response.status).toBe(400);
  });
});
