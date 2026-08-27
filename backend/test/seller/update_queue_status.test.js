import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import crypto from "crypto";

describe("PATCH /api/stores/queues/:queueId", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";

  let otherEmail = "";
  let otherUserId = "";

  let store;
  let otherStore;
  let guest;
  let queueBelumBayar;
  let queueDiproses;
  let queueSelesai;

  let createdStoreIds = [];
  let createdGuestIds = [];

  // 1. SETUP MOCK SOCKET.IO
  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
  const mockIo = { to: mockTo };

  beforeEach(async () => {
    // SUNTIKKAN MOCK SOCKET.IO KE EXPRESS
    web.set("socketio", mockIo);

    // ==========================================
    // 1. SETUP USER UTAMA (SELLER)
    // ==========================================
    testEmail = `seller_patch_queue_${Date.now()}@gmail.com`;
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Seller" },
    });
    if (error)
      throw new Error(`Supabase Admin Error (Seller): ${error.message}`);
    userId = authData.user.id;

    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Seller",
      },
    });

    // Login User untuk dapat Access Token
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email: testEmail, password: "password123" });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = login.body.data.access_token;

    store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Test Queue Store",
        public_id: crypto.randomUUID(),
        timezone: "Asia/Jakarta",
      },
    });
    createdStoreIds.push(store.public_id);

    // ==========================================
    // 2. SETUP USER LAIN (KORBAN CROSS-TENANT)
    // ==========================================
    otherEmail = `other_patch_queue_${Date.now()}@gmail.com`;
    const { data: otherAuthData, error: otherError } =
      await supabase.auth.admin.createUser({
        email: otherEmail,
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Tumbal Other" },
      });
    if (otherError)
      throw new Error(`Supabase Admin Error (Other): ${otherError.message}`);
    otherUserId = otherAuthData.user.id;

    await prisma.user.create({
      data: {
        id: otherUserId,
        supabase_id: otherUserId,
        email: otherEmail,
        name: "Tumbal Other",
      },
    });

    otherStore = await prisma.store.create({
      data: {
        user_id: otherUserId,
        name: "Test Queue Other Store",
        public_id: crypto.randomUUID(),
        timezone: "Asia/Jakarta",
      },
    });
    createdStoreIds.push(otherStore.public_id);

    // ==========================================
    // 3. SETUP MASTER DATA ANTREAN
    // ==========================================
    guest = await prisma.guest.create({
      data: { id: `guest-test-${crypto.randomUUID().slice(0, 20)}` },
    });
    createdGuestIds.push(guest.id);

    queueBelumBayar = await prisma.queue.create({
      data: {
        store_id: store.id,
        guest_id: guest.id,
        queue_number: 1,
        status: "BELUM_BAYAR",
        total_price: 15000,
        created_at: new Date(),
        expired_at: new Date(Date.now() + 3600000), // +1 jam
      },
    });

    queueDiproses = await prisma.queue.create({
      data: {
        store_id: store.id,
        guest_id: guest.id,
        queue_number: 2,
        status: "DIPROSES",
        total_price: 15000,
        created_at: new Date(),
        expired_at: new Date(Date.now() + 3600000),
      },
    });

    queueSelesai = await prisma.queue.create({
      data: {
        store_id: store.id,
        guest_id: guest.id,
        queue_number: 3,
        status: "SELESAI",
        total_price: 15000,
        created_at: new Date(),
        expired_at: new Date(Date.now() + 3600000),
        completed_at: new Date(),
      },
    });
  }, 20000);

  afterEach(async () => {
    vi.clearAllMocks(); // Wajib direstore biar test lain ga bentrok

    // --- CLEANUP RELASI TOKO ---
    if (createdStoreIds.length > 0) {
      const targetStores = await prisma.store.findMany({
        where: { public_id: { in: createdStoreIds } },
        select: { id: true },
      });
      const internalIds = targetStores.map((s) => s.id);

      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: { in: internalIds } } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: { in: internalIds } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: internalIds } },
      });
    }

    if (createdGuestIds.length > 0) {
      await prisma.guest.deleteMany({
        where: { id: { in: createdGuestIds } },
      });
    }

    // --- CLEANUP USER UTAMA (SELLER) ---
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {}
    }

    // --- CLEANUP USER LAIN (OTHER) ---
    if (otherEmail) {
      await prisma.user.deleteMany({ where: { email: otherEmail } });
    }
    if (otherUserId) {
      try {
        await supabase.auth.admin.deleteUser(otherUserId);
      } catch (err) {}
    }
  }, 20000);

  // --- 1. TEST SUKSES TRANSISI & MOCK SOCKET ---
  test("should success update status from BELUM_BAYAR to DIPROSES and emit socket event", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueBelumBayar.id}`)
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        storeId: store.public_id,
        status: "DIPROSES",
      });

    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe("DIPROSES");

    // CEK DB: Pastikan beneran keganti
    const dbQueue = await prisma.queue.findUnique({
      where: { id: queueBelumBayar.id },
    });
    expect(dbQueue.status).toBe("DIPROSES");

    // CEK SOCKET: Pastikan notifikasi dikirim ke kamar yang benar
    const namaKamarPembeli = `ANTREAN_${queueBelumBayar.id}`;
    expect(mockTo).toHaveBeenCalledWith(namaKamarPembeli);
    expect(mockEmit).toHaveBeenCalledWith("STATUS_UPDATED", expect.any(Object));
  }, 20000);

  test("should success update status from DIPROSES to SELESAI and set completed_at", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueDiproses.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        storeId: store.public_id,
        status: "SELESAI",
      });

    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe("SELESAI");
    expect(result.body.data.completed_at).not.toBeNull();
  }, 20000);

  test("should success update status to DIBATALKAN with reason and cancelled_by", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueBelumBayar.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        storeId: store.public_id,
        status: "DIBATALKAN",
        reason: "Stok habis bro",
      });

    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe("DIBATALKAN");
    expect(result.body.data.cancellation_reason).toBe("Stok habis bro");
    expect(result.body.data.cancelled_by).toBe("SELLER");
  }, 20000);

  // --- 2. TEST GAGAL TRANSISI (LOGIKA STATE MACHINE) ---
  test("should reject 400 when transition is illegal (SELESAI to DIPROSES)", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueSelesai.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        storeId: store.public_id,
        status: "DIPROSES",
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain("Cannot change the status");
  }, 20000);

  // --- 3. TEST KEAMANAN OTORISASI CROSS-TENANT ---
  test("should reject 404 when trying to update queue belonging to another store", async () => {
    // Antrean milik toko Budi
    const otherQueue = await prisma.queue.create({
      data: {
        store_id: otherStore.id,
        guest_id: guest.id,
        queue_number: 99,
        status: "BELUM_BAYAR",
        total_price: 15000,
        created_at: new Date(),
        expired_at: new Date(Date.now() + 3600000),
      },
    });

    // Lu nyoba ngubah pakai akun lu
    const result = await supertest(web)
      .patch(`/api/stores/queues/${otherQueue.id}`)
      .set("Authorization", `Bearer ${accessToken}`) // Token milik User A
      .send({
        storeId: otherStore.public_id, // Nembak ID Toko B
        status: "DIPROSES",
      });

    // Wajib gagal (404) karena service ngecek user_id
    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Queue not found");
  }, 20000);

  // --- 4. TEST RACE CONDITION (OPTIMISTIC CONCURRENCY CONTROL) ---
  test("should reject 409 Conflict if status changes in the middle of request", async () => {
    // Simulasi klik ganda atau antrean udah diupdate orang lain
    vi.spyOn(prisma.queue, "update").mockRejectedValueOnce({
      code: "P2025",
    });

    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueBelumBayar.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        storeId: store.public_id,
        status: "DIPROSES",
      });

    expect(result.status).toBe(409);
    expect(result.body.errors).toBe("The queue status has changed");
  }, 20000);

  // --- 5. TEST VALIDASI PAYLOAD ---
  test("should reject 401 if user is not authenticated", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueBelumBayar.id}`)
      .send({
        storeId: store.public_id,
        status: "DIPROSES",
      }); // Tanpa Token

    expect(result.status).toBe(401);
  }, 20000);
});
