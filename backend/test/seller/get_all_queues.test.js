import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import crypto from "crypto";

const email = "aliyyulmunif780@gmail.com";
const password = "aliyyul";

describe("GET /api/stores/:storeId/queues", () => {
  let cookies;
  let user;
  let store;
  let guest;
  let product;

  // Cleanup helper
  const cleanup = async () => {
    await prisma.queueDetail.deleteMany({
      where: { queue: { store: { name: "Warung Queue Test" } } },
    });
    await prisma.queue.deleteMany({
      where: { store: { name: "Warung Queue Test" } },
    });
    await prisma.guest.deleteMany({
      where: { id: { contains: "guest-queue" } },
    });
    await prisma.product.deleteMany({
      where: { name: "Kopi Test" },
    });
    await prisma.storeOperationalHour.deleteMany({
      where: { store: { name: "Warung Queue Test" } },
    });
    await prisma.store.deleteMany({
      where: { name: "Warung Queue Test" },
    });
  };

  beforeEach(async () => {
    await cleanup();

    // 1. Mock Waktu Server -> Senin, 27 Juli 2026 jam 14:00 WIB
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T14:00:00+07:00"));

    // 2. Login User
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email, password });
    cookies = login.headers["set-cookie"];
    user = await prisma.user.findUnique({ where: { email } });

    // 3. Setup Store (Timezone Asia/Jakarta)
    store = await prisma.store.create({
      data: {
        user_id: user.id,
        name: "Warung Queue Test",
        public_id: crypto.randomUUID(),
        timezone: "Asia/Jakarta",
        manual_status: null, // Biar ngandelin jadwal
      },
    });

    // 4. Setup Jadwal Buka (Senin, day 1, 08:00 - 20:00)
    await prisma.storeOperationalHour.create({
      data: {
        store_id: store.id,
        day: 1, // Senin
        open_time: "08:00",
        close_time: "20:00",
        is_active: true,
      },
    });

    // 5. Setup Master Data (Guest & Product)
    guest = await prisma.guest.create({
      data: { id: `guest-queue-${crypto.randomUUID().slice(0, 24)}` },
    });

    product = await prisma.product.create({
      data: { store_id: store.id, name: "Kopi Test", price: 15000 },
    });

    // 6. SEEDING 25 ANTREAN AKTIF HARI INI (Senin jam 10 pagi)
    // Supaya bisa ngetes pagination (limit 20)
    const validQueues = Array.from({ length: 25 }).map((_, i) => ({
      store_id: store.id,
      guest_id: guest.id,
      queue_number: i + 1,
      status: "DIPROSES",
      total_price: 15000,
      created_at: new Date("2026-07-27T10:00:00+07:00"),
      expired_at: new Date("2026-07-27T11:00:00+07:00"),
    }));
    await prisma.queue.createMany({ data: validQueues });

    // 7. SEEDING ANTREAN SESI OVERNIGHT DARI KEMARIN MALAM (Minggu 23:00),
    // statusnya MASIH DIPROSES -> belum di-expire cron job -> HARUS tetap
    // ke-load, karena query di service ini tidak lagi memfilter tanggal.
    // Pembersihan data basi jadi tanggung jawab cron job (yang mengubah
    // status BELUM_BAYAR yang lewat expired_at menjadi DIBATALKAN), bukan
    // tanggung jawab query GET ini.
    await prisma.queue.create({
      data: {
        store_id: store.id,
        guest_id: guest.id,
        queue_number: 99,
        status: "DIPROSES",
        total_price: 15000,
        created_at: new Date("2026-07-26T23:00:00+07:00"),
        expired_at: new Date("2026-07-26T23:30:00+07:00"),
      },
    });

    // 8. SEEDING ANTREAN SELESAI HARI INI -> tetap harus TIDAK ke-load,
    // karena difilter oleh status, bukan oleh tanggal.
    await prisma.queue.create({
      data: {
        store_id: store.id,
        guest_id: guest.id,
        queue_number: 100,
        status: "SELESAI",
        total_price: 15000,
        created_at: new Date("2026-07-27T10:30:00+07:00"),
        expired_at: new Date("2026-07-27T11:00:00+07:00"),
      },
    });
  });

  afterEach(async () => {
    vi.useRealTimers(); // Balikin waktu normal
    await cleanup();
  });

  // --- TEST CASE 1: PAGINATION & PREFETCH HALAMAN 1 ---
  test("should successfully get queues for page 1 with prefetch page 2", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${store.public_id}/queues?page=1`)
      .set("Cookie", cookies);
    expect(result.status).toBe(200);

    const { data } = result.body;

    // Cek integrasi Store Status (Hari ini Senin 14:00, jadwal 08-20, harus OPEN)
    expect(data.storeStatus.is_open).toBe(true);
    expect(data.storeStatus.timezone).toBe("Asia/Jakarta");

    // Total antrean aktif sekarang 26 (25 hari ini + 1 sesi overnight
    // kemarin malam yang statusnya masih DIPROSES).
    expect(data.pagination.currentPage).toBe(1);
    expect(data.pagination.limit).toBe(20);
    expect(data.pagination.totalRows).toBe(26);
    expect(data.pagination.totalPages).toBe(2);

    expect(data.currentPage).toHaveLength(20);
    expect(data.nextPage).toHaveLength(6);

    // Nomor 100 (SELESAI) tidak boleh muncul - difilter status, bukan tanggal.
    const allFetchedNumbers = [
      ...data.currentPage.map((q) => q.queue_number),
      ...data.nextPage.map((q) => q.queue_number),
    ];
    expect(allFetchedNumbers).not.toContain(100);
  });

  // --- TEST CASE 1b: SESI OVERNIGHT TETAP MUNCUL SETELAH LEWAT TENGAH MALAM ---
  test("should still include an active queue created before midnight (overnight session)", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${store.public_id}/queues?page=1`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);

    const { data } = result.body;
    const allFetchedNumbers = [
      ...data.currentPage.map((q) => q.queue_number),
      ...data.nextPage.map((q) => q.queue_number),
    ];

    // Antrean nomor 99 dibuat kemarin jam 23:00, masih DIPROSES -> harus tetap ada.
    expect(allFetchedNumbers).toContain(99);
  });

  // --- TEST CASE 2: PAGINATION HALAMAN 2 (SISA) ---
  test("should successfully get queues for page 2 (end of list)", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${store.public_id}/queues?page=2`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);

    const { data } = result.body;

    expect(data.pagination.currentPage).toBe(2);
    expect(data.currentPage).toHaveLength(6); // 26 total - 20 di halaman 1
    expect(data.nextPage).toHaveLength(0); // Udah habis
  });

  // --- TEST CASE 3: STORE STATUS (DI LUAR JAM OPERASIONAL) ---
  test("should return storeStatus.is_open = false if checked outside working hours", async () => {
    // Majuin waktu ke jam 22:00 WIB (Toko tutup)
    vi.setSystemTime(new Date("2026-07-27T22:00:00+07:00"));

    const result = await supertest(web)
      .get(`/api/stores/${store.public_id}/queues?page=1`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.storeStatus.is_open).toBe(false);

    // Kasir tetap bisa ngeliat antrean meskipun toko udah tutup!
    expect(result.body.data.currentPage.length).toBeGreaterThan(0);
  });

  // --- TEST CASE 4: STORE NOT FOUND ---
  test("should return 404 if store does not exist", async () => {
    const fakeId = crypto.randomUUID();

    const result = await supertest(web)
      .get(`/api/stores/${fakeId}/queues`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
  });

  // --- TEST CASE 5: UNAUTHENTICATED ---
  test("should return 401 if user is not logged in", async () => {
    const result = await supertest(web).get(
      `/api/stores/${store.public_id}/queues`,
    );

    expect(result.status).toBe(401);
  });
});
