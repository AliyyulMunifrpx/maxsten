import supertest from "supertest";
import {
  addTestUser,
  changesIsOpenStore,
  createTestProduct,
  createTestStore,
  removeTestProduct,
  removeTestStore,
  removeTestUser,
} from "./test_utils.js";
import { web } from "../src/application/web.js";
import { expect } from "vitest";

describe("POST /api/stores/queues", () => {
  let store;
  let product;
  beforeEach(async () => {
    await addTestUser();

    // 1. Buat store dan simpan objek return-nya
    store = await createTestStore();
    await changesIsOpenStore(store.id);
    // 2. Oper store.id (UUID-nya) ke utils pembuat produk
    product = await createTestProduct(store.id);
  });

  afterEach(async () => {
    // 3. Bersihkan produk terlebih dahulu sebelum store untuk menghindari error foreign key
    await removeTestProduct();
    await removeTestStore();
    await removeTestUser();
  });

  it("should can create new queue", async () => {
    console.log(store.id);
    const result = await supertest(web)
      .post("/api/stores/queues")
      .send({
        store_id: store.id,
        items: [{ product_id: product.id, quantity: 4 }],
      });
    console.log(result.body);
    expect(result.status).toBe(200);
    expect(result.body.data.queue_number).toBe(1);
    expect(result.body.data.queueDetails).toBeDefined();
    console.log(result.body);
  });
  it("should can reject if store id is not valid", async () => {
    const result = await supertest(web)
      .post("/api/stores/queues")
      .send({
        store_id: "924734hdfsdf",
        items: [{ product_id: product.id, quantity: 4 }],
      });
    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
    expect(result.body.data).toBeUndefined();
  });
  it("should can reject if product id is not valid", async () => {
    const result = await supertest(web)
      .post("/api/stores/queues")
      .send({
        store_id: store.id,
        items: [{ product_id: 1000, quantity: 4 }],
      });
    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
    expect(result.body.data).toBeUndefined();
  });
});

describe("GET /api/:storeId/products", () => {
  let store;
  let product;
  beforeEach(async () => {
    await addTestUser();

    // 1. Buat store dan simpan objek return-nya
    store = await createTestStore();
    await changesIsOpenStore(store.id);
    // 2. Oper store.id (UUID-nya) ke utils pembuat produk
    product = await createTestProduct(store.id);
  });

  afterEach(async () => {
    // 3. Bersihkan produk terlebih dahulu sebelum store untuk menghindari error foreign key
    await removeTestProduct();
    await removeTestStore();
    await removeTestUser();
  });

  test('should can get all products from store', async () => { 
    const result = await supertest(web).get(`/api/${store.id}/products`)
    console.log(result.body)
    console.log(result.status)
   })
});
