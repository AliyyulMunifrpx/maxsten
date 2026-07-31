import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";

const LOGIN_EMAIL = "test_update_reason@gmail.com";
const LOGIN_PASSWORD = "password123";
const ENDPOINT_PREFIX = "/api/seller/cancel-reasons";

describe("PATCH /api/seller/cancel-reasons/:reasonId", () => {
  let cookies = [];
  let userId = "";
  let storeId = null;

  let targetReasonId = "";
  let existingReasonText = "Pelanggan tidak bisa dihubungi";
  let otherUserReasonId = "";

  beforeEach(async () => {
    // 1. Bersihkan database
    await prisma.cancelReasonTemplate.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "hacker@gmail.com" } });

    // 2. Register dan Login
    await supertest(web).post("/api/users").send({
      email: LOGIN_EMAIL,
      name: "User Update Reason",
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

    // 3. Buatkan Toko Aktif
    const store = await prisma.store.create({
      data: { user_id: userId, name: "Toko Alasan", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // 4. Bikin Alasan Target Edit
    targetReasonId = uuidv4();
    await prisma.cancelReasonTemplate.create({
      data: {
        id: targetReasonId,
        store_id: storeId,
        reason: "Stok produk sedang habis", // Ini yang bakal di-edit
      },
    });

    // 5. Bikin Alasan Kedua (Untuk ngetes error duplikasi nama 409)
    await prisma.cancelReasonTemplate.create({
      data: {
        store_id: storeId,
        reason: existingReasonText,
      },
    });

    // 6. Bikin data hacker buat tes IDOR (Mastiin user ga bisa edit data toko lain)
    const hacker = await prisma.user.create({
      data: {
        email: "hacker@gmail.com",
        name: "Hacker",
        supabase_id: uuidv4(),
      },
    });
    const hackerStore = await prisma.store.create({
      data: {
        user_id: hacker.id,
        name: "Toko Hacker",
        timezone: "Asia/Jakarta",
      },
    });
    const hackerReason = await prisma.cancelReasonTemplate.create({
      data: { store_id: hackerStore.id, reason: "Alasan Rahasia Hacker" },
    });
    otherUserReasonId = hackerReason.id;
  }, 20000);

  afterEach(async () => {
    await prisma.cancelReasonTemplate.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "hacker@gmail.com" } });
  });

  // ====================== TEST CASES ====================== //

  test("1. Should update Cancel Reason successfully", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Cookie", cookies)
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
      .set("Cookie", cookies)
      .send({
        reason: existingReasonText, // 👈 Teks ini udah ada di alasan ke-2
      });

    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("already exists");
  });

  test("3. [SECURITY] Should return 404 when trying to update ANOTHER USER's cancel reason", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${otherUserReasonId}`)
      .set("Cookie", cookies)
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
      .set("Cookie", cookies)
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
      .set("Cookie", cookies)
      .send({
        reason: "",
      });

    expect(result.status).toBe(400);
  });

  test("6. Should return 400 when reasonId is an invalid UUID", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/bukan-uuid-1234`)
      .set("Cookie", cookies)
      .send({
        reason: "Alasan Valid",
      });

    // Ditolak oleh Joi validation untuk req.params.reasonId
    expect(result.status).toBe(400);
  });
});
