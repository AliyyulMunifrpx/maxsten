import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, describe, expect, test } from "vitest";

describe("register", () => {
  const testEmail = "aliyyulmunif780@gmail.com";

  // test("should can register new user", async () => {
  //   const result = await supertest(web).post("/api/users").send({
  //     email: testEmail,
  //     password: "aliyyul",
  //     name: "aliyyul munif",
  //   });
  //   console.log(result.body);
  //   expect(result.status).toBe(201);
  //   expect(result.body.data.email).toBe(testEmail);
  //   expect(result.body.data.name).toBe("aliyyul munif");
  // });

  test("should reject duplicate email", async () => {
    // Register pertama
    await supertest(web).post("/api/users").send({
      email: testEmail,
      password: "aliyyul",
      name: "aliyyul munif",
    });

    // Register kedua, email sama
    const result = await supertest(web).post("/api/users").send({
      email: testEmail,
      password: "aliyyul",
      name: "aliyyul munif Lagi",
    });

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe("That email address already exists");
  });

  test("should reject invalid email format", async () => {
    const result = await supertest(web).post("/api/users").send({
      email: "bukan-email",
      password: "aliyyul",
      name: "aliyyul munif",
    });

    expect(result.status).toBe(400);
  });
});
