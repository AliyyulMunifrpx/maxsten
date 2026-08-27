import supertest from "supertest";
import { randomUUID } from "crypto";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

function fullOpenSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: true,
  }));
}

// Anchor test data 2 months before "today" so it never collides with the
// real current month (which would clip date ranges at `now()` instead of
// end-of-month) and never produces timestamps in the future.
function addMonths(year, month1to12, delta) {
  const d = new Date(year, month1to12 - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const today = new Date();
const anchor = addMonths(today.getFullYear(), today.getMonth() + 1, -2);
const TEST_YEAR = anchor.year;
const TEST_MONTH = anchor.month;

function jakarta(y, m, d, h = 12, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h - 7, min));
}

function endpoint() {
  return "/api/stores/me/history";
}

describe("GET /api/stores/me/history", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";
  let testEmail = "";
  let userId = "";
  let store;
  let createdStoreIds = [];
  let createdGuestIds = [];
  let createdProductIds = [];

  beforeEach(async () => {
    // 1. Generate email unik
    testEmail = `history_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal History Test",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId, // Hapus jika Prisma ID pakai auto-generate default
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal History Test",
      },
    });

    // 4. Login untuk dapatkan Access Token
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = result.body.data.access_token;

    // Reset array penampung ID
    createdStoreIds = [];
    createdGuestIds = [];
    createdProductIds = [];

    // Bikin store langsung buat test ini
    store = await createStoreDirect("Warung History HTTP Test");
  }, 20000);

  afterEach(async () => {
    // 1. Sapu bersih semua relasi Store (QueueDetail, Queue, Product, Store)
    const staleStores = await prisma.store.findMany({
      where: { user_id: userId },
      select: { id: true },
    });

    const staleStoreIds = staleStores.map((s) => s.id);

    if (staleStoreIds.length > 0) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store_id: { in: staleStoreIds } } },
      });
      await prisma.queue.deleteMany({
        where: { store_id: { in: staleStoreIds } },
      });
      await prisma.product.deleteMany({
        where: { store_id: { in: staleStoreIds } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: staleStoreIds } },
      });
    }

    // 2. Bersihkan Guest
    if (createdGuestIds.length > 0) {
      await prisma.guest.deleteMany({ where: { id: { in: createdGuestIds } } });
    }

    // 3. Hapus User dari Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 4. Hapus User dari Supabase Auth
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // best-effort cleanup
      }
    }
  }, 20000);

  async function createStoreDirect(name) {
    const s = await prisma.store.create({
      data: {
        user_id: userId,
        name,
        description: "Warung test",
        timezone: "Asia/Jakarta",
        street_address: "Jl. Test No. 1",
        village: "Tonoboyo",
        district: "Bandongan",
        city: "KAB. MAGELANG",
        province: "JAWA TENGAH",
        postal_code: "56151",
        latitude: -7.5849,
        longitude: 110.2754,
        is_delete: false,
        operational_hours: { create: fullOpenSchedule() },
      },
    });
    createdStoreIds.push(s.public_id);
    return s;
  }

  async function createGuestDirect() {
    const guest = await prisma.guest.create({ data: { id: randomUUID() } });
    createdGuestIds.push(guest.id);
    return guest;
  }

  async function createProductDirect(storeId, name) {
    const product = await prisma.product.create({
      data: { store_id: storeId, name, price: 10000, is_delete: false },
    });
    createdProductIds.push(product.id);
    return product;
  }

  let queueCounter = 0;
  async function createQueueDirect(storeId, status, opts = {}) {
    const guest = await createGuestDirect();
    queueCounter += 1;
    return prisma.queue.create({
      data: {
        store_id: storeId,
        status,
        queue_number: queueCounter,
        expired_at: new Date(Date.now() + 60 * 60 * 1000),
        guest_id: guest.id,
        total_price: opts.totalPrice ?? 0,
        created_at: opts.createdAt ?? new Date(),
        completed_at: opts.completedAt ?? null,
      },
    });
  }

  async function addQueueDetail(queueId, product, opts = {}) {
    return prisma.queueDetail.create({
      data: {
        queue_id: queueId,
        product_id: product.id,
        quantity: opts.quantity ?? 1,
        selected_addons: opts.addons ?? null,
      },
    });
  }

  test("should return 401 when unauthorized", async () => {
    const result = await supertest(web)
      .get(endpoint())
      .query({ month: TEST_MONTH, year: TEST_YEAR }); // Tanpa Token

    expect(result.status).toBe(401);
  }, 20000);

  test("should return 404 when the logged-in user has no store", async () => {
    await prisma.store.deleteMany({ where: { user_id: userId } });

    const result = await supertest(web)
      .get(endpoint())
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR });

    expect(result.status).toBe(404);
  }, 20000);

  test("should return 400 for an invalid month", async () => {
    const result = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: 13, year: TEST_YEAR });

    expect(result.status).toBe(400);
  }, 20000);

  test("should return 400 for an invalid status value", async () => {
    const result = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR, status: "MAYBE" });

    expect(result.status).toBe(400);
  }, 20000);

  test("should return 400 when a negative page is sent", async () => {
    const result = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR, page: -5 });

    expect(result.status).toBe(400);
  }, 20000);

  test("silently falls back to page=1 when page is a non-numeric string (controller behavior)", async () => {
    const result = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR, page: "abc" });

    expect(result.status).toBe(200);
    expect(result.body.data.pagination.currentPage).toBe(1);
  }, 20000);

  test("should return 200 with correct summary totals", async () => {
    await createQueueDirect(store.id, "SELESAI", {
      totalPrice: 50000,
      createdAt: jakarta(TEST_YEAR, TEST_MONTH, 5),
    });
    await createQueueDirect(store.id, "DIBATALKAN", {
      createdAt: jakarta(TEST_YEAR, TEST_MONTH, 6),
    });

    const result = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR });

    expect(result.status).toBe(200);
    expect(result.body.data.summary.totalOmzet).toBe(50000);
    expect(result.body.data.summary.totalPesanan).toBe(1);
    expect(result.body.data.summary.totalBatal).toBe(1);
  }, 20000);

  test("should paginate history via query params", async () => {
    for (let i = 0; i < 15; i++) {
      await createQueueDirect(store.id, "SELESAI", {
        totalPrice: 1000 * (i + 1),
        createdAt: jakarta(TEST_YEAR, TEST_MONTH, 1 + (i % 27), 8 + (i % 10)),
      });
    }

    const page1 = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR, page: 1, limit: 10 });
    const page2 = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR, page: 2, limit: 10 });

    expect(page1.status).toBe(200);
    expect(page1.body.data.history).toHaveLength(10);
    expect(page2.body.data.history).toHaveLength(5);
    expect(page1.body.data.pagination.totalRows).toBe(15);
  }, 20000);

  test("should filter history by status via query param", async () => {
    await createQueueDirect(store.id, "SELESAI", {
      createdAt: jakarta(TEST_YEAR, TEST_MONTH, 3),
    });
    await createQueueDirect(store.id, "DIBATALKAN", {
      createdAt: jakarta(TEST_YEAR, TEST_MONTH, 4),
    });

    const result = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR, status: "DIBATALKAN" });

    expect(result.status).toBe(200);
    expect(
      result.body.data.history.every((h) => h.status === "DIBATALKAN"),
    ).toBe(true);
  }, 20000);

  test("should return top-selling products and top addons", async () => {
    const product = await createProductDirect(store.id, "Es Teh");
    const queue = await createQueueDirect(store.id, "SELESAI", {
      createdAt: jakarta(TEST_YEAR, TEST_MONTH, 5),
    });
    await addQueueDetail(queue.id, product, {
      quantity: 4,
      addons: [{ name: "Less Ice" }],
    });

    const result = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ month: TEST_MONTH, year: TEST_YEAR });

    expect(result.status).toBe(200);
    expect(result.body.data.topSelling.rankings[0].product_id).toBe(product.id);
    expect(result.body.data.topSelling.rankings[0].totalQuantity).toBe(4);
    expect(
      result.body.data.topAddons.find((a) => a.name === "Less Ice")
        .totalQuantity,
    ).toBe(4);
  }, 20000);

  test("should default month/year to the current month when not provided", async () => {
    const result = await supertest(web)
      .get(endpoint())
      .set("Authorization", `Bearer ${accessToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data.meta.isCurrentMonth).toBe(true);
  }, 20000);
});
