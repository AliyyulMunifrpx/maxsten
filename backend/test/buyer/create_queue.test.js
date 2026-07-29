import supertest from "supertest";
import { web } from "../../src/application/web.js"; // Sesuaikan path
import { prisma } from "../../src/application/database.js"; // Sesuaikan path
import { afterEach, beforeEach, describe, expect, test } from "vitest";

// Helper jadwal buka 24 jam
function fullOpenSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: true,
  }));
}

function fullClosedSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: false,
  }));
}

describe("POST /api/stores/queues (Create Queue)", () => {
  let storeOpen;
  let storeClosed;
  let productBasic;
  let productComplex;
  let variantId;
  let addonId;
  let productHabis;

  beforeEach(async () => {
    // 1. Bersihkan database
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.productAddonGroup.deleteMany({});
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.storeOperationalHour.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. BIKIN 2 USER BERBEDA (Biar gak kena Unique Constraint)
    const user1 = await prisma.user.create({
      data: {
        email: "owner_open@test.com",
        supabase_id: "dummy-supa-open-123",
        name: "Owner Toko Buka",
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: "owner_closed@test.com",
        supabase_id: "dummy-supa-closed-123",
        name: "Owner Toko Tutup",
      },
    });

    // 3. Buat Toko BUKA (Milik User 1)
    storeOpen = await prisma.store.create({
      data: {
        user_id: user1.id, // <-- Pakai ID user 1
        name: "Warung Buka Terus",
        timezone: "Asia/Jakarta",
        payment_timeout: 30,
        is_delete: false,
        operational_hours: { create: fullOpenSchedule() },
      },
    });

    // 4. Buat Toko TUTUP (Milik User 2)
    storeClosed = await prisma.store.create({
      data: {
        user_id: user2.id, // <-- Pakai ID user 2
        name: "Warung Tutup",
        timezone: "Asia/Jakarta",
        is_delete: false,
        operational_hours: { create: fullClosedSchedule() },
      },
    });
    // 4. Buat Produk 1: Basic (Tanpa Addon & Varian) -> Rp 10.000
    productBasic = await prisma.product.create({
      data: {
        store_id: storeOpen.id,
        name: "Es Teh Manis",
        price: 10000,
        is_available: true,
        is_delete: false,
      },
    });

    // 5. Buat Produk 2: Kompleks (Ada Varian & Addon) -> Rp 20.000
    // Setup Addon Group dulu
    const addonGroup = await prisma.addonGroup.create({
      data: {
        store_id: storeOpen.id,
        name: "Topping",
        addons: {
          create: [{ name: "Keju", price: 3000 }], // Addon: Rp 3.000
        },
      },
      include: { addons: true },
    });
    addonId = addonGroup.addons[0].id;

    productComplex = await prisma.product.create({
      data: {
        store_id: storeOpen.id,
        name: "Burger Spesial",
        price: 20000,
        is_available: true,
        is_delete: false,
        variants: {
          create: [{ name: "Pedas", additional_price: 2000 }], // Varian: Rp 2.000
        },
        productAddonGroups: {
          create: [{ addon_group_id: addonGroup.id }],
        },
      },
      include: { variants: true },
    });
    variantId = productComplex.variants[0].id;

    // 6. Buat Produk 3: Habis (Out of Stock)
    productHabis = await prisma.product.create({
      data: {
        store_id: storeOpen.id,
        name: "Ayam Goreng",
        price: 15000,
        is_available: false, // <-- Tanda barang habis
        is_delete: false,
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
    await prisma.storeOperationalHour.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});
  });

  test("should successfully create queue for a NEW guest & set cookie", async () => {
    const payload = {
      public_id: storeOpen.public_id,
      note: "Jangan terlalu manis",
      items: [
        {
          product_id: productBasic.id,
          quantity: 2, // 2 x 10.000 = 20.000
        },
      ],
    };

    const response = await supertest(web)
      .post("/api/stores/queues")
      .send(payload);
    expect(response.status).toBe(200);
    expect(response.body.data.queue_number).toBe(1);
    expect(response.body.data.total_price).toBe(20000);
    expect(response.body.data.status).toBe("BELUM_BAYAR");

    // Pastikan BE membuat guest_id dan mengirimnya lewat Set-Cookie
    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/guest_id=[0-9a-fA-F-]{36}/);
  });

  test("should successfully calculate complex price (Product + Variant + Addon)", async () => {
    // Kita simulasikan guest yang sudah punya cookie
    const dummyGuestId = "123e4567-e89b-12d3-a456-426614174000";

    const payload = {
      public_id: storeOpen.public_id,
      items: [
        {
          product_id: productComplex.id,
          quantity: 2,
          variant_id: variantId,
          selected_addons: [addonId],
        },
      ],
    };

    const response = await supertest(web)
      .post("/api/stores/queues")
      .set("Cookie", [`guest_id=${dummyGuestId}`])
      .send(payload);

    expect(response.status).toBe(200);

    // Hitungan: (20.000 (Dasar) + 2.000 (Varian) + 3.000 (Addon)) * 2 = 50.000
    expect(response.body.data.total_price).toBe(50000);
    expect(response.body.data.guest_id).toBe(dummyGuestId);

    // Karena guest lama, BE TIDAK BOLEH ngirim cookie baru
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  test("should reject if store is closed", async () => {
    const payload = {
      public_id: storeClosed.public_id,
      items: [{ product_id: productBasic.id, quantity: 1 }],
    };

    const response = await supertest(web)
      .post("/api/stores/queues")
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("closed");
  });

  test("should reject if guest has an active queue", async () => {
    const dummyGuestId = "999e4567-e89b-12d3-a456-426614174999";
    const payload = {
      public_id: storeOpen.public_id,
      items: [{ product_id: productBasic.id, quantity: 1 }],
    };

    // Checkout pertama (Sukses)
    const firstCheckout = await supertest(web)
      .post("/api/stores/queues")
      .set("Cookie", [`guest_id=${dummyGuestId}`])
      .send(payload);

    expect(firstCheckout.status).toBe(200);

    // Checkout kedua dengan guest_id yang SAMA dan antrean pertama belum selesai
    const secondCheckout = await supertest(web)
      .post("/api/stores/queues")
      .set("Cookie", [`guest_id=${dummyGuestId}`])
      .send(payload);
    expect(secondCheckout.status).toBe(400);
    expect(secondCheckout.body.errors).toContain("finish the previous queue");
  });

  test("should reject if product is out of stock (is_available = false)", async () => {
    const payload = {
      public_id: storeOpen.public_id,
      items: [{ product_id: productHabis.id, quantity: 1 }],
    };

    const response = await supertest(web)
      .post("/api/stores/queues")
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("unavailable or out of stock");
  });

  test("should reject hacker attempt: negative quantity", async () => {
    const payload = {
      public_id: storeOpen.public_id,
      items: [{ product_id: productBasic.id, quantity: -10 }],
    };

    const response = await supertest(web)
      .post("/api/stores/queues")
      .send(payload);

    // Ditolak oleh Joi Validator (400 Bad Request)
    expect(response.status).toBe(400);
  });
});
