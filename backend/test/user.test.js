import supertest from "supertest";
import { web } from "../src/application/web.js";
import { prisma } from "../src/application/database.js";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { logger } from "../src/application/logging.js";
import { addTestUser, getTestUser, removeTestUser } from "./test_utils.js";
import bcrypt from "bcrypt";
describe("POST /api/users", () => {
  afterEach(async () => {
    await removeTestUser();
  });
  test("should can register new user", async () => {
    const result = await supertest(web).post(`/api/users`).send({
      username: "test",
      password: "rahasia",
      name: "test",
    });
 console.log(result.body)
    expect(result.status).toBe(200);
    expect(result.body.data.username).toBe("test");
    expect(result.body.data.password).toBeUndefined();
    expect(result.body.data.name).toBe(`test`);
  });
  test("should reject if request is invalid", async () => {
    const result = await supertest(web).post(`/api/users`).send({
      username: "",
      password: "",
      name: "test",
    });

    expect(result.status).toBe(400);
    logger.info(result.body.errors);
    expect(result.body.errors).toBeDefined();
  });
  test("should reject duplicate new user", async () => {
    let result = await supertest(web).post(`/api/users`).send({
      username: "test",
      password: "rahasia",
      name: "test",
    });

    expect(result.status).toBe(200);
    expect(result.body.data.username).toBe("test");
    expect(result.body.data.password).toBeUndefined();
    expect(result.body.data.name).toBe(`test`);

    result = await supertest(web).post(`/api/users`).send({
      username: "test",
      password: "rahasia",
      name: "test",
    });

    expect(result.status).toBe(400);
  });
});

describe("POST api/users/login", () => {
  beforeEach(async () => {
    await addTestUser();
  });
  afterEach(async () => {
    await removeTestUser();
  });
  test("should can login", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      username: "test",
      password: "rahasia",
    });

    expect(result.status).toBe(200);
    expect(result.body.data.token).toBeDefined();
    expect(result.body.data.token).not.toBe("test");
  });
  test("should reject login if request is invalid", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      username: "",
      password: "",
    });
    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });
  test("should reject login if username is wrong", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      username: "sdfdsf",
      password: "rahasia",
    });
    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
  test("should reject login if password is wrong", async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      username: "test",
      password: "salah",
    });
    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});
describe("GET api/users/current", () => {
  beforeEach(async () => {
    await addTestUser();
  });
  afterEach(async () => {
    await removeTestUser();
  });
  test("should can get current user", async () => {
    const token = "test";
    const result = await supertest(web)
      .get(`/api/users/current`)
      .set("Cookie", [`token=${token}`]);
    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("test");
  });
  test("should reject get current user because token is invalid", async () => {
    const token = "test";
    const result = await supertest(web)
      .get(`/api/users/current`)
      .set("Cookie", [`token=salah`]);
    expect(result.status).toBe(401);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBeDefined();
  });
  test("should reject get current user because token is invalid", async () => {
    const token = "test";
    const result = await supertest(web)
      .get(`/api/users/current`)
      .set("Cookie", [`token=`]);
    expect(result.status).toBe(401);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBeDefined();
  });
});
describe("PATCH api/users/current", () => {
  beforeEach(async () => {
    await addTestUser();
  });
  afterEach(async () => {
    await removeTestUser();
  });
  test("should can update current user", async () => {
    const token = "test";
    const result = await supertest(web)
      .patch(`/api/users/current`)
      .set("Cookie", [`token=${token}`])
      .send({
        name: "hehehehe",
        password: "rahasia banget",
      });
    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("hehehehe");
    expect(result.body.data.username).toBe("test");
    const user = await getTestUser();
    expect(await bcrypt.compare("rahasia banget", user.password)).toBe(true);
  });
  test("should can update current user password only", async () => {
    const token = "test";
    const result = await supertest(web)
      .patch(`/api/users/current`)
      .set("Cookie", [`token=${token}`])
      .send({
        password: "rahasia banget",
      });
    expect(result.status).toBe(200);

    expect(result.body.data.username).toBe("test");
    const user = await getTestUser();
    expect(await bcrypt.compare("rahasia banget", user.password)).toBe(true);
  });
  test("should can update current user name only", async () => {
    const token = "test";
    const result = await supertest(web)
      .patch(`/api/users/current`)
      .set("Cookie", [`token=${token}`])
      .send({
        name: "hehehehe",
      });
    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("hehehehe");
    expect(result.body.data.username).toBe("test");
  });
  test("should reject if token is invalid", async () => {
    const result = await supertest(web)
      .patch(`/api/users/current`)
      .set("Cookie", [`token=salah`])
      .send({
        name: "hehehehe",
      });

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});
describe("DELETE /api/users/logout", function () {
  beforeEach(async () => {
    await addTestUser();
  });

  afterEach(async () => {
    await removeTestUser();
  });

  it("should can logout", async () => {
    const result = await supertest(web)
      .delete("/api/users/logout")
      .set("Cookie", [`token=test`]);
    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");

    const user = await getTestUser();
    expect(user.token).toBeNull();
  });
  it("should can reject logout if the token is invalid", async () => {
    const result = await supertest(web)
      .delete("/api/users/logout")
      .set("Cookie", [`token=salah`]);
    expect(result.status).toBe(401);
    expect(result.body.data).toBeUndefined();

    const user = await getTestUser();
    expect(user.token).toBeDefined();
  });
});

describe("POST /api/users/forgot-password", () => {
  beforeEach(async () => {
    // Siapkan user 'test' sebelum mencoba lupa password
    await addTestUser();
  });

  afterEach(async () => {
    // Bersihkan database setelah selesai
    await removeTestUser();
  });

  test("should can request otp for forgot password", async () => {
    await supertest(web).post("/api/users/forgot-password").send({
      username: "test",
    });

    const userWithOtp = await getTestUser();
    const secretOtp = userWithOtp.otp;
    const result = await supertest(web).post(`/api/users/verify-otp`).send({
      username: "test",
      otp: secretOtp,
    });
    console.log(result.body);
    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OTP is valid");
    // Kamu juga bisa lihat hasil console.log dari service kamu di terminal nanti
  });
  test("should can reject verify if otp is invalid", async () => {
    await supertest(web).post("/api/users/forgot-password").send({
      username: "test",
    });

    const userWithOtp = await getTestUser();
    const secretOtp = userWithOtp.otp;

    const result = await supertest(web).post(`/api/users/verify-otp`).send({
      username: "test",
      otp: "000000",
    });

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe("invalid otp code");
    // Kamu juga bisa lihat hasil console.log dari service kamu di terminal nanti
  });
  test("should can reject verify if user is invalid", async () => {
    await supertest(web).post("/api/users/forgot-password").send({
      username: "test",
    });

    const userWithOtp = await getTestUser();
    const secretOtp = userWithOtp.otp;

    const result = await supertest(web).post(`/api/users/verify-otp`).send({
      username: "hehe",
      otp: secretOtp,
    });

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("user is not found");
    // Kamu juga bisa lihat hasil console.log dari service kamu di terminal nanti
  });

  test("should reject if username is not found", async () => {
    const result = await supertest(web)
      .post("/api/users/forgot-password")
      .send({
        username: "salah", // Username ngarang
      });

    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
  });
});
