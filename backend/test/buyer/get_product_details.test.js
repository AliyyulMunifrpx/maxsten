import supertest from "supertest";
import { web } from "../../src/application/web.js"; // Sesuaikan dengan path lu
import { prisma } from "../../src/application/database.js"; // Sesuaikan dengan path lu
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const STORE_PUBLIC_ID = "123e4567-e89b-12d3-a456-426614174000";
const FAKE_UUID = "999e9999-e99b-99d9-a999-999999999999";

describe("GET /api/:storeId/:productId/details (Product Details)", () => {
  let userId;
  let internalStoreId;
  let validProductId;
  let deletedProductId;
  let guestId;

  beforeEach(async () => {
    // 1. Bersihkan database (Child ke Parent)
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.productAddonGroup.deleteMany({});
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Bikin User Owner
    const user = await prisma.user.create({
      data: {
        email: "owner_detail@test.com",
        supabase_id: "dummy-supa-detail-123",
        name: "Owner Detail",
      },
    });
    userId = user.id;

    // 3. Bikin Toko Aktif
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        public_id: STORE_PUBLIC_ID,
        name: "Warung Kopi",
        timezone: "Asia/Jakarta",
        is_delete: false,
      },
    });
    internalStoreId = store.id;

    // 4. Bikin Grup Addon & Addon
    const addonGroup = await prisma.addonGroup.create({
      data: {
        store_id: internalStoreId,
        name: "Topping",
        addons: {
          create: [
            { name: "Boba", price: 3000, is_delete: false },
            { name: "Keju (Dihapus)", price: 2000, is_delete: true }, // Ini harusnya kesaring
          ],
        },
      },
    });

    // 5. Bikin Produk Aktif (dengan Varian & Addon)
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

    // 6. Bikin Produk yang sudah di-soft delete
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

    // 7. Siapkan Transaksi Dummy buat ngetes total_sold
    const guest = await prisma.guest.create({
      data: { id: "guest-uuid-1234-5678-9012-3456789012" },
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
  });

  afterEach(async () => {
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.productAddonGroup.deleteMany({});
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});
  });

  test("should successfully return product details, filter deleted variants/addons, and calculate total_sold exactly", async () => {
    const response = await supertest(web).get(
      `/api/${STORE_PUBLIC_ID}/${validProductId}/details`,
    );
    expect(response.status).toBe(200);
    const data = response.body.data;

    // Cek basic info & perbaikan yang baru lu lakuin
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
      `/api/bukan-uuid-123/bukan-uuid-456/details`,
    );

    // Ditolak Joi validator
    expect(response.status).toBe(400);
  });

  test("should return 404 if product is already soft-deleted (is_delete = true)", async () => {
    const response = await supertest(web).get(
      `/api/${STORE_PUBLIC_ID}/${deletedProductId}/details`,
    );

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Product not found");
  });

  test("should return 404 if product does not exist at all", async () => {
    const response = await supertest(web).get(
      `/api/${STORE_PUBLIC_ID}/${FAKE_UUID}/details`,
    );

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Product not found");
  });

  test("should return 404 if store public_id is wrong (preventing access to other store's product)", async () => {
    const response = await supertest(web).get(
      `/api/${FAKE_UUID}/${validProductId}/details`,
    );

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Product not found");
  });
});
