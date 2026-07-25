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

  beforeEach(async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "aliyyulmunif780@gmail.com",
      password: "aliyyul",
    });

    cookies = result.headers["set-cookie"];
  });

  test("should successfully get user data with valid tokens", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", cookies);
    expect(result.status).toBe(200);
    expect(result.body.data.email).toBe("aliyyulmunif780@gmail.com");
    expect(result.body.data.name).toBe("aliyyul munif");
  });

  test("should reject with 401 if access token is invalid", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", "access_token=token akses salah banget");
    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  });

  test("should reject with 401 if both access and refresh tokens are invalid", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", [
        "access_token=token akses salah banget",
        "refresh_token= token refersh salah",
      ]);
    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Session Expired. Please login again.");
  });

  test("should successfully get user data using only a valid refresh token (auto-refresh session)", async () => {
    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", cookies[1]);
    expect(result.status).toBe(200);
    expect(result.body.data.email).toBe("aliyyulmunif780@gmail.com");
    expect(result.body.data.name).toBe("aliyyul munif");
  });

  test("should reject with 401 if user exists in Supabase Auth but missing in Prisma database", async () => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: "aliyyulmunifuy@gmail.com",
      password: "gemini",
    });

    const result = await supertest(web)
      .get("/api/users/me")
      .set("Cookie", `access_token=${authData.session.access_token}`);

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("User database mismatch");
  });
});
