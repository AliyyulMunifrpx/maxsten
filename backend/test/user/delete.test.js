import supertest from "supertest";
import { beforeEach, describe, expect } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";

describe("delete user", () => {
  let cookies = [];
  let testEmail = "";

  beforeEach(async () => {
    // 1. Kita bikin email unik setiap kali test jalan (pakai Date.now)
    // Biar gak bentrok dan gak ngehapus akun utama lu
    testEmail = `tumbal_${Date.now()}@gmail.com`;

    // 2. Register akun tumbal
    await supertest(web).post("/api/users").send({
      email: testEmail,
      name: "Tumbal Delete",
      password: "password123",
    });

    // 3. Login pakai akun tumbal buat dapet karcis (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    cookies = result.headers["set-cookie"];
  }, 20000); // Kasih timeout 20 detik karena ini nembak Supabase 2x (Register + Login)

  test("should reject delete if unauthorized (no cookie)", async () => {
    // Eksekusi delete TAPI sengaja nggak bawa cookie
    const result = await supertest(web).delete("/api/users/delete");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);

  test("should can delete user successfully", async () => {
    // 1. Eksekusi delete bawa cookie akun tumbal
    const result = await supertest(web)
      .delete("/api/users/delete")
      .set("Cookie", cookies);

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

    expect(userInDb).toBeNull(); // Harus null karena udah lenyap dari database
  }, 20000);
  test("should set user_id to null in store table when user deletes account", async () => {
    // 1. Buat store baru khusus untuk user tumbal ini
    const store = await prisma.store.create({
      data: {
        user_id: (await prisma.user.findUnique({ where: { email: testEmail } }))
          .id,
        name: "Warung Tumbal Delete",
        description: "Akan kehilangan pemilik",
        timezone: "Asia/Jakarta",
        street_address: "Jl. Test No. 1",
        village: "Test",
        district: "Test",
        city: "TEST CITY",
        province: "TEST PROVINCE",
        postal_code: "12345",
        latitude: 0,
        longitude: 0,
      },
    });

    // 2. Jalankan request delete account dengan cookie tumbal
    const result = await supertest(web)
      .delete("/api/users/delete")
      .set("Cookie", cookies);

    expect(result.status).toBe(200);

    // 3. PEMBUKTIAN: Cek tabel Store di DB, pastikan store-nya masih ada TAPI user_id nya jadi NULL
    const storeInDb = await prisma.store.findUnique({
      where: { id: store.id }, // atau pakai public_id/id sesuai schema kamu
    });

    expect(storeInDb).not.toBeNull(); // Store-nya tidak hilang
    expect(storeInDb.user_id).toBeNull(); // user_id nya berubah jadi null!
  }, 20000);
});
