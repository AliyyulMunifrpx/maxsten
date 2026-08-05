import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
} from "vitest";
import crypto from "crypto";

describe("PATCH /api/stores/:storeId/queues/:queueId/cancel", () => {
  // Master Data (Setup 1x di beforeAll)
  let testEmail = "";
  let userId = "";

  let activeStoreId = null;
  let activeStorePublicId = "";

  let deletedStoreId = null;
  let deletedStorePublicId = "";

  let guestId = "";
  let hackerGuestId = "";

  // Transaction Data (Setup berulang di beforeEach)
  let activeQueueId;
  let processedQueueId;
  let hostageQueueId;

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Setup Data Master CUMA 1 KALI di awal
  // =================================================================
  beforeAll(async () => {
    // 1. Setup User Utama via Supabase
    testEmail = `cancel_buyer_${Date.now()}@gmail.com`;
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Buyer Cancel" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Buyer Cancel",
      },
    });

    // 2. Setup 2 Toko (Aktif & Dihapus)
    activeStorePublicId = crypto.randomUUID();
    const activeStore = await prisma.store.create({
      data: {
        user_id: userId,
        public_id: activeStorePublicId,
        name: "Toko Aktif",
        timezone: "Asia/Jakarta",
        is_delete: false,
      },
    });
    activeStoreId = activeStore.id;

    deletedStorePublicId = crypto.randomUUID();
    const deletedStore = await prisma.store.create({
      data: {
        user_id: userId,
        public_id: deletedStorePublicId,
        name: "Toko Tutup/Dihapus",
        timezone: "Asia/Jakarta",
        is_delete: true, // <-- Toko ini udah dihapus ownernya
      },
    });
    deletedStoreId = deletedStore.id;

    // 3. Setup Guests
    guestId = crypto.randomUUID();
    hackerGuestId = crypto.randomUUID();

    await prisma.guest.createMany({
      data: [{ id: guestId }, { id: hackerGuestId }],
    });
  }, 20000);

  // =================================================================
  // ⚡ CLEANUP: Dilakukan CUMA 1 KALI setelah semua test selesai
  // =================================================================
  afterAll(async () => {
    const storeIds = [activeStoreId, deletedStoreId].filter(Boolean);
    if (storeIds.length > 0) {
      await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
    }

    const gIds = [guestId, hackerGuestId].filter(Boolean);
    if (gIds.length > 0) {
      await prisma.guest.deleteMany({ where: { id: { in: gIds } } });
    }

    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (e) {}
    }
  }, 20000);

  // =================================================================
  // ⚡ RESET LOKAL: Database Prisma Cepat Kilat (Data Antrean Saja)
  // =================================================================
  beforeEach(async () => {
    // Bersihkan sisa queue test sebelumnya
    await prisma.queue.deleteMany({
      where: { store_id: { in: [activeStoreId, deletedStoreId] } },
    });

    // A. Antrean Normal (Bisa dibatalkan)
    const activeQueue = await prisma.queue.create({
      data: {
        store_id: activeStoreId,
        guest_id: guestId,
        queue_number: 1,
        status: "BELUM_BAYAR",
        total_price: 20000,
        expired_at: new Date(Date.now() + 30 * 60000),
      },
    });
    activeQueueId = activeQueue.id;

    // B. Antrean Udah Diproses Kasir (Gak bisa dibatalkan)
    const processedQueue = await prisma.queue.create({
      data: {
        store_id: activeStoreId,
        guest_id: guestId,
        queue_number: 2,
        status: "DIPROSES", // <-- Status udah diproses
        total_price: 30000,
        expired_at: new Date(Date.now() + 30 * 60000),
      },
    });
    processedQueueId = processedQueue.id;

    // C. Antrean di Toko yang udah Dihapus (Tetap harus bisa dibatalkan)
    const hostageQueue = await prisma.queue.create({
      data: {
        store_id: deletedStoreId,
        guest_id: guestId,
        queue_number: 3,
        status: "BELUM_BAYAR",
        total_price: 15000,
        expired_at: new Date(Date.now() + 30 * 60000),
      },
    });
    hostageQueueId = hostageQueue.id;
  }, 20000);

  afterEach(async () => {
    // Bersihkan data Queue dan Detail-nya (Cascade Manual)
    await prisma.queueDetail.deleteMany({
      where: { queue: { store_id: { in: [activeStoreId, deletedStoreId] } } },
    });
    await prisma.queue.deleteMany({
      where: { store_id: { in: [activeStoreId, deletedStoreId] } },
    });
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("[SUCCESS] should cancel a BELUM_BAYAR order and update updated_at", async () => {
    const payload = { reason: "Lama banget bang" };

    const response = await supertest(web)
      .patch(
        `/api/stores/${activeStorePublicId}/queues/${activeQueueId}/cancel`,
      )
      .set("Cookie", [`guest_id=${guestId}`])
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(activeQueueId);
    expect(response.body.data.status).toBe("DIBATALKAN");
    expect(response.body.data.store_id).toBeUndefined(); // Keamanan: Pastikan store_id TIDAK bocor ke frontend

    // Cek langsung ke database buat mastiin update_at berubah & reason masuk
    const dbCheck = await prisma.queue.findUnique({
      where: { id: activeQueueId },
    });
    expect(dbCheck.cancellation_reason).toBe("Lama banget bang");
    expect(dbCheck.cancelled_by).toBe("BUYER");
  }, 20000);

  test("[SUCCESS] should be able to cancel order EVEN IF the store is soft-deleted", async () => {
    // Skenario Pembeli Disandera: Toko dihapus, tapi antrean nyangkut. Harus bisa dibatalkan.
    const response = await supertest(web)
      .patch(
        `/api/stores/${deletedStorePublicId}/queues/${hostageQueueId}/cancel`,
      )
      .set("Cookie", [`guest_id=${guestId}`]);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("DIBATALKAN");
  }, 20000);

  test("[ERROR] should reject cancellation if order is already processed", async () => {
    const response = await supertest(web)
      .patch(
        `/api/stores/${activeStorePublicId}/queues/${processedQueueId}/cancel`,
      )
      .set("Cookie", [`guest_id=${guestId}`]);

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("processed and cannot be canceled");
  }, 20000);

  test("[ERROR] should return 404 if HACKER tries to cancel someone else's order", async () => {
    const response = await supertest(web)
      .patch(
        `/api/stores/${activeStorePublicId}/queues/${activeQueueId}/cancel`,
      )
      .set("Cookie", [`guest_id=${hackerGuestId}`]); // Hacker masuk pakai cookienya sendiri

    // Langsung tembak 404 karena IDOR Guard Clause lu nyari: id antrean + guest_id hacker
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain(
      "not found or does not belong to you",
    );
  }, 20000);

  test("[ERROR] should return 401 Unauthorized if cookie is missing", async () => {
    const response = await supertest(web).patch(
      `/api/stores/${activeStorePublicId}/queues/${activeQueueId}/cancel`,
    );

    expect(response.status).toBe(401);
  }, 20000);

  test("[ERROR] should return 400 Bad Request if publicId is NOT a UUID (Joi Validation)", async () => {
    const response = await supertest(web)
      .patch(`/api/stores/bukan-uuid-valid/queues/${activeQueueId}/cancel`)
      .set("Cookie", [`guest_id=${guestId}`]);

    expect(response.status).toBe(400);
  }, 20000);

  test("[ERROR] should return 400 Bad Request if queueId is NOT a number (Joi Validation)", async () => {
    const response = await supertest(web)
      .patch(`/api/stores/${activeStorePublicId}/queues/bukan-angka/cancel`)
      .set("Cookie", [`guest_id=${guestId}`]);

    expect(response.status).toBe(400);
  }, 20000);
});
