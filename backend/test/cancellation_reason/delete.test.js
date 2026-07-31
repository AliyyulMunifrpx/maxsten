import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";

const LOGIN_EMAIL = "test_delete_reason@gmail.com";
const LOGIN_PASSWORD = "password123";
const ENDPOINT_PREFIX = "/api/seller/cancel-reasons";

describe("DELETE /api/seller/cancel-reasons/:reasonId", () => {
  let cookies = [];
  let userId = "";
  let storeId = null;

  let targetReasonId = "";
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
      name: "User Delete Reason",
      password: LOGIN_PASSWORD,
    });

    const loginResult = await supertest(web).post("/api/users/login").send({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });
    cookies = loginResult.headers["set-cookie"];
    const user = await prisma.user.findUnique({ where: { email: LOGIN_EMAIL } });
    userId = user.id;

    // 3. Buatkan Toko Aktif
    const store = await prisma.store.create({
      data: { user_id: userId, name: "Toko Alasan Hapus", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // 4. Bikin Alasan Target Delete
    targetReasonId = uuidv4();
    await prisma.cancelReasonTemplate.create({
      data: {
        id: targetReasonId,
        store_id: storeId,
        reason: "Stok produk sedang habis", 
      },
    });

    // 5. Bikin data hacker buat tes IDOR (Mastiin user ga bisa hapus data toko lain)
    const hacker = await prisma.user.create({
      data: { email: "hacker@gmail.com", name: "Hacker", supabase_id: uuidv4() }
    });
    const hackerStore = await prisma.store.create({
      data: { user_id: hacker.id, name: "Toko Hacker", timezone: "Asia/Jakarta" }
    });
    const hackerReason = await prisma.cancelReasonTemplate.create({
      data: { store_id: hackerStore.id, reason: "Alasan Rahasia Hacker" }
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
  });

  test("2. [SECURITY] Should return 404 when trying to delete ANOTHER USER's cancel reason", async () => {
    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/${otherUserReasonId}`)
      .set("Cookie", cookies);

    // Harus 404 karena `where: { store_id: store.id }` di findFirst bakal gagal
    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Cancellation reason template not found");
  });

  test("3. Should return 404 if the Cancel Reason is already soft-deleted", async () => {
    // Simulasi datanya udah dihapus duluan di database
    await prisma.cancelReasonTemplate.update({
      where: { id: targetReasonId },
      data: { is_delete: true }
    });

    // Coba hapus lagi lewat API (Double delete)
    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Cancellation reason template not found");
  });

  test("4. Should return 404 if User's store is deleted / not found", async () => {
    // Soft-delete toko milik user
    await prisma.store.update({
      where: { id: storeId },
      data: { is_delete: true }
    });

    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/${targetReasonId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Store not found");
  });

  test("5. Should return 400 when reasonId is an invalid UUID", async () => {
    const result = await supertest(web)
      .delete(`${ENDPOINT_PREFIX}/bukan-uuid-1234`)
      .set("Cookie", cookies);

    // Ditolak oleh Joi validation `id: Joi.string().uuid().required()`
    expect(result.status).toBe(400);
  });

  test("6. Should return 401 when unauthorized (no cookie)", async () => {
    const result = await supertest(web).delete(`${ENDPOINT_PREFIX}/${targetReasonId}`);

    expect(result.status).toBe(401);
  });
});