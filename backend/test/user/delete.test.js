import supertest from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";
// 1. Import supabase admin sesuai permintaan
import { supabase } from "../../src/application/supabase.js";

describe("delete user", () => {
  let cookies = [];
  let testEmail = "";
  let userId = "";

  beforeEach(async () => {
    // 1. Bikin email unik setiap kali test jalan
    testEmail = `tumbal_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass kirim email & langsung verified)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Delete",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    // Ambil User ID langsung dari response Supabase Auth
    userId = authData.user.id;

    // 3. Inject data ke Prisma (Memasukkan supabase_id yang diminta)
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId, // Field yang tadi kurang
        email: testEmail,
        name: "Tumbal Delete",
      },
    });

    // 4. Langsung Login!
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    cookies = result.headers["set-cookie"];
  }, 20000);
  test("should reject delete if unauthorized (no cookie)", async () => {
    // Eksekusi delete TAPI sengaja nggak bawa cookie
    const result = await supertest(web).delete("/api/users/me");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("should can delete user successfully", async () => {
    // 1. Eksekusi delete bawa cookie akun tumbal
    const result = await supertest(web)
      .delete("/api/users/me")
      .set("Cookie", cookies);
    console.log("DELETE ACCOUNT RESULT:", result.body);

    // 2. Pastikan respon dari API bener (200 OK)
    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");
    expect(result.body.message).toBe("Account permanently deleted");

    // 3. Pastikan cookie dibuang (otomatis logout)
    expect(result.headers["set-cookie"]).toBeDefined();
    expect(result.headers["set-cookie"][0]).toContain("access_token=;");

    // 4. PEMBUKTIAN TERAKHIR: Cek ke Prisma, pastikan datanya beneran musnah
    const userInDb = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    expect(userInDb).toBeNull(); // Harus null karena udah lenyap
  }, 20000);

  test("should soft-delete (is_delete: true) store when user deletes account", async () => {
    // 1. Buat store baru khusus untuk user tumbal ini
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Warung Tumbal Delete",
        timezone: "Asia/Jakarta",
        payment_timeout: 30, // Field default, tapi sekalian aja
      },
    });

    // 2. Jalankan request delete account dengan cookie tumbal
    const result = await supertest(web)
      .delete("/api/users/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(200);

    // 3. PEMBUKTIAN: Cek tabel Store di DB, pastikan store-nya is_delete jadi true
    const storeInDb = await prisma.store.findUnique({
      where: { id: store.id },
    });

    // Store harusnya masih ada (karena cuma soft-delete), tapi is_delete = true
    expect(storeInDb).not.toBeNull();
    expect(storeInDb.is_delete).toBe(true);
  }, 20000);

  test("should REJECT delete account (409) if store still has active queues", async () => {
    // 1. Buat store untuk user tumbal
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Warung Rame",
        timezone: "Asia/Jakarta",
      },
    });

    // 2. Buat Guest Dummy (Wajib ada di schema sebelum bikin Queue)
    const guest = await prisma.guest.create({
      data: {
        id: uuidv4(), // Buat UUID baru untuk guest
      },
    });

    // 3. Buat antrean aktif di toko ini (Sesuai dengan constraint Schema lu)
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1); // Expired 1 jam lagi

    await prisma.queue.create({
      data: {
        store_id: store.id,
        guest_id: guest.id, // Ambil dari Guest yang baru dibuat
        queue_number: 1, // Wajib di schema lu
        expired_at: futureDate, // Wajib di schema lu
        status: "DIPROSES", // Enum dari Prisma
        total_price: 50000,
      },
    });

    // 4. User coba hapus akun (Mau kabur pas toko lagi ada pelanggan)
    const result = await supertest(web)
      .delete("/api/users/me")
      .set("Cookie", cookies);

    // 5. Pastikan DITOLAK oleh sistem (409 Conflict)
    expect(result.status).toBe(409);
    expect(result.body.errors).toContain(
      "You cannot delete your account because your store still has active customer queues.",
    );

    // 6. PEMBUKTIAN: Pastikan User dan Toko TIDAK terhapus sama sekali (Data aman)
    const userInDb = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    const storeInDb = await prisma.store.findUnique({
      where: { id: store.id },
    });

    expect(userInDb).not.toBeNull();
    expect(storeInDb.is_delete).toBe(false); // Toko tetap aktif
  }, 20000);
});
