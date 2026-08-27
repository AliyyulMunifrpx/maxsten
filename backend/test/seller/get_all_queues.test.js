import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import crypto from "crypto";

describe("GET /api/stores/:storeId/queues", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";
  let store;
  let guest;
  let product;

  // Penampung ID untuk di-cleanup otomatis di akhir test
  let createdStoreIds = [];
  let createdGuestIds = [];

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `get_queues_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Get Queues",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Get Queues",
      },
    });

    // 4. Mock Waktu Server -> Senin, 27 Juli 2026 jam 14:00 WIB
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T14:00:00+07:00"));

    // 5. Login User untuk dapat Access Token
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email: testEmail, password: "password123" });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = login.body.data.access_token;

    // 6. Setup Store (Timezone Asia/Jakarta)
    store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Warung Queue Test",
        public_id: crypto.randomUUID(),
        timezone: "Asia/Jakarta",
        manual_status: null, // Biar ngandelin jadwal
      },
    });
    createdStoreIds.push(store.public_id);

    // 7. Setup Jadwal Buka (Senin, day 1, 08:00 - 20:00)
    await prisma.storeOperationalHour.createMany({
      data: Array.from({ length: 7 }, (_, day) => ({
        store_id: store.id,
        day: day, // Otomatis ngisi 0 sampai 6
        open_time: "00:00",
        close_time: "23:59",
        is_active: true,
      })),
    });

    // 8. Setup Master Data (Guest & Product)
    guest = await prisma.guest.create({
      data: { id: `guest-queue-${crypto.randomUUID().slice(0, 24)}` },
    });
    createdGuestIds.push(guest.id);

    product = await prisma.product.create({
      data: { store_id: store.id, name: "Kopi Test", price: 15000 },
    });

    // 9. SEEDING 25 ANTREAN AKTIF HARI INI (Senin jam 10 pagi)
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

    // 10. SEEDING ANTREAN SESI OVERNIGHT DARI KEMARIN MALAM
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

    // 11. SEEDING ANTREAN SELESAI HARI INI
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
  }, 20000);

  afterEach(async () => {
    vi.useRealTimers(); // Balikin waktu normal

    // --- CLEANUP TERSENTRAL ---
    if (createdStoreIds.length > 0) {
      // Ambil Internal ID Toko berdasarkan public_id
      const targetStores = await prisma.store.findMany({
        where: { public_id: { in: createdStoreIds } },
        select: { id: true },
      });
      const internalIds = targetStores.map((s) => s.id);

      // Sapu bersih QueueDetail, Queue, Product, OpsHour, lalu Store
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: { in: internalIds } } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: { in: internalIds } },
      });
      await prisma.product.deleteMany({
        where: { store_id: { in: internalIds } },
      });
      await prisma.storeOperationalHour.deleteMany({
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

    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // best-effort cleanup
      }
    }
  }, 20000);

  // --- TEST CASE 1: PAGINATION & PREFETCH HALAMAN 1 ---
  test("should successfully get queues for page 1 with prefetch page 2", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${store.public_id}/queues?page=1`)
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);

    const { data } = result.body;

    // Cek integrasi Store Status (Hari ini Senin 14:00, jadwal 08-20, harus OPEN)
    expect(data.storeStatus.is_open).toBe(true);
    expect(data.storeStatus.timezone).toBe("Asia/Jakarta");

    expect(data.pagination.currentPage).toBe(1);
    expect(data.pagination.limit).toBe(20);
    expect(data.pagination.totalRows).toBe(26); // 25 + 1 overnight
    expect(data.pagination.totalPages).toBe(2);

    expect(data.currentPage).toHaveLength(20);
    expect(data.nextPage).toHaveLength(6);

    // Nomor 100 (SELESAI) tidak boleh muncul
    const allFetchedNumbers = [
      ...data.currentPage.map((q) => q.queue_number),
      ...data.nextPage.map((q) => q.queue_number),
    ];
    expect(allFetchedNumbers).not.toContain(100);
  }, 20000);

  // --- TEST CASE 1b: SESI OVERNIGHT TETAP MUNCUL SETELAH LEWAT TENGAH MALAM ---
  test("should still include an active queue created before midnight (overnight session)", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${store.public_id}/queues?page=1`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);

    const { data } = result.body;
    const allFetchedNumbers = [
      ...data.currentPage.map((q) => q.queue_number),
      ...data.nextPage.map((q) => q.queue_number),
    ];

    // Antrean nomor 99 dibuat kemarin jam 23:00, masih DIPROSES -> harus tetap ada.
    expect(allFetchedNumbers).toContain(99);
  }, 20000);

  // --- TEST CASE 2: PAGINATION HALAMAN 2 (SISA) ---
  test("should successfully get queues for page 2 (end of list)", async () => {
    const result = await supertest(web)
      .get(`/api/stores/${store.public_id}/queues?page=2`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);

    const { data } = result.body;

    expect(data.pagination.currentPage).toBe(2);
    expect(data.currentPage).toHaveLength(6); // 26 total - 20 di halaman 1
    expect(data.nextPage).toHaveLength(0); // Udah habis
  }, 20000);

  // --- TEST CASE 3: STORE STATUS (DI LUAR JAM OPERASIONAL) ---
  test("should return storeStatus.is_open = false if checked outside working hours", async () => {
    // 1. Wajib nyalain fake timers dulu biar vi.setSystemTime mempan!
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T22:00:00+07:00"));

    // 2. Sapu Bersih: Update SEMUA hari (tanpa peduli day berapa)
    // biar buka jam 08:00 dan tutup jam 20:00 khusus buat tes ini.
    await prisma.storeOperationalHour.updateMany({
      where: {
        store_id: store.id,
      },
      data: {
        open_time: "08:00",
        close_time: "20:00",
      },
    });

    // 3. Tembak API-nya
    const result = await supertest(web)
      .get(`/api/stores/${store.public_id}/queues?page=1`)
      .set("Authorization", `Bearer ${accessToken}`);

    // 4. BALIKIN WAKTU KE NORMAL biar test di bawahnya nggak ikut error!
    vi.useRealTimers();

    expect(result.status).toBe(200);

    // Sekarang PASTI dapet false (Toko Tutup)
    expect(result.body.data.storeStatus.is_open).toBe(false);

    // Kasir tetap bisa ngeliat sisa antrean meskipun toko udah tutup
    expect(result.body.data.currentPage.length).toBeGreaterThan(0);
  }, 20000);

  // --- TEST CASE 4: STORE NOT FOUND ---
  test("should return 404 if store does not exist", async () => {
    const fakeId = crypto.randomUUID();

    const result = await supertest(web)
      .get(`/api/stores/${fakeId}/queues`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  // --- TEST CASE 5: UNAUTHENTICATED ---
  test("should return 401 if user is not logged in", async () => {
    const result = await supertest(web).get(
      `/api/stores/${store.public_id}/queues`,
    ); // Tanpa Token

    expect(result.status).toBe(401);
  }, 20000);
});
