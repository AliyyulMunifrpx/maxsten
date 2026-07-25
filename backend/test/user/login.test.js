import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { logger } from "../../src/application/logging.js";

describe("login", () => {
  test("should successfully login with valid credentials", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "aliyyulmunif780@gmail.com",
      password: "aliyyul",
    });
    expect(result.status).toBe(200);
    expect(result.body.data.email).toBe("aliyyulmunif780@gmail.com");
    expect(result.body.data.name).toBe("aliyyul munif");
  });

  test("should reject login with incorrect password", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "aliyyulmunif780@gmail.com",
      password: "inisalah",
    });
    expect(result.status).toBe(401);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe("Invalid login credentials");
  });

  test("should reject login with unregistered email", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "inisalah@gmail.com",
      password: "aliyyul",
    });
    expect(result.status).toBe(401);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe("Invalid login credentials");
  });

  test("should reject login with invalid email format", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "salahformat.com",
      password: "aliyyul",
    });
    expect(result.status).toBe(400);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe('"email" must be a valid email');
  });

  test("should reject login with invalid password data type", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "aliyyulmunif780@gmail.com",
      password: 1234,
    });
    expect(result.status).toBe(400);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe('"password" must be a string');
  });

  test("should return 404 when user exists in Supabase Auth but missing in Prisma DB", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "aliyyulmunifuy@gmail.com",
      password: "gemini",
    });
    expect(result.status).toBe(404);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe("User not found");
  });
});
