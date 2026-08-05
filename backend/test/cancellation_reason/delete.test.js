import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";

const ENDPOINT_PREFIX = "/api/seller/cancel-reasons";

describe("DELETE /api/seller/cancel-reasons/:reasonId", () => {
  let cookies = [];

  // User Utama
  let testEmail = "";
  let userId = "";
  let storeId = null;
  let targetReasonId = "";

  // User Hacker (Simulasi Cross-Tenant)
  let hackerEmail = "";
  let hackerUserId = "";
  let hackerStoreId = null;
  let otherUserReasonId = "";

  beforeEach(async () => {
    // ==========================================
    // 1. SETUP USER UTAMA (SELLER)
    // ==========================================
    testEmail = `delete_reason_${Date.now()}@gmail.com`;

    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Delete Reason" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Delete Reason",
      },
    });

    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = loginResult.headers["set-cookie"];

    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Toko Alasan Hapus",
        timezone: "Asia/Jakarta",
      },
    });
    storeId = store.id;

    targetReasonId = uuidv4();
    await prisma.cancelReasonTemplate.create({
      data: {
        id: targetReasonId,
        store_id: storeId,
        reason: "Stok produk sedang habis",
      },
    });

    // ==========================================
    // 2. SETUP USER HACKER (CROSS-TENANT)
    // ==========================================
    hackerEmail = `hacker_${Date.now()}@gmail.com`;

    const { data: hackerAuthData, error: hackerError } =
      await supabase.auth.admin.createUser({
        email: hackerEmail,
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Tumbal Hacker" },
      });
    if (hackerError)
      throw new Error(`Supabase Admin Error (Hacker): ${hackerError.message}`);
    hackerUserId = hackerAuthData.user.id;

    await prisma.user.create({
      data: {
        id: hackerUserId,
        supabase_id: hackerUserId,
        email: hackerEmail,
        name: "Tumbal Hacker",
      },
    });

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
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL BERDASARKAN ID (Bukan Delete All) ---
    const activeStoreIds = [storeId, hackerStoreId].filter(Boolean);

    if (activeStoreIds.length > 0) {
      await prisma.cancelReasonTemplate.deleteMany({
        where: { store_id: { in: activeStoreIds } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: activeStoreIds } },
      });
    }

    const activeEmails = [testEmail, hackerEmail].filter(Boolean);
    if (activeEmails.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: activeEmails } },
      });
    }

    const activeUserIds = [userId, hackerUserId].filter(Boolean);
    for (const uid of activeUserIds) {
      try {
        await supabase.auth.admin.deleteUser(uid);
      } catch (err) {}
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("1. Should successfully soft-delete the Cancel Reason", async () => {
    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");

    // Buktikan di database datanya beneran berubah jadi is_delete: true
    const inDb = await prisma.cancelReasonTemplate.findUnique({
      where: { id: targetReasonId },
    });
    expect(inDb.is_delete).toBe(true);
  }, 20000);

  test("2. [SECURITY] Should return 404 when trying to delete ANOTHER USER's cancel reason", async () => {
    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/${otherUserReasonId}`)
      .set("Cookie", cookies);

    // Harus 404 karena `where: { store_id: store.id }` di findFirst bakal gagal
    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Cancellation reason template not found");
  }, 20000);

  test("3. Should return 404 if the Cancel Reason is already soft-deleted", async () => {
    // Simulasi datanya udah dihapus duluan di database
    await prisma.cancelReasonTemplate.update({
      where: { id: targetReasonId },
      data: { is_delete: true },
    });

    // Coba hapus lagi lewat API (Double delete)
    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Cancellation reason template not found");
  }, 20000);

  test("4. Should return 404 if User's store is deleted / not found", async () => {
    // Soft-delete toko milik user
    await prisma.store.update({
      where: { id: storeId },
      data: { is_delete: true },
    });

    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Store not found");
  }, 20000);

  test("5. Should return 400 when reasonId is an invalid UUID", async () => {
    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/bukan-uuid-1234`)
      .set("Cookie", cookies);

    // Ditolak oleh Joi validation `id: Joi.string().uuid().required()`
    expect(result.status).toBe(400);
  }, 20000);

  test("6. Should return 401 when unauthorized (no cookie)", async () => {
    const result = await supertest(web).delete(
      `${ENDPOINT_PREFIX}/${targetReasonId}`,
    );

    expect(result.status).toBe(401);
  }, 20000);
});
