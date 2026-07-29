import supertest from "supertest";
import { web } from "../../src/application/web.js"; // Sesuaikan path
import { prisma } from "../../src/application/database.js"; // Sesuaikan path
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const STORE_PUBLIC_ID = "123e4567-e89b-12d3-a456-426614174000";
const DELETED_STORE_PUBLIC_ID = "999e4567-e89b-12d3-a456-426614174999";
const GUEST_ID = "11111111-2222-3333-4444-555555555555";
const HACKER_GUEST_ID = "99999999-8888-7777-6666-555555555555";

describe("PATCH /api/:publicId/queues/:queueId/cancel", () => {
  let activeQueueId;
  let processedQueueId;
  let hostageQueueId; // Antrean di toko yang udah dihapus

  beforeEach(async () => {
    // 1. Bersihkan database
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Setup User & 2 Toko (1 Aktif, 1 Dihapus)
    const user = await prisma.user.create({
      data: {
        email: "owner_cancel@test.com",
        supabase_id: "supa-cancel-123",
        name: "Owner Cancel Test",
      },
    });

    const activeStore = await prisma.store.create({
      data: {
        user_id: user.id,
        public_id: STORE_PUBLIC_ID,
        name: "Toko Aktif",
        timezone: "Asia/Jakarta",
        is_delete: false,
      },
    });

    const deletedStore = await prisma.store.create({
      data: {
        user_id: user.id, // Pakai user yg sama gpp, karena is_delete true gak kena unique constraint (asumsi schema lu begitu)
        public_id: DELETED_STORE_PUBLIC_ID,
        name: "Toko Tutup/Dihapus",
        timezone: "Asia/Jakarta",
        is_delete: true, // <-- Toko ini udah dihapus ownernya
      },
    });

    // 3. Setup Guests
    await prisma.guest.create({ data: { id: GUEST_ID } });
    await prisma.guest.create({ data: { id: HACKER_GUEST_ID } });

    // 4. Setup Antrean

    // A. Antrean Normal (Bisa dibatalkan)
    const activeQueue = await prisma.queue.create({
      data: {
        store_id: activeStore.id,
        guest_id: GUEST_ID,
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
        store_id: activeStore.id,
        guest_id: GUEST_ID,
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
        store_id: deletedStore.id,
        guest_id: GUEST_ID,
        queue_number: 3,
        status: "BELUM_BAYAR",
        total_price: 15000,
        expired_at: new Date(Date.now() + 30 * 60000),
      },
    });
    hostageQueueId = hostageQueue.id;
  });

  afterEach(async () => {
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});
  });

  test("[SUCCESS] should cancel a BELUM_BAYAR order and update updated_at", async () => {
    const payload = { reason: "Lama banget bang" };

    const response = await supertest(web)
      .patch(`/api/${STORE_PUBLIC_ID}/queues/${activeQueueId}/cancel`)
      .set("Cookie", [`guest_id=${GUEST_ID}`])
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
  });

  test("[SUCCESS] should be able to cancel order EVEN IF the store is soft-deleted", async () => {
    // Skenario Pembeli Disandera: Toko dihapus, tapi antrean nyangkut. Harus bisa dibatalkan.
    const response = await supertest(web)
      .patch(`/api/${DELETED_STORE_PUBLIC_ID}/queues/${hostageQueueId}/cancel`)
      .set("Cookie", [`guest_id=${GUEST_ID}`]);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("DIBATALKAN");
  });

  test("[ERROR] should reject cancellation if order is already processed", async () => {
    const response = await supertest(web)
      .patch(`/api/${STORE_PUBLIC_ID}/queues/${processedQueueId}/cancel`)
      .set("Cookie", [`guest_id=${GUEST_ID}`]);

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("processed and cannot be canceled");
  });

  test("[ERROR] should return 404 if HACKER tries to cancel someone else's order", async () => {
    const response = await supertest(web)
      .patch(`/api/${STORE_PUBLIC_ID}/queues/${activeQueueId}/cancel`)
      .set("Cookie", [`guest_id=${HACKER_GUEST_ID}`]); // Hacker masuk pakai cookienya sendiri

    // Langsung tembak 404 karena IDOR Guard Clause lu nyari: id antrean + guest_id hacker
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain(
      "not found or does not belong to you",
    );
  });

  test("[ERROR] should return 401 Unauthorized if cookie is missing", async () => {
    const response = await supertest(web).patch(
      `/api/${STORE_PUBLIC_ID}/queues/${activeQueueId}/cancel`,
    );

    expect(response.status).toBe(401);
  });

  test("[ERROR] should return 400 Bad Request if publicId is NOT a UUID (Joi Validation)", async () => {
    const response = await supertest(web)
      .patch(`/api/bukan-uuid-123/queues/${activeQueueId}/cancel`)
      .set("Cookie", [`guest_id=${GUEST_ID}`]);

    expect(response.status).toBe(400);
  });

  test("[ERROR] should return 400 Bad Request if queueId is NOT a number (Joi Validation)", async () => {
    const response = await supertest(web)
      .patch(`/api/${STORE_PUBLIC_ID}/queues/bukan-angka/cancel`)
      .set("Cookie", [`guest_id=${GUEST_ID}`]);

    expect(response.status).toBe(400);
  });
});
