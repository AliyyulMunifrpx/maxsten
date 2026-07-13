import supertest from "supertest";
import { web } from "../src/application/web.js";
import { afterAll, afterEach, beforeAll, beforeEach, expect } from "vitest";
import {
  addTestUser,
  createTestContact,
  createTestProduct,
  createTestQueue,
  createTestStore,
  getTestContact,
  removeTestContact,
  removeTestProduct,
  removeTestStore,
  removeTestUser,
} from "./test_utils.js";
import { prisma } from "../src/application/database.js";

describe("GET /api/stores/queues/:storeId", () => {
  let testStore;
  let testProduct;

  beforeEach(async () => {
    await addTestUser();
    testStore = await createTestStore();
    testProduct = await createTestProduct(testStore.id);
    await createTestQueue(testStore.id, testProduct.id);
  });
  afterEach(async () => {
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await removeTestProduct();
    await removeTestStore();
    await removeTestUser();
  });
  test("should can get queues", async () => {
    const result = await supertest(web)
      .get(`/api/stores/queues/${testStore.id}`)
      .set("Cookie", [`token=test`]);

      expect(result.status).toBe(200)
      expect(result.body.data).toBeDefined()
  });
  test("should can reject if the user is unauthorized", async () => {
    const result = await supertest(web)
      .get(`/api/stores/queues/${testStore.id}`)
      .set("Cookie", [`token=salah`]);

      expect(result.status).toBe(401)
      expect(result.body.data).toBeUndefined()
  });
  test("should can reject if the store id is invalid", async () => {
    const result = await supertest(web)
      .get(`/api/stores/queues/enfdurhfyr4859`)
      .set("Cookie", [`token=test`]);

      expect(result.status).toBe(400)
      expect(result.body.data).toBeUndefined()
  });
});
