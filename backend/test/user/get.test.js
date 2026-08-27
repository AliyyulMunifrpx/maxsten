import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { supabase } from "../../src/application/supabase.js";

describe("get user profile", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";

  beforeEach(async () => {
    // 1. Generate email unik untuk setiap tes
    testEmail = `get_profile_${Date.now()}@gmail.com`;

    // 2. Buat user via Supabase Admin (Auto confirmed)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Get Profile",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject ke Prisma (agar data matching)
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Get Profile",
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
      } catch (err) {}
    }
  }, 20000);

  test("should successfully get user data with valid token", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.email).toBe(testEmail);
    expect(result.body.data.name).toBe("Tumbal Get Profile");
  }, 20000);

  test("should reject with 401 if access token is invalid", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Authorization", "Bearer token_salah_banget");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);

  test("should reject with 401 if access token is missing", async () => {
    const result = await supertest(web).get("/api/users/me");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);

  test("should reject with 401 if user exists in Supabase Auth but missing in Prisma database", async () => {
    // 1. Buat email khusus untuk testing mismatch ini
    const mismatchEmail = `mismatch_${Date.now()}@gmail.com`;

    // 2. Buat user di Supabase Auth SAJA (Sengaja TIDAK di-insert ke Prisma)
    const { data: authAdminData, error: adminError } =
      await supabase.auth.admin.createUser({
        email: mismatchEmail,
        password: "password123",
        email_confirm: true,
      });

    if (adminError)
      throw new Error(`Supabase Admin Error: ${adminError.message}`);

    // 3. Sign in untuk mendapatkan access_token aslinya
    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: mismatchEmail,
        password: "password123",
      });

    if (signInError) throw new Error(`Sign In Error: ${signInError.message}`);

    // 4. Hit endpoint get profile dengan Bearer Token
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${authData.session.access_token}`);

    // 5. Pastikan ditolak dengan pesan yang sesuai
    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("User database mismatch");

    // Cleanup mismatch user from Supabase
    try {
      await supabase.auth.admin.deleteUser(authData.user.id);
    } catch (err) {}
  }, 20000);
});
