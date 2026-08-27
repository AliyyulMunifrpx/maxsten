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
import { v4 as uuidv4 } from "uuid";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";

const ENDPOINT_PREFIX = "/api/seller/cancel-reasons";

describe("PATCH /api/seller/cancel-reasons/:reasonId", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";

  // User scope file (Dibuat sekali di beforeAll)
  let testEmail = "";
  let userId = "";
  let hackerEmail = "";
  let hackerUserId = "";

  // Data scope test (Direset di beforeEach)
  let storeId = null;
  let hackerStoreId = null;
  let targetReasonId = "";
  let otherUserReasonId = "";
  let existingReasonText = "Pelanggan tidak bisa dihubungi";

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Hit Supabase CUMA 1 KALI untuk semua test
  // =================================================================
  beforeAll(async () => {
    testEmail = `update_reason_main_${Date.now()}@gmail.com`;
    hackerEmail = `update_reason_hacker_${Date.now()}@gmail.com`;

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

    // 2. Setup Hacker via Supabase
    const { data: authHacker } = await supabase.auth.admin.createUser({
      email: hackerEmail,
      password: "password123",
      email_confirm: true,
    });
    hackerUserId = authHacker.user.id;
    await prisma.user.create({
      data: {
        id: hackerUserId,
        supabase_id: hackerUserId,
        email: hackerEmail,
        name: "Tumbal Hacker",
      },
    });

    // 3. Login SEKALI SAJA untuk dapat Access Token User Utama
    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = loginResult.body.data.access_token;
  }, 20000);

  afterAll(async () => {
    // Bersihkan User di akhir file secara total (Prisma & Supabase)
    await prisma.user.deleteMany({
      where: { id: { in: [userId, hackerUserId] } },
    });
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (err) {}
    try {
      await supabase.auth.admin.deleteUser(hackerUserId);
    } catch (err) {}
  }, 20000);

  // =================================================================
  // ⚡ RESET LOKAL: Database Prisma Cepat Kilat (Tanpa Internet)
  // =================================================================
  beforeEach(async () => {
    // 1. Bersihkan sisa data test sebelumnya (Targeted Cleanup)
    await prisma.cancelReasonTemplate.deleteMany({
      where: { store: { user_id: { in: [userId, hackerUserId] } } },
    });
    await prisma.store.deleteMany({
      where: { user_id: { in: [userId, hackerUserId] } },
    });

    // 2. Buatkan Toko Utama
    const store = await prisma.store.create({
      data: { user_id: userId, name: "Toko Alasan", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // 3. Buatkan 2 Alasan untuk Toko Utama
    targetReasonId = uuidv4();
    await prisma.cancelReasonTemplate.createMany({
      data: [
        {
          id: targetReasonId,
          store_id: storeId,
          reason: "Stok produk sedang habis",
        }, // Ini yang bakal di-edit
        { store_id: storeId, reason: existingReasonText }, // Untuk ngetes error duplikasi (409)
      ],
    });

    // 4. Buatkan Toko & Alasan untuk Hacker (Simulasi IDOR)
    const hackerStore = await prisma.store.create({
      data: {
        user_id: hackerUserId,
        name: "Toko Hacker",
        timezone: "Asia/Jakarta",
      },
    });
    hackerStoreId = hackerStore.id;

    const hackerReason = await prisma.cancelReasonTemplate.create({
      data: { store_id: hackerStoreId, reason: "Alasan Rahasia Hacker" },
    });
    otherUserReasonId = hackerReason.id;
  });

  afterEach(async () => {
    // 5. Bersihkan data Toko & Alasan setiap selesai 1 test case
    await prisma.cancelReasonTemplate.deleteMany({
      where: { store: { user_id: { in: [userId, hackerUserId] } } },
    });
    await prisma.store.deleteMany({
      where: { user_id: { in: [userId, hackerUserId] } },
    });
  });

  // ====================== TEST CASES ====================== //

  test("1. Should update Cancel Reason successfully", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        reason: "Stok produk habis (Updated)",
      });

    expect(result.status).toBe(200);
    expect(result.body.data.id).toBe(targetReasonId);
    expect(result.body.data.reason).toBe("Stok produk habis (Updated)");

    // Buktikan di database datanya beneran berubah
    const inDb = await prisma.cancelReasonTemplate.findUnique({
      where: { id: targetReasonId },
    });
    expect(inDb.reason).toBe("Stok produk habis (Updated)");
  });

  test("2. Should return 409 if updating to a reason text that ALREADY EXISTS in this store", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        reason: existingReasonText, // 👈 Teks ini udah ada di alasan ke-2
      });

    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("already exists");
  });

  test("3. [SECURITY] Should return 404 when trying to update ANOTHER USER's cancel reason", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${otherUserReasonId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        reason: "Hacked by me",
      });

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe(
      "Reason template not found or you do not have access",
    );
  });

  test("4. Should return 404 if the Cancel Reason is already soft-deleted", async () => {
    // Hapus manual di database dulu
    await prisma.cancelReasonTemplate.update({
      where: { id: targetReasonId },
      data: { is_delete: true },
    });

    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        reason: "Mencoba edit yang sudah mati",
      });

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe(
      "Reason template not found or you do not have access",
    );
  });

  test("5. Should return 400 when reason string is empty", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        reason: "",
      });

    expect(result.status).toBe(400);
  });

  test("6. Should return 400 when reasonId is an invalid UUID", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/bukan-uuid-1234`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        reason: "Alasan Valid",
      });

    // Ditolak oleh Joi validation untuk req.params.reasonId
    expect(result.status).toBe(400);
  });
});
