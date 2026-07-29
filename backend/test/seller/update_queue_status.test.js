import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import crypto from "crypto";

const email = "aliyyulmunif780@gmail.com";
const password = "aliyyul";

describe("PATCH /api/stores/queues/:queueId", () => {
  let cookies;
  let user;
  let otherUser;
  let store;
  let otherStore;
  let guest;
  let queueBelumBayar;
  let queueDiproses;
  let queueSelesai;

  // 1. SETUP MOCK SOCKET.IO
  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
  const mockIo = { to: mockTo };

  const cleanup = async () => {
    await prisma.queueDetail.deleteMany({
      where: { queue: { store: { name: { contains: "Test Queue" } } } },
    });
    await prisma.queue.deleteMany({
      where: { store: { name: { contains: "Test Queue" } } },
    });
    await prisma.guest.deleteMany({
      where: { id: { contains: "guest-test" } },
    });
    await prisma.store.deleteMany({
      where: { name: { contains: "Test Queue" } },
    });
    await prisma.user.deleteMany({
      where: { email: "other-user@test.com" },
    });
  };

  beforeEach(async () => {
    await cleanup();

    // SUNTIKKAN MOCK SOCKET.IO KE EXPRESS
    web.set("socketio", mockIo);

    // 1. Login & Get User Utama (Seller)
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email, password });
    cookies = login.headers["set-cookie"];
    user = await prisma.user.findUnique({ where: { email } });

    // 2. Bikin Toko Utama (Milik User)
    store = await prisma.store.create({
      data: {
        user_id: user.id,
        name: "Test Queue Store",
        public_id: crypto.randomUUID(),
        timezone: "Asia/Jakarta",
      },
    });

    // 3. Bikin User Lain (Lengkap dengan supabase_id agar tidak error Prisma)
    otherUser = await prisma.user.create({
      data: {
        email: "other-user@test.com",
        name: "Other User",
        supabase_id: crypto.randomUUID(), // FIX: Wajib diisi!
      },
    });

    // 4. Bikin Toko Orang Lain
    otherStore = await prisma.store.create({
      data: {
        user_id: otherUser.id,
        name: "Test Queue Other Store",
        public_id: crypto.randomUUID(),
        timezone: "Asia/Jakarta",
      },
    });

    // 5. Setup Guest palsu langsung ke database untuk mock pemilik antrean
    guest = await prisma.guest.create({
      data: { id: `guest-test-${crypto.randomUUID().slice(0, 20)}` },
    });

    // 6. Seeding Antrean
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
  });

  afterEach(async () => {
    vi.clearAllMocks(); // Wajib direstore biar test lain ga bentrok
    await cleanup();
  });

  // --- 1. TEST SUKSES TRANSISI & MOCK SOCKET ---

  test("should success update status from BELUM_BAYAR to DIPROSES and emit socket event", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueBelumBayar.id}`)
      .set("Cookie", cookies)
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
  });

  test("should success update status from DIPROSES to SELESAI and set completed_at", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueDiproses.id}`)
      .set("Cookie", cookies)
      .send({
        storeId: store.public_id,
        status: "SELESAI",
      });

    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe("SELESAI");
    expect(result.body.data.completed_at).not.toBeNull();
  });

  test("should success update status to DIBATALKAN with reason and cancelled_by", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueBelumBayar.id}`)
      .set("Cookie", cookies)
      .send({
        storeId: store.public_id,
        status: "DIBATALKAN",
        reason: "Stok habis bro",
      });

    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe("DIBATALKAN");
    expect(result.body.data.cancellation_reason).toBe("Stok habis bro");
    expect(result.body.data.cancelled_by).toBe("SELLER");
  });

  // --- 2. TEST GAGAL TRANSISI (LOGIKA STATE MACHINE) ---

  test("should reject 400 when transition is illegal (SELESAI to DIPROSES)", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueSelesai.id}`)
      .set("Cookie", cookies)
      .send({
        storeId: store.public_id,
        status: "DIPROSES",
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain("Cannot change the status"); // Sesuai dengan terjemahan error lu
  });

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
      .set("Cookie", cookies) // Cookie milik User A
      .send({
        storeId: otherStore.public_id, // Nembak ID Toko B
        status: "DIPROSES",
      });

    // Wajib gagal (404) karena service ngecek user_id
    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Queue not found");
  });

  // --- 4. TEST RACE CONDITION (OPTIMISTIC CONCURRENCY CONTROL) ---

  test("should reject 409 Conflict if status changes in the middle of request", async () => {
    // Simulasi klik ganda atau antrean udah diupdate orang lain
    vi.spyOn(prisma.queue, "update").mockRejectedValueOnce({
      code: "P2025",
    });

    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueBelumBayar.id}`)
      .set("Cookie", cookies)
      .send({
        storeId: store.public_id,
        status: "DIPROSES",
      });

    expect(result.status).toBe(409);
    expect(result.body.errors).toBe("The queue status has changed");
  });

  // --- 5. TEST VALIDASI PAYLOAD ---

  test("should reject 401 if user is not authenticated", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/queues/${queueBelumBayar.id}`)
      .send({
        storeId: store.public_id,
        status: "DIPROSES",
      });

    expect(result.status).toBe(401);
  });
});
