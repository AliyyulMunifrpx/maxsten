import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
// Jangan lupa import prisma dan supabase
import { prisma } from "../../src/application/database.js";
import { supabase } from "../../src/application/supabase.js";

describe("logout user", () => {
  let cookies = [];
  let testEmail = "";
  let userId = "";

  beforeEach(async () => {
    // 1. Generate email unik untuk setiap tes
    testEmail = `logout_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Logout",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma supaya datanya sinkron
    await prisma.user.create({
      data: {
        id: userId, // Hapus baris ini jika Prisma pakai auto-generate ID (UUID/Autoincrement)
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Logout",
      },
    });

    // 4. Login untuk dapatkan tiket masuk (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    cookies = result.headers["set-cookie"];
  }, 20000);

  // Tambahkan afterEach untuk bersih-bersih data setelah test selesai
  afterEach(async () => {
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // Abaikan error saat cleanup, best-effort saja
      }
    }
  }, 20000);

  test("should can logout user successfully", async () => {
    // 2. Eksekusi logout bawa cookie
    const result = await supertest(web)
      .delete("/api/users/logout")
      .set("Cookie", cookies);

    console.log(result.body);
    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");
    expect(result.body.message).toBe("Logout successful");

    // Pastikan cookie access_token dibersihkan dari browser
    expect(result.headers["set-cookie"]).toBeDefined();
    expect(result.headers["set-cookie"][0]).toContain("access_token=;");
  }, 20000);

  test("should reject logout if unauthorized (no cookie)", async () => {
    // 3. Eksekusi logout TAPI sengaja nggak bawa cookie
    const result = await supertest(web).delete("/api/users/logout");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);
});
