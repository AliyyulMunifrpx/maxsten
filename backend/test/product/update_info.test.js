import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import crypto from "crypto";

describe("PATCH /api/stores/products/:productId", () => {
  let cookies;
  let testEmail = "";
  let userId = "";
  let storeId = "";
  let store;
  let product;
  let addonGroup1;
  let addonGroup2;
  let variant1;
  let variant2;
  let createdGuestIds = [];

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `patch_product_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Patch Product" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Patch Product",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const login = await supertest(web)
      .post("/api/users/login")
      .send({ email: testEmail, password: "password123" });
    cookies = login.headers["set-cookie"];

    // 5. Setup Store Dinamis
    store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Warung Nasi Makmur Update Test",
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
    storeId = store.id;

    // 6. Setup AddonGroups
    addonGroup1 = await prisma.addonGroup.create({
      data: {
        store_id: storeId,
        name: "Addon Test 1",
        created_at: new Date(),
      },
    });

    addonGroup2 = await prisma.addonGroup.create({
      data: {
        store_id: storeId,
        name: "Addon Test 2",
        created_at: new Date(),
      },
    });

    // 7. Setup Product beserta Variants & ProductAddonGroups
    product = await prisma.product.create({
      data: {
        store_id: storeId,
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
    createdGuestIds = [];
  }, 20000);

  afterEach(async () => {
    // --- CLEANUP TERSENTRAL BERDASARKAN ID TOKO ---
    if (storeId) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: storeId } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: storeId },
      });
      await prisma.productAddonGroup.deleteMany({
        where: { product: { store_id: storeId } },
      });
      await prisma.variant.deleteMany({
        where: { product: { store_id: storeId } },
      });
      await prisma.product.deleteMany({
        where: { store_id: storeId },
      });
      await prisma.addonGroup.deleteMany({
        where: { store_id: storeId },
      });
      await prisma.store.deleteMany({
        where: { id: storeId },
      });
    }

    if (createdGuestIds.length > 0) {
      await prisma.guest.deleteMany({
        where: { id: { in: createdGuestIds } },
      });
    }

    // Hapus User Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // Hapus User Supabase
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {}
    }
  }, 20000);

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
    console.log(result.body)
    expect(result.status).toBe(200);

    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { variants: true, productAddonGroups: true },
    });

    expect(dbProduct.name).toBe("test update product edited");
    expect(dbProduct.price).toBe(20000);

    const activeVariants = dbProduct.variants.filter((v) => !v.is_delete);
    const deletedVariants = dbProduct.variants.filter((v) => v.is_delete);

    expect(activeVariants).toHaveLength(2);
    expect(activeVariants.find((v) => v.id === variant1.id).name).toBe(
      "variant lama 1 edited",
    );
    expect(activeVariants.find((v) => v.name === "variant baru")).toBeDefined();
    expect(deletedVariants.find((v) => v.id === variant2.id)).toBeDefined();

    expect(dbProduct.productAddonGroups).toHaveLength(1);
    expect(dbProduct.productAddonGroups[0].addon_group_id).toBe(addonGroup2.id);
  }, 20000);

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
  }, 20000);

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
  }, 20000);

  test("should reject (404) if product does not exist", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/products/${crypto.randomUUID()}`)
      .set("Cookie", cookies)
      .send({ price: 20000 });

    expect(result.status).toBe(404);
    expect(result.body.errors).toContain("Product not found");
  }, 20000);

  // --- SKENARIO ACTIVE QUEUE (ANTREAN SEDANG BERJALAN) ---

  describe("When product has an active queue", () => {
    beforeEach(async () => {
      const guest = await prisma.guest.create({
        data: { id: crypto.randomUUID() },
      });
      createdGuestIds.push(guest.id);

      const queue = await prisma.queue.create({
        data: {
          store_id: storeId,
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
    }, 20000);

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
      expect(dbProduct.name).toBe("boleh ganti nama");
    }, 20000);

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
    }, 20000);

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
    }, 20000);

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
    }, 20000);
  });
});
