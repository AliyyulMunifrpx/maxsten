import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
} from "vitest";

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

describe("POST /api/stores/:storeId/queues (Create Queue)", () => {
  // Variabel Master Data (Scope File)
  let user1Id = "";
  let user1Email = "";
  let user2Id = "";
  let user2Email = "";

  let storeOpen;
  let storeClosed;
  let productBasic;
  let productComplex;
  let variantId;
  let addonId;
  let productHabis;

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Setup Data Master CUMA 1 KALI di awal
  // =================================================================
  beforeAll(async () => {
    user1Email = `open_owner_${Date.now()}@gmail.com`;
    user2Email = `closed_owner_${Date.now()}@gmail.com`;

    // 1. Setup 2 User (Biar gak kena Unique Constraint) via Supabase
    const { data: auth1, error: err1 } = await supabase.auth.admin.createUser({
      email: user1Email,
      password: "password123",
      email_confirm: true,
    });
    if (err1) throw new Error(`Supabase Admin Error 1: ${err1.message}`);
    user1Id = auth1.user.id;

    await prisma.user.create({
      data: {
        id: user1Id,
        supabase_id: user1Id,
        email: user1Email,
        name: "Owner Toko Buka",
      },
    });

    const { data: auth2, error: err2 } = await supabase.auth.admin.createUser({
      email: user2Email,
      password: "password123",
      email_confirm: true,
    });
    if (err2) throw new Error(`Supabase Admin Error 2: ${err2.message}`);
    user2Id = auth2.user.id;

    await prisma.user.create({
      data: {
        id: user2Id,
        supabase_id: user2Id,
        email: user2Email,
        name: "Owner Toko Tutup",
      },
    });

    // 2. Buat Toko BUKA (Milik User 1)
    storeOpen = await prisma.store.create({
      data: {
        user_id: user1Id,
        name: "Warung Buka Terus",
        timezone: "Asia/Jakarta",
        payment_timeout: 30,
        is_delete: false,
        operational_hours: { create: fullOpenSchedule() },
      },
    });

    // 3. Buat Toko TUTUP (Milik User 2)
    storeClosed = await prisma.store.create({
      data: {
        user_id: user2Id,
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
    const addonGroup = await prisma.addonGroup.create({
      data: {
        store_id: storeOpen.id,
        name: "Topping",
        created_at: new Date(),
        addons: {
          create: [{ name: "Keju", price: 3000, created_at: new Date() }],
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
          create: [{ name: "Pedas", additional_price: 2000 }],
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
        is_available: false,
        is_delete: false,
      },
    });
  }, 20000);

  // =================================================================
  // ⚡ CLEANUP UTAMA: Dilakukan CUMA 1 KALI di akhir
  // =================================================================
  afterAll(async () => {
    const storeIds = [storeOpen?.id, storeClosed?.id].filter(Boolean);

    if (storeIds.length > 0) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: { in: storeIds } } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: { in: storeIds } },
      });
      await prisma.productAddonGroup.deleteMany({
        where: { product: { store_id: { in: storeIds } } },
      });
      await prisma.addon.deleteMany({
        where: { addon_group: { store_id: { in: storeIds } } },
      });
      await prisma.addonGroup.deleteMany({
        where: { store_id: { in: storeIds } },
      });
      await prisma.variant.deleteMany({
        where: { product: { store_id: { in: storeIds } } },
      });
      await prisma.product.deleteMany({
        where: { store_id: { in: storeIds } },
      });
      await prisma.storeOperationalHour.deleteMany({
        where: { store_id: { in: storeIds } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: storeIds } },
      });
    }

    const userIds = [user1Id, user2Id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
      for (const id of userIds) {
        try {
          await supabase.auth.admin.deleteUser(id);
        } catch (e) {}
      }
    }
  }, 20000);

  // =================================================================
  // ⚡ RESET LOKAL: Cukup hapus Guest dan Queue saja (Super Cepat)
  // =================================================================
  beforeEach(async () => {
    const storeIds = [storeOpen?.id, storeClosed?.id].filter(Boolean);
    if (storeIds.length > 0) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: { in: storeIds } } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: { in: storeIds } },
      });
    }
    // Guest ID bisa bocor dari test sebelumnya, kita bersihkan
    await prisma.guest.deleteMany({});
  });

  // --- TEST CASES ---

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
      .post(`/api/stores/${payload.public_id}/queues`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.queue_number).toBe(1);
    expect(response.body.data.total_price).toBe(20000);
    expect(response.body.data.status).toBe("BELUM_BAYAR");

    // Pastikan BE membuat guest_id dan mengirimnya lewat Set-Cookie
    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/guest_id=[0-9a-fA-F-]{36}/);
  }, 20000);

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
      .post(`/api/stores/${payload.public_id}/queues`)
      .set("Cookie", [`guest_id=${dummyGuestId}`])
      .send(payload);
console.log(response.body)
    expect(response.status).toBe(201);

    // Hitungan: (20.000 (Dasar) + 2.000 (Varian) + 3.000 (Addon)) * 2 = 50.000
    expect(response.body.data.total_price).toBe(50000);
    expect(response.body.data.guest_id).toBe(dummyGuestId);

    // Karena guest lama, BE TIDAK BOLEH ngirim cookie baru
    expect(response.headers["set-cookie"]).toBeUndefined();
  }, 20000);

  test("should reject if store is closed", async () => {
    const payload = {
      public_id: storeClosed.public_id,
      items: [{ product_id: productBasic.id, quantity: 1 }],
    };

    const response = await supertest(web)
      .post(`/api/stores/${payload.public_id}/queues`)
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("closed");
  }, 20000);

  test("should reject if guest has an active queue", async () => {
    const dummyGuestId = "999e4567-e89b-12d3-a456-426614174999";
    const payload = {
      public_id: storeOpen.public_id,
      items: [{ product_id: productBasic.id, quantity: 1 }],
    };

    // Checkout pertama (Sukses)
    const firstCheckout = await supertest(web)
      .post(`/api/stores/${payload.public_id}/queues`)
      .set("Cookie", [`guest_id=${dummyGuestId}`])
      .send(payload);

    expect(firstCheckout.status).toBe(201);

    // Checkout kedua dengan guest_id yang SAMA dan antrean pertama belum selesai
    const secondCheckout = await supertest(web)
      .post(`/api/stores/${payload.public_id}/queues`)
      .set("Cookie", [`guest_id=${dummyGuestId}`])
      .send(payload);

    expect(secondCheckout.status).toBe(400);
    expect(secondCheckout.body.errors).toContain("finish the previous queue");
  }, 20000);

  test("should reject if product is out of stock (is_available = false)", async () => {
    const payload = {
      public_id: storeOpen.public_id,
      items: [{ product_id: productHabis.id, quantity: 1 }],
    };

    const response = await supertest(web)
      .post(`/api/stores/${payload.public_id}/queues`)
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("unavailable or out of stock");
  }, 20000);

  test("should reject hacker attempt: negative quantity", async () => {
    const payload = {
      public_id: storeOpen.public_id,
      items: [{ product_id: productBasic.id, quantity: -10 }],
    };

    const response = await supertest(web)
      .post(`/api/stores/${payload.public_id}/queues`)
      .send(payload);

    // Ditolak oleh Joi Validator (400 Bad Request)
    expect(response.status).toBe(400);
  }, 20000);
});
