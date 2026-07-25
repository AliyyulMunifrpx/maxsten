import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

describe("update user", () => {
  let cookies = [];

  beforeEach(async () => {
    // Login untuk dapet tiket masuk (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "aliyyulmunif780@gmail.com",
      password: "aliyyul",
    });

    cookies = result.headers["set-cookie"];
  });

  afterEach(async () => {
    // Balikin nama ke semula biar gak ngotorin data buat test berikutnya
    await supertest(web)
      .patch("/api/users/update")
      .send({
        name: "aliyyul munif",
      })
      .set("Cookie", cookies);
  });

  // 1. Test Skenario Sukses (Udah lu buat)
  test("should can update user successfully", async () => {
    const result = await supertest(web)
      .patch("/api/users/update")
      .send({
        name: "aliyyul baru",
      })
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("aliyyul baru");
  });

  // 2. Test Skenario Gagal - Tipe Data Salah (Udah lu buat)
  test("should reject update if name is not a string", async () => {
    const result = await supertest(web)
      .patch("/api/users/update")
      .send({
        name: 12345, // sengaja dikasih angka
      })
      .set("Cookie", cookies);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe('"name" must be a string');
  });

  // 3. TAMBAHAN: Test Skenario Gagal - Request Kosong
  test("should reject update if request body is empty", async () => {
    const result = await supertest(web)
      .patch("/api/users/update")
      .send({}) // Sengaja gak ngirim atribut 'name'
      .set("Cookie", cookies);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe('"name" is required'); // Sesuaikan pesan ini dengan Joi message lu
  });

  // 4. TAMBAHAN: Test Skenario Gagal - Tidak Bawa Cookie (Unauthorized)
  test("should reject update if unauthorized (no cookie)", async () => {
    const result = await supertest(web).patch("/api/users/update").send({
      name: "hacker mencoba update",
    });
    // Sengaja HAPUS .set("Cookie", cookies) di sini

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  });
});
