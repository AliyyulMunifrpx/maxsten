import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";

const LOGIN_EMAIL = "test_get_reasons@gmail.com";
const LOGIN_PASSWORD = "password123";
const ENDPOINT = "/api/seller/cancel-reasons";

describe("GET /api/seller/cancel-reasons", () => {
  let cookies = [];
  let userId = "";
  let storeId = null;

  beforeEach(async () => {
    // 1. Bersihkan database
    await prisma.cancelReasonTemplate.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "other@gmail.com" } });

    // 2. Register dan Login
    await supertest(web).post("/api/users").send({
      email: LOGIN_EMAIL,
      name: "User Get Reason",
      password: LOGIN_PASSWORD,
    });

    const loginResult = await supertest(web).post("/api/users/login").send({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });
    cookies = loginResult.headers["set-cookie"];
    const user = await prisma.user.findUnique({
      where: { email: LOGIN_EMAIL },
    });
    userId = user.id;

    // 3. Buatkan Toko Utama
    const store = await prisma.store.create({
      data: { user_id: userId, name: "Toko Alasan", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // --- SETUP DATA (UNTUK TES SORTING & FILTER) ---
    const dateOld = new Date(Date.now() - 100000); // Lebih lama
    const dateNew = new Date(); // Paling baru

    // [A] Alasan 1: Dibuat lebih dulu
    await prisma.cancelReasonTemplate.create({
      data: {
        store_id: storeId,
        reason: "Alasan Lama",
        created_at: dateOld,
      },
    });

    // [B] Alasan 2: Dibuat paling baru (Harusnya muncul pertama)
    await prisma.cancelReasonTemplate.create({
      data: {
        store_id: storeId,
        reason: "Alasan Baru",
        created_at: dateNew,
      },
    });

    // [C] Alasan 3: Sudah dihapus (is_delete: true) -> Harusnya TIDAK TAMPIL
    await prisma.cancelReasonTemplate.create({
      data: {
        store_id: storeId,
        reason: "Alasan Dihapus",
        is_delete: true,
        created_at: dateNew,
      },
    });

    // [D] Toko & Alasan Milik Orang Lain (Untuk tes IDOR/Keamanan)
    const otherUser = await prisma.user.create({
      data: {
        email: "other@gmail.com",
        name: "Orang Lain",
        supabase_id: uuidv4(),
      },
    });
    const otherStore = await prisma.store.create({
      data: {
        user_id: otherUser.id,
        name: "Toko Lain",
        timezone: "Asia/Jakarta",
      },
    });
    await prisma.cancelReasonTemplate.create({
      data: {
        store_id: otherStore.id,
        reason: "Alasan Toko Sebelah",
        created_at: dateNew,
      },
    });
  }, 20000);

  afterEach(async () => {
    await prisma.cancelReasonTemplate.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "other@gmail.com" } });
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
