import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { logger } from "../../src/application/logging.js";
import { access } from "node:fs";
import user_service from "../../src/service/user_service.js";
import { ResponseError } from "../../src/error/response_error.js";
import { supabase } from "../../src/application/supabase.js";

describe("get user profile", () => {
  let cookies = [];
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
        id: userId, // Hapus baris ini kalau Prisma ID pakai autoincrement/uuid default
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Get Profile",
      },
    });

    // 4. Login untuk dapatkan cookies (Access & Refresh token)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    cookies = result.headers["set-cookie"];
  }, 20000);

  test("should successfully get user data with valid tokens", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    // Assertion diubah menyesuaikan data dinamis yang baru dibuat
    expect(result.body.data.email).toBe(testEmail);
    expect(result.body.data.name).toBe("Tumbal Get Profile");
  }, 20000);

  test("should reject with 401 if access token is invalid", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", "access_token=token akses salah banget");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);

  test("should reject with 401 if both access and refresh tokens are invalid", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", [
        "access_token=token akses salah banget",
        "refresh_token= token refersh salah",
      ]);

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Session Expired. Please login again.");
  }, 20000);

  test("should successfully get user data using only a valid refresh token (auto-refresh session)", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", cookies[1]); // Asumsi index [1] adalah refresh_token dari login

    expect(result.status).toBe(200);
    expect(result.body.data.email).toBe(testEmail);
    expect(result.body.data.name).toBe("Tumbal Get Profile");
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

    // 4. Hit endpoint get profile
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", `access_token=${authData.session.access_token}`);

    // 5. Pastikan ditolak dengan pesan yang sesuai
    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("User database mismatch");
  }, 20000);
});
