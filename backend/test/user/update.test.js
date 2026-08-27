import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { supabase } from "../../src/application/supabase.js"; // Import supabase admin
import { afterEach, beforeEach, describe, expect, test } from "vitest";

describe("update user", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";

  beforeEach(async () => {
    // 1. Bikin email dinamis untuk tiap test
    testEmail = `update_${Date.now()}@gmail.com`;

    // 2. Buat user tumbal di Supabase Auth (Auto confirmed)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Nama Original",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject user tumbal ke Prisma DB
    await prisma.user.create({
      data: {
        id: userId, // Hapus baris ini kalau Prisma ID pakai autoincrement/uuid default
        supabase_id: userId,
        email: testEmail,
        name: "Nama Original",
      },
    });

    // 4. Login untuk dapet Access Token
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = result.body.data.access_token;
  }, 20000);

  afterEach(async () => {
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

  // 1. Test Skenario Sukses
  test("should can update user successfully", async () => {
    const result = await supertest(web)
      .patch("/api/users/me")
      .send({
        name: "Nama Diupdate",
      })
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("Nama Diupdate");

    // Buktikan juga perubahannya masuk ke database Prisma
    const updatedUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(updatedUser.name).toBe("Nama Diupdate");
  }, 20000);

  // 2. Test Skenario Gagal - Tipe Data Salah
  test("should reject update if name is not a string", async () => {
    const result = await supertest(web)
      .patch("/api/users/me")
      .send({
        name: 12345, // sengaja dikasih angka
      })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe('"name" must be a string');
  }, 20000);

  // 3. TAMBAHAN: Test Skenario Gagal - Request Kosong
  test("should reject update if request body is empty", async () => {
    const result = await supertest(web)
      .patch("/api/users/me")
      .send({}) // Sengaja gak ngirim atribut 'name'
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe('"name" is required'); // Pastikan ini sesuai dengan validasi Joi milikmu
  }, 20000);

  // 4. TAMBAHAN: Test Skenario Gagal - Tidak Bawa Token (Unauthorized)
  test("should reject update if unauthorized (no token)", async () => {
    const result = await supertest(web).patch("/api/users/me").send({
      name: "hacker mencoba update",
    });
    // Sengaja TIDAK ADA .set("Authorization", ...) di sini

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized"); // Pesan middleware auth lu
  }, 20000);
});
