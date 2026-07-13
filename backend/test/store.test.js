import supertest from "supertest";
import { web } from "../src/application/web.js";
import { expect, describe, beforeEach, afterEach, test } from "vitest";
import {
  registerTestUser,
  loginTestUser,
  removeTestUser,
} from "./test_utils.js";

describe("POST /api/stores", () => {
  let cookies;

  beforeEach(async () => {
    await registerTestUser();
    const login = await loginTestUser();
    cookies = login.headers["set-cookie"];
  });

  afterEach(async () => {
    // Membersihkan data setelah test berjalan agar tidak bentrok
    await removeTestUser();
  });

  test("should can create new store", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .send({
        name: "test",
        description: "description",
        address: "test",
      })
      .set("Cookie", cookies);

    // Tambahkan assertion untuk test yang sukses
    expect(result.status).toBe(200); // Sesuaikan jika API kamu mengembalikan 201 Created
    expect(result.body.data.name).toBe("test");
  });

  // --- TEST ERROR ---

  test("should reject if request is unauthorized (no cookie)", async () => {
    const result = await supertest(web).post("/api/stores").send({
      name: "test",
      description: "description",
      address: "test",
    }); // Tidak menggunakan .set("Cookie", cookies)
    console.log(result.body);
    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });

  test("should reject if request is invalid (missing required fields)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .send({
        // Sengaja mengosongkan field 'name'
        description: "description",
        address: "test",
      })
      .set("Cookie", cookies);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  test("should reject if request is invalid (empty strings)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .send({
        name: "", // String kosong biasanya akan ditolak oleh validasi (seperti Joi/Zod)
        description: "",
        address: "",
      })
      .set("Cookie", cookies);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });
});
// describe("POST /api/stores/products", () => {
//   let store_id;
//   beforeEach(async () => {
//     await addTestUser();
//     store_id = await createTestStore();
//   });
//   afterEach(async () => {
//     await removeTestUser();
//     await removeTestStore();
//   });
//   test("should can create new products", async () => {
//     const result = await supertest(web)
//       .post("/api/stores/products")
//       .send({
//         name: "test",
//         price: 1000,
//         store_id: store_id.id,
//       })
//       .set("Cookie", [`token=test`]);

//     expect(result.status).toBe(200);
//     expect(result.body.data.store_id).toBe(store_id.id);
//     expect(result.body.data.name).toBe("test");
//     expect(result.body.data.price).toBe(1000);
//   });
//   test("should can reject if request is invalid", async () => {
//     const result = await supertest(web)
//       .post("/api/stores/products")
//       .send({
//         name: "",
//         price: -1000,
//         store_id: "0989",
//       })
//       .set("Cookie", [`token=test`]);

//     expect(result.status).toBe(400);
//     expect(result.body.data).toBeUndefined();
//     expect(result.body.errors).toBeDefined();
//   });
//   test("should can reject if user is unauthorized", async () => {
//     const result = await supertest(web)
//       .post("/api/stores/products")
//       .send({
//         name: "test",
//         price: 1000,
//         store_id: store_id.id,
//       })
//       .set("Cookie", [`token=salah`]);

//     expect(result.status).toBe(401);
//     expect(result.body.data).toBeUndefined();
//     expect(result.body.errors).toBeDefined();
//   });
//   test("should can reject if price is negative", async () => {
//     const result = await supertest(web)
//       .post("/api/stores/products")
//       .send({
//         name: "test",
//         price: -1000,
//         store_id: store_id.id,
//       })
//       .set("Cookie", [`token=test`]);

//     expect(result.status).toBe(400);
//     expect(result.body.data).toBeUndefined();
//     expect(result.body.errors).toBeDefined();
//   });
//   test("should can reject duplicate products", async () => {
//     const result = await supertest(web)
//       .post("/api/stores/products")
//       .send({
//         name: "test",
//         price: 1000,
//         store_id: store_id.id,
//       })
//       .set("Cookie", [`token=test`]);
//     const result2 = await supertest(web)
//       .post("/api/stores/products")
//       .send({
//         name: "test",
//         price: 1000,
//         store_id: store_id.id,
//       })
//       .set("Cookie", [`token=test`]);
//     expect(result2.status).toBe(400);

//     expect(result2.body.errors).toBeDefined();
//   });
// });
