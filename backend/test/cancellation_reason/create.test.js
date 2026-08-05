import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";

const ENDPOINT = "/api/seller/cancel-reasons";

describe("POST /api/seller/cancel-reasons", () => {
  let cookies = [];
  let testEmail = "";
  let userId = "";
  let storeId = null;

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `cancel_reason_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Cancel Reason" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Cancel Reason",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = loginResult.headers["set-cookie"];

    // 5. Buatkan Toko Aktif
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Toko Pembatalan",
        timezone: "Asia/Jakarta",
        is_delete: false,
      },
    });
    storeId = store.id;
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL BERDASARKAN ID TOKO (Bukan Delete All) ---
    if (storeId) {
      await prisma.cancelReasonTemplate.deleteMany({
        where: { store_id: storeId },
      });
      await prisma.store.deleteMany({
        where: { id: storeId },
      });
    }

    if (testEmail) {
      await prisma.user.deleteMany({
        where: { email: testEmail },
      });
    }

    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {}
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("1. Should create Cancel Reason successfully", async () => {
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        reason: "Stok produk sedang habis",
      });

    expect(result.status).toBe(201);
    expect(result.body.data.id).toBeDefined();
    expect(result.body.data.reason).toBe("Stok produk sedang habis");
    expect(result.body.data.created_at).toBeDefined();

    // Verifikasi ke DB
    const inDb = await prisma.cancelReasonTemplate.findUnique({
      where: { id: result.body.data.id },
    });
    expect(inDb).not.toBeNull();
    expect(inDb.is_delete).toBe(false); // Default harus false
  }, 20000);

  test("2. Should return 400 if reason is empty or missing", async () => {
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        // reason sengaja ga dikirim
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("3. Should return 400 if reason exceeds 255 characters", async () => {
    const longReason = "A".repeat(256); // Bikin string 256 karakter

    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        reason: longReason,
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain(
      "less than or equal to 255 characters",
    );
  }, 20000);

  test("4. Should return 401 when unauthorized (no cookie)", async () => {
    const result = await supertest(web).post(ENDPOINT).send({
      reason: "Toko sedang sibuk",
    });

    expect(result.status).toBe(401);
  }, 20000);

  test("5. Should return 409 if reason ALREADY EXISTS (Trigger P2002)", async () => {
    // Insert pertama (Berhasil)
    await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({ reason: "Toko tutup sementara" });

    // Insert kedua dengan teks yang sama persis (Harus gagal)
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({ reason: "Toko tutup sementara" });

    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("already exists");
  }, 20000);

  test("6. [CRUCIAL] Should ALLOW creating reason with the same text IF the old one is soft-deleted", async () => {
    // 1. Buat alasan manual di DB dan set is_delete: true
    await prisma.cancelReasonTemplate.create({
      data: {
        store_id: storeId,
        reason: "Bahan baku habis",
        is_delete: true, // 👈 Anggap udah dihapus sama user
      },
    });

    // 2. Tembak API buat bikin alasan dengan TEKS YANG SAMA PERSIS
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        reason: "Bahan baku habis",
      });

    // 3. Harus berhasil karena Partial Unique Index (WHERE is_delete = false) mengizinkannya
    expect(result.status).toBe(201);
    expect(result.body.data.reason).toBe("Bahan baku habis");
  }, 20000);

  test("7. Should return 404 if User does NOT have an active store", async () => {
    // Hapus toko si user
    await prisma.store.update({
      where: { id: storeId },
      data: { is_delete: true }, // Soft delete tokonya
    });

    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        reason: "Alasan untuk toko hantu",
      });

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Store not found");
  }, 20000);
});
