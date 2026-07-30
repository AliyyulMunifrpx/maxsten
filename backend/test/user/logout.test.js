import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

describe("logout user", () => {
  let cookies = [];

  // Tambahin parameter 20000 (20 detik) di belakang
  beforeEach(async () => {
    // 1. Login dulu buat dapet tiket masuk (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "aliyyulmunif780@gmail.com", // Sesuaikan sama email di database
      password: "aliyyul",
    });

    cookies = result.headers["set-cookie"];
  }, 20000);

  // Tambahin juga di sini
  test("should can logout user successfully", async () => {
    // 2. Eksekusi logout bawa cookie
    const result = await supertest(web)
      .delete("/api/users/logout")
      .set("Cookie", cookies);
console.log(result.body)
    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");
    expect(result.body.message).toBe("Logout successful");

    expect(result.headers["set-cookie"]).toBeDefined();
    expect(result.headers["set-cookie"][0]).toContain("access_token=;");
  }, 20000);

  // Tambahin juga di sini
  test("should reject logout if unauthorized (no cookie)", async () => {
    // 3. Eksekusi logout TAPI sengaja nggak bawa cookie
    const result = await supertest(web).delete("/api/users/logout");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);
});
