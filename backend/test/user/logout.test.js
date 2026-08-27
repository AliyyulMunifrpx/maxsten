import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { prisma } from "../../src/application/database.js";
import { supabase } from "../../src/application/supabase.js";

describe("logout user", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
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
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Logout",
      },
    });

    // 4. Login untuk dapatkan Access Token
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
        // Abaikan error saat cleanup, best-effort saja
      }
    }
  }, 20000);

  test("should can logout user successfully", async () => {
    // Eksekusi logout bawa Bearer Token
    const result = await supertest(web)
      .delete("/api/users/logout")
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`);

    console.log(result.body);
    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");
    expect(result.body.message).toBe("Logout successful");
  }, 20000);

  test("should reject logout if unauthorized (no token)", async () => {
    // Eksekusi logout TAPI sengaja nggak bawa token
    const result = await supertest(web).delete("/api/users/logout");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);
});
