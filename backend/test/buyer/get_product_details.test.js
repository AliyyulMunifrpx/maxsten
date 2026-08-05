import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { beforeAll, afterAll, describe, expect, test } from "vitest";
import crypto from "crypto";

const FAKE_UUID = "999e9999-e99b-99d9-a999-999999999999";

describe("GET /api/stores/:storeId/products/:productId (Product Details)", () => {
  let userId;
  let internalStoreId;
  let storePublicId;
  let validProductId;
  let deletedProductId;
  let guestId;

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Setup dilakukan CUMA 1 KALI di awal file
  //    Tanpa Hit Supabase karena ini Public Endpoint (Tanpa Auth)
  // =================================================================
  beforeAll(async () => {
    // 1. Bikin User murni di DB lokal (Cepat Kilat)
    const user = await prisma.user.create({
      data: {
        email: `owner_detail_${Date.now()}@test.com`,
        supabase_id: crypto.randomUUID(),
        name: "Owner Detail",
      },
    });
    userId = user.id;

    // 2. Bikin Toko Aktif dengan public_id dinamis
    storePublicId = crypto.randomUUID();
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        public_id: storePublicId,
        name: "Warung Kopi",
        timezone: "Asia/Jakarta",
        is_delete: false,
      },
    });
    internalStoreId = store.id;

    // 3. Bikin Grup Addon & Addon
    const addonGroup = await prisma.addonGroup.create({
      data: {
        store_id: internalStoreId,
        name: "Topping",
        created_at: new Date(),
        addons: {
          create: [
            {
              name: "Boba",
              price: 3000,
              is_delete: false,
              created_at: new Date(),
            },
            {
              name: "Keju (Dihapus)",
              price: 2000,
              is_delete: true,
              created_at: new Date(),
            }, // Ini harusnya kesaring
          ],
        },
      },
    });

    // 4. Bikin Produk Aktif (dengan Varian & Addon)
    const activeProduct = await prisma.product.create({
      data: {
        store_id: internalStoreId,
        name: "Kopi Susu Gula Aren",
        description: "Kopi mantap jiwa",
        price: 18000,
        is_available: true,
        is_delete: false,
        variants: {
          create: [
            { name: "Less Sugar", additional_price: 0, is_delete: false },
            {
              name: "Extra Shot (Dihapus)",
              additional_price: 5000,
              is_delete: true,
            }, // Ini harusnya kesaring
          ],
        },
        productAddonGroups: {
          create: [{ addon_group_id: addonGroup.id }],
        },
      },
    });
    validProductId = activeProduct.id;

    // 5. Bikin Produk yang sudah di-soft delete
    const deletedProduct = await prisma.product.create({
      data: {
        store_id: internalStoreId,
        name: "Roti Bakar",
        price: 15000,
        is_available: true,
        is_delete: true, // <-- Tanda sudah dihapus
      },
    });
    deletedProductId = deletedProduct.id;

    // 6. Siapkan Transaksi Dummy buat ngetes total_sold
    const guest = await prisma.guest.create({
      data: { id: crypto.randomUUID() },
    });
    guestId = guest.id;

    // Transaksi 1: SELESAI (Quantity = 5) -> Harus Dihitung
    const queueSelesai = await prisma.queue.create({
      data: {
        store_id: internalStoreId,
        guest_id: guestId,
        status: "SELESAI",
        queue_number: 1,
        total_price: 90000,
        expired_at: new Date(Date.now() + 1000 * 60 * 30),
      },
    });
    await prisma.queueDetail.create({
      data: {
        queue_id: queueSelesai.id,
        product_id: validProductId,
        quantity: 5,
      },
    });

    // Transaksi 2: DIBATALKAN (Quantity = 10) -> JANGAN Dihitung
    const queueBatal = await prisma.queue.create({
      data: {
        store_id: internalStoreId,
        guest_id: guestId,
        status: "DIBATALKAN",
        queue_number: 2,
        total_price: 180000,
        expired_at: new Date(Date.now() + 1000 * 60 * 30),
      },
    });
    await prisma.queueDetail.create({
      data: {
        queue_id: queueBatal.id,
        product_id: validProductId,
        quantity: 10,
      },
    });
  }, 20000);

  // =================================================================
  // ⚡ CLEANUP UTAMA: Dilakukan CUMA 1 KALI di akhir
  // =================================================================
  afterAll(async () => {
    // Menghapus data hanya yang bersinggungan dengan store ID ini (Anti-tubruk)
    if (internalStoreId) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: internalStoreId } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: internalStoreId },
      });
      await prisma.productAddonGroup.deleteMany({
        where: { product: { store_id: internalStoreId } },
      });
      await prisma.addon.deleteMany({
        where: { addon_group: { store_id: internalStoreId } },
      });
      await prisma.addonGroup.deleteMany({
        where: { store_id: internalStoreId },
      });
      await prisma.variant.deleteMany({
        where: { product: { store_id: internalStoreId } },
      });
      await prisma.product.deleteMany({
        where: { store_id: internalStoreId },
      });
      await prisma.store.deleteMany({
        where: { id: internalStoreId },
      });
    }

    if (guestId) {
      await prisma.guest.deleteMany({ where: { id: guestId } });
    }

    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("should successfully return product details, filter deleted variants/addons, and calculate total_sold exactly", async () => {
    const response = await supertest(web).get(
      `/api/stores/${storePublicId}/products/${validProductId}`,
    );

    expect(response.status).toBe(200);
    const data = response.body.data;

    // Cek basic info
    expect(data.id).toBe(validProductId);
    expect(data.name).toBe("Kopi Susu Gula Aren");
    expect(data.is_available).toBe(true);
    expect(data.description).toBe("Kopi mantap jiwa");

    // Cek total_sold (Harus 5, yang batal berjumlah 10 tidak boleh dihitung)
    expect(data.total_sold).toBe(5);

    // Cek Varian (Hanya boleh 1 karena yang 1 lagi di-delete)
    expect(data.variants).toHaveLength(1);
    expect(data.variants[0].name).toBe("Less Sugar");

    // Cek Addon (Grup harus 1, dan isinya cuma 1 karena yang 1 lagi di-delete)
    expect(data.addon_groups).toHaveLength(1);
    expect(data.addon_groups[0].name).toBe("Topping");
    expect(data.addon_groups[0].addons).toHaveLength(1);
    expect(data.addon_groups[0].addons[0].name).toBe("Boba");
  });

  test("should reject 400 Bad Request if UUID format is invalid", async () => {
    const response = await supertest(web).get(
      `/api/stores/bukan-uuid-123/products/bukan-uuid-456`,
    );

    // Ditolak Joi validator
    expect(response.status).toBe(400);
  });

  test("should return 404 if product is already soft-deleted (is_delete = true)", async () => {
    const response = await supertest(web).get(
      `/api/stores/${storePublicId}/products/${deletedProductId}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Product not found");
  });

  test("should return 404 if product does not exist at all", async () => {
    const response = await supertest(web).get(
      `/api/stores/${storePublicId}/products/${FAKE_UUID}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Product not found");
  });

  test("should return 404 if store public_id is wrong (preventing access to other store's product)", async () => {
    const response = await supertest(web).get(
      `/api/stores/${FAKE_UUID}/products/${validProductId}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Product not found");
  });
});
