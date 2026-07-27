import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import crypto from "crypto";

const email = "aliyyulmunif780@gmail.com";
const password = "aliyyul";
const STORE_NAME = "Warung Nasi Makmur Update Test";

describe("PATCH /api/stores/products/:productId", () => {
  let cookies;
  let user;
  let store;
  let product;
  let addonGroup1;
  let addonGroup2;
  let variant1;
  let variant2;
  let createdGuestIds = [];


  const cleanup = async () => {
    await prisma.queueDetail.deleteMany({
      where: { queue: { store: { name: STORE_NAME } } },
    });
    await prisma.queue.deleteMany({
      where: { store: { name: STORE_NAME } },
    });
    if (createdGuestIds.length > 0) {
      await prisma.guest.deleteMany({
        where: { id: { in: createdGuestIds } },
      });
    }
    await prisma.productAddonGroup.deleteMany({
      where: { product: { store: { name: STORE_NAME } } },
    });
    await prisma.variant.deleteMany({
      where: { product: { store: { name: STORE_NAME } } },
    });
    await prisma.product.deleteMany({
      where: { store: { name: STORE_NAME } },
    });
    await prisma.addonGroup.deleteMany({
      where: { store: { name: STORE_NAME } },
    });
    await prisma.store.deleteMany({
      where: { name: STORE_NAME },
    });
  };

  beforeEach(async () => {
    await cleanup();
    createdGuestIds = [];

    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email, password });
    cookies = login.headers["set-cookie"];

    user = await prisma.user.findUnique({ where: { email } });

    store = await prisma.store.create({
      data: {
        user_id: user.id,
        name: STORE_NAME,
        public_id: crypto.randomUUID(),
        street_address: "Jalan Test",
        village: "Test",
        district: "Test",
        city: "Test",
        province: "Test",
        postal_code: "12345",
        timezone: "Asia/Jakarta",
        latitude: -6.2,
        longitude: 106.8,
      },
    });

    addonGroup1 = await prisma.addonGroup.create({
      data: {
        store_id: store.id,
        name: "Addon Test 1",
      },
    });

    addonGroup2 = await prisma.addonGroup.create({
      data: {
        store_id: store.id,
        name: "Addon Test 2",
      },
    });

    product = await prisma.product.create({
      data: {
        store_id: store.id,
        name: "Test Update Product",
        description: "Old Description",
        price: 15000,
        variants: {
          create: [
            { name: "Variant Lama 1", additional_price: 1000 },
            { name: "Variant Lama 2", additional_price: 2000 },
          ],
        },
        productAddonGroups: {
          create: [{ addon_group_id: addonGroup1.id }],
        },
      },
      include: { variants: true },
    });

    variant1 = product.variants[0];
    variant2 = product.variants[1];
  });

  afterEach(async () => {
    await cleanup();
  });

  // --- SKENARIO SUKSES ---

  test("should successfully update product basic info, variants, and addons", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}`)
      .set("Cookie", cookies)
      .send({
        name: "Test Update Product Edited",
        description: "New Description",
        price: 20000,
        variants: [
          {
            id: variant1.id,
            name: "Variant Lama 1 Edited",
            additional_price: 1500,
          },
          { name: "Variant Baru", additional_price: 3000 },
        ],
        addon_group_ids: [addonGroup2.id],
      });

    expect(result.status).toBe(200);

    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { variants: true, productAddonGroups: true },
    });

    expect(dbProduct.name).toBe("Test Update Product Edited");
    expect(dbProduct.price).toBe(20000);

    const activeVariants = dbProduct.variants.filter((v) => !v.is_delete);
    const deletedVariants = dbProduct.variants.filter((v) => v.is_delete);

    expect(activeVariants).toHaveLength(2);
    expect(activeVariants.find((v) => v.id === variant1.id).name).toBe(
      "Variant Lama 1 Edited",
    );
    expect(activeVariants.find((v) => v.name === "Variant Baru")).toBeDefined();
    expect(deletedVariants.find((v) => v.id === variant2.id)).toBeDefined();

    expect(dbProduct.productAddonGroups).toHaveLength(1);
    expect(dbProduct.productAddonGroups[0].addon_group_id).toBe(addonGroup2.id);
  });

  // --- SKENARIO ERROR / VALIDASI ---

  test("should reject (400) if a variant id does not belong to this product", async () => {
    const fakeVariantId = crypto.randomUUID();

    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}`)
      .set("Cookie", cookies)
      .send({
        price: 15000,
        variants: [
          { id: fakeVariantId, name: "Hacker Variant", additional_price: 0 },
        ],
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain("Some variants are invalid");
  });

  test("should reject (400) if an addon group id is invalid or belongs to another store", async () => {
    const fakeAddonGroupId = crypto.randomUUID();

    const result = await supertest(web)
      .patch(`/api/stores/products/${product.id}`)
      .set("Cookie", cookies)
      .send({
        price: 15000,
        addon_group_ids: [fakeAddonGroupId],
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain("Some add-on groups are invalid");
  });

  test("should reject (404) if product does not exist", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${crypto.randomUUID()}`)
      .set("Cookie", cookies)
      .send({ price: 20000 });

    expect(result.status).toBe(404);
    expect(result.body.errors).toContain("Product not found");
  });

  // --- SKENARIO ACTIVE QUEUE (ANTREAN SEDANG BERJALAN) ---

  describe("When product has an active queue", () => {
    beforeEach(async () => {
      const guest = await prisma.guest.create({
        data: { id: crypto.randomUUID() },
      });
      createdGuestIds.push(guest.id);

      const queue = await prisma.queue.create({
        data: {
          store_id: store.id,
          guest_id: guest.id,
          status: "DIPROSES",
          queue_number: 1,
          total_price: 15000,
          expired_at: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await prisma.queueDetail.create({
        data: {
          queue_id: queue.id,
          product_id: product.id,
          quantity: 1,
        },
      });
    });

    test("should successfully update ONLY name and description if active queue exists", async () => {
      const result = await supertest(web)
        .patch(`/api/stores/products/${product.id}`)
        .set("Cookie", cookies)
        .send({
          name: "Boleh Ganti Nama",
          description: "Boleh Ganti Deskripsi",
          price: 15000,
          variants: [
            {
              id: variant1.id,
              name: variant1.name,
              additional_price: variant1.additional_price,
            },
            {
              id: variant2.id,
              name: variant2.name,
              additional_price: variant2.additional_price,
            },
          ],
          addon_group_ids: [addonGroup1.id],
        });

      expect(result.status).toBe(200);

      const dbProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(dbProduct.name).toBe("Boleh Ganti Nama");
    });

    test("should reject (400) if trying to update PRICE with active queue", async () => {
      const result = await supertest(web)
        .patch(`/api/stores/products/${product.id}`)
        .set("Cookie", cookies)
        .send({
          price: 999999,
          variants: [
            {
              id: variant1.id,
              name: variant1.name,
              additional_price: variant1.additional_price,
            },
            {
              id: variant2.id,
              name: variant2.name,
              additional_price: variant2.additional_price,
            },
          ],
          addon_group_ids: [addonGroup1.id],
        });

      expect(result.status).toBe(400);
      expect(result.body.errors).toContain("active order in progress");
    });

    test("should reject (400) if trying to modify VARIANTS with active queue", async () => {
      const result = await supertest(web)
        .patch(`/api/stores/products/${product.id}`)
        .set("Cookie", cookies)
        .send({
          price: 15000,
          variants: [
            {
              id: variant1.id,
              name: variant1.name,
              additional_price: variant1.additional_price,
            },
          ],
          addon_group_ids: [addonGroup1.id],
        });

      expect(result.status).toBe(400);
      expect(result.body.errors).toContain("active order in progress");
    });

    test("should reject (400) if trying to modify ADDONS with active queue", async () => {
      const result = await supertest(web)
        .patch(`/api/stores/products/${product.id}`)
        .set("Cookie", cookies)
        .send({
          price: 15000,
          variants: [
            {
              id: variant1.id,
              name: variant1.name,
              additional_price: variant1.additional_price,
            },
            {
              id: variant2.id,
              name: variant2.name,
              additional_price: variant2.additional_price,
            },
          ],
          addon_group_ids: [],
        });

      expect(result.status).toBe(400);
      expect(result.body.errors).toContain("active order in progress");
    });
  });
});
