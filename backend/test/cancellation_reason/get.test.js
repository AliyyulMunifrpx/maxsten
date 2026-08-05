import supertest from "supertest";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
} from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";

const ENDPOINT = "/api/seller/cancel-reasons";

describe("GET /api/seller/cancel-reasons", () => {
  let cookies = [];

  // User scope file (Dibuat sekali di beforeAll)
  let testEmail = "";
  let userId = "";
  let otherEmail = "";
  let otherUserId = "";

  // Data scope test (Direset di beforeEach)
  let storeId = null;
  let otherStoreId = null;

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Hit Supabase CUMA 1 KALI untuk semua test
  // =================================================================
  beforeAll(async () => {
    testEmail = `get_reasons_main_${Date.now()}@gmail.com`;
    otherEmail = `get_reasons_other_${Date.now()}@gmail.com`;

    // 1. Setup User Utama via Supabase
    const { data: authMain } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
    });
    userId = authMain.user.id;
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Main",
      },
    });

    // 2. Setup User Lain via Supabase
    const { data: authOther } = await supabase.auth.admin.createUser({
      email: otherEmail,
      password: "password123",
      email_confirm: true,
    });
    otherUserId = authOther.user.id;
    await prisma.user.create({
      data: {
        id: otherUserId,
        supabase_id: otherUserId,
        email: otherEmail,
        name: "Tumbal Other",
      },
    });

    // 3. Login SEKALI SAJA untuk dapat Cookie
    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = loginResult.headers["set-cookie"];
  }, 20000);

  afterAll(async () => {
    // Bersihkan User di akhir file secara total
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (err) {}
    try {
      await supabase.auth.admin.deleteUser(otherUserId);
    } catch (err) {}
  }, 20000);

  // =================================================================
  // ⚡ RESET LOKAL: Database Prisma Cepat Kilat (Tanpa Internet)
  // =================================================================
  beforeEach(async () => {
    // Bersihkan sisa toko/alasan dari test sebelumnya khusus untuk 2 user ini
    await prisma.cancelReasonTemplate.deleteMany({
      where: { store: { user_id: { in: [userId, otherUserId] } } },
    });
    await prisma.store.deleteMany({
      where: { user_id: { in: [userId, otherUserId] } },
    });

    // --- Buatkan Toko Utama ---
    const store = await prisma.store.create({
      data: { user_id: userId, name: "Toko Alasan", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // --- SETUP DATA (UNTUK TES SORTING & FILTER) ---
    const dateOld = new Date(Date.now() - 100000); // Lebih lama
    const dateNew = new Date(); // Paling baru

    await prisma.cancelReasonTemplate.createMany({
      data: [
        { store_id: storeId, reason: "Alasan Lama", created_at: dateOld },
        { store_id: storeId, reason: "Alasan Baru", created_at: dateNew },
        {
          store_id: storeId,
          reason: "Alasan Dihapus",
          is_delete: true,
          created_at: dateNew,
        },
      ],
    });

    // --- Buatkan Toko & Alasan Orang Lain ---
    const otherStore = await prisma.store.create({
      data: {
        user_id: otherUserId,
        name: "Toko Lain",
        timezone: "Asia/Jakarta",
      },
    });
    otherStoreId = otherStore.id;

    await prisma.cancelReasonTemplate.create({
      data: {
        store_id: otherStoreId,
        reason: "Alasan Toko Sebelah",
        created_at: dateNew,
      },
    });
  });

  afterEach(async () => {
    // Bersihkan record toko & alasan selesai tiap test case
    await prisma.cancelReasonTemplate.deleteMany({
      where: { store: { user_id: { in: [userId, otherUserId] } } },
    });
    await prisma.store.deleteMany({
      where: { user_id: { in: [userId, otherUserId] } },
    });
  });

  // ====================== TEST CASES ====================== //

  test("1. Should get all active Cancel Reasons and sort them by 'created_at' DESC", async () => {
    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(200);

    const data = result.body.data;

    // Harus mengembalikan 2 alasan (Yang soft-delete dan milik orang lain TIDAK ikut)
    expect(data).toHaveLength(2);

    // Cek Sorting DESC (Yang terbaru "Alasan Baru" harus berada di index 0)
    expect(data[0].reason).toBe("Alasan Baru");
    expect(data[1].reason).toBe("Alasan Lama");

    // Cek field yang di-select
    expect(data[0].id).toBeDefined();
    expect(data[0].created_at).toBeDefined();
    expect(data[0].store_id).toBeUndefined(); // Memastikan kolom yang nggak perlu nggak bocor
  });

  test("2. Should return empty array [] if Store has no Cancel Reasons", async () => {
    // Hapus semua alasan milik toko ini secara hard-delete
    await prisma.cancelReasonTemplate.deleteMany({
      where: { store_id: storeId },
    });

    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual([]); // Hasilnya wajib array kosong, bukan null/error
  });

  test("3. Should return 404 if User does NOT have an active store", async () => {
    // Soft-delete toko milik user
    await prisma.store.update({
      where: { id: storeId },
      data: { is_delete: true },
    });

    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Store not found");
  });

  test("4. Should return 401 when unauthorized (no cookie)", async () => {
    const result = await supertest(web).get(ENDPOINT);

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});
