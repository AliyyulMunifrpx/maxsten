import supertest from "supertest";
import { randomUUID } from "crypto";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const LOGIN_EMAIL = "aliyyulmunif780@gmail.com";
const LOGIN_PASSWORD = "aliyyul";

const TZ = "Asia/Jakarta";

function fullOpenSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: true,
  }));
}

function nowZoned() {
  return toZonedTime(new Date(), TZ);
}

// Build a UTC instant from local (Asia/Jakarta) wall-clock components -
// mirrors exactly what the service does internally.
function zonedTime(y, m, d, h = 12, min = 0) {
  return fromZonedTime(new Date(y, m - 1, d, h, min, 0, 0), TZ);
}

function calcTrend(current, previous) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0 && current > 0) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function endpoint() {
  return "/api/stores/dashboard";
}

describe("GET /api/stores/dashboard", () => {
  let cookies = [];
  let userId;
  let store;
  let createdStoreIds = [];
  let createdGuestIds = [];
  let createdProductIds = [];
  let createdAddonGroupIds = [];

  async function wipeUserStores() {
    const staleStores = await prisma.store.findMany({
      where: { user_id: userId },
      select: { id: true },
    });
    const staleStoreIds = staleStores.map((s) => s.id);
    if (staleStoreIds.length === 0) return;

    await prisma.queueDetail.deleteMany({
      where: { queue: { store_id: { in: staleStoreIds } } },
    });
    await prisma.queue.deleteMany({
      where: { store_id: { in: staleStoreIds } },
    });
    await prisma.addon.deleteMany({
      where: { addon_group: { store_id: { in: staleStoreIds } } },
    });
    await prisma.addonGroup.deleteMany({
      where: { store_id: { in: staleStoreIds } },
    });
    await prisma.product.deleteMany({
      where: { store_id: { in: staleStoreIds } },
    });
    await prisma.store.deleteMany({ where: { id: { in: staleStoreIds } } });
  }

  beforeEach(async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });
    cookies = result.headers["set-cookie"];

    const user = await prisma.user.findUnique({
      where: { email: LOGIN_EMAIL },
    });
    userId = user.id;

    await wipeUserStores();
    createdStoreIds = [];
    createdGuestIds = [];
    createdProductIds = [];
    createdAddonGroupIds = [];

    store = await createStoreDirect("Warung Dashboard HTTP Test");
  }, 20000);

  afterEach(async () => {
    await wipeUserStores();
    if (createdGuestIds.length > 0) {
      await prisma.guest.deleteMany({ where: { id: { in: createdGuestIds } } });
    }
  });

  async function createStoreDirect(name) {
    const s = await prisma.store.create({
      data: {
        user_id: userId,
        name,
        description: "Warung test",
        timezone: TZ,
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

  async function createProductDirect(storeId, name, opts = {}) {
    const product = await prisma.product.create({
      data: {
        store_id: storeId,
        name,
        price: opts.price ?? 10000,
        is_delete: false,
        is_available: opts.isAvailable ?? true,
        created_at: opts.createdAt ?? new Date(),
      },
    });
    createdProductIds.push(product.id);
    return product;
  }

  // NOTE: assumes an AddonGroup model with a `store_id` FK, and an Addon
  // model related via `addon_group_id` (matching the snake_case convention
  // used elsewhere in this schema, e.g. product_id / guest_id / queue_id).
  // Double check these field names against schema.prisma if they differ.
  async function createAddonGroupDirect(storeId, name = "Toppings") {
    const group = await prisma.addonGroup.create({
      data: {
        store_id: storeId,
        name,
        is_delete: false,
        created_at: new Date(),
      },
    });
    createdAddonGroupIds.push(group.id);
    return group;
  }

  async function createAddonDirect(storeId, name, opts = {}) {
    const group = opts.group ?? (await createAddonGroupDirect(storeId));
    return prisma.addon.create({
      data: {
        addon_group_id: group.id,
        name,
        price: opts.price ?? 2000,
        is_delete: false,
        created_at: opts.createdAt ?? new Date(),
      },
    });
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

  test("should return 401 when unauthorized", async () => {
    const result = await supertest(web).get(endpoint());
    expect(result.status).toBe(401);
  });

  test("should return 404 when the logged-in user has no store", async () => {
    await prisma.store.deleteMany({ where: { user_id: userId } });

    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(404);
  });

  test("should return 200 with store info and open status", async () => {
    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.store.public_id).toBe(store.public_id);
    expect(result.body.data.store.name).toBe(store.name);
    // Full open schedule (00:00-23:59 every day) -> store should read as open.
    expect(result.body.data.store.is_open).toBe(true);
  });

  test("should return only the latest 5 products, newest first", async () => {
    const base = Date.now() - 60 * 60 * 1000; // 1 hour ago as baseline
    const products = [];
    for (let i = 0; i < 7; i++) {
      products.push(
        await createProductDirect(store.id, `Produk ${i}`, {
          createdAt: new Date(base + i * 1000), // strictly increasing
        }),
      );
    }

    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    const latest = result.body.data.lists.latest_products;
    expect(latest).toHaveLength(5);
    // Newest first: products[6], products[5], ... products[2]
    const expectedIds = [6, 5, 4, 3, 2].map((i) => products[i].id);
    expect(latest.map((p) => p.id)).toEqual(expectedIds);
  });

  test("should return only the latest 5 addons, newest first", async () => {
    const group = await createAddonGroupDirect(store.id);
    const base = Date.now() - 60 * 60 * 1000;
    const addons = [];
    for (let i = 0; i < 6; i++) {
      addons.push(
        await createAddonDirect(store.id, `Addon ${i}`, {
          group,
          createdAt: new Date(base + i * 1000),
        }),
      );
    }

    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);
    expect(result.status).toBe(200);
    const latest = result.body.data.lists.latest_addons;
    expect(latest).toHaveLength(5);
    const expectedIds = [5, 4, 3, 2, 1].map((i) => addons[i].id);
    expect(latest.map((a) => a.id)).toEqual(expectedIds);
  });

  test("should return the 5 oldest active queues, oldest on top, excluding finished/cancelled queues", async () => {
    const base = Date.now() - 60 * 60 * 1000;
    const active = [];
    for (let i = 0; i < 7; i++) {
      active.push(
        await createQueueDirect(
          store.id,
          i % 2 === 0 ? "BELUM_BAYAR" : "DIPROSES",
          { createdAt: new Date(base + i * 1000) },
        ),
      );
    }
    // These must never show up in the active list.
    await createQueueDirect(store.id, "SELESAI", {
      createdAt: new Date(base - 5000),
    });
    await createQueueDirect(store.id, "DIBATALKAN", {
      createdAt: new Date(base - 4000),
    });

    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    const oldestActive = result.body.data.lists.oldest_active_queues;
    expect(oldestActive).toHaveLength(5);
    // Oldest first -> active[0..4]
    const expectedIds = active.slice(0, 5).map((q) => q.id);
    expect(oldestActive.map((q) => q.id)).toEqual(expectedIds);
    expect(
      oldestActive.every((q) => ["BELUM_BAYAR", "DIPROSES"].includes(q.status)),
    ).toBe(true);
  });

  test("should report peak_hour as '-' and an all-zero hourly_traffic when there are no completed orders today", async () => {
    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.today.peak_hour).toBe("-");
    expect(result.body.data.today.hourly_traffic).toHaveLength(24);
    expect(result.body.data.today.hourly_traffic.every((c) => c === 0)).toBe(
      true,
    );
  });

  test("should return hourly_traffic as a 24-length array with counts in the right hour buckets", async () => {
    const busyTime = new Date(Date.now() - 90 * 60 * 1000);
    const quietTime = new Date(Date.now() - 20 * 60 * 1000);
    const busyHour = toZonedTime(busyTime, TZ).getHours();
    const quietHour = toZonedTime(quietTime, TZ).getHours();

    await createQueueDirect(store.id, "SELESAI", { createdAt: busyTime });
    await createQueueDirect(store.id, "SELESAI", {
      createdAt: new Date(busyTime.getTime() + 5000),
    });
    await createQueueDirect(store.id, "SELESAI", {
      createdAt: new Date(busyTime.getTime() + 10000),
    });
    await createQueueDirect(store.id, "SELESAI", { createdAt: quietTime });
    // Cancelled orders must not be counted in the traffic chart.
    await createQueueDirect(store.id, "DIBATALKAN", { createdAt: quietTime });

    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    const traffic = result.body.data.today.hourly_traffic;
    expect(traffic).toHaveLength(24);
    expect(traffic[busyHour]).toBe(3);
    expect(traffic[quietHour]).toBe(1);

    const total = traffic.reduce((a, b) => a + b, 0);
    expect(total).toBe(4); // only the 4 SELESAI orders, not the cancelled one
  });

  test("should report a flat 0% trend on every metric when there is no data today or yesterday", async () => {
    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    const { today } = result.body.data;
    expect(today.omzet).toEqual({ value: 0, trend: 0 });
    expect(today.pesanan_selesai).toEqual({ value: 0, trend: 0 });
    expect(today.pesanan_batal).toEqual({ value: 0, trend: 0 });
    expect(today.aov).toEqual({ value: 0, trend: 0 });
  });

  test("should compute today's metric cards (omzet, pesanan_selesai, pesanan_batal, AOV) against yesterday at the same time", async () => {
    const minutesAgo = (min) => new Date(Date.now() - min * 60 * 1000);

    // Today: 2 completed orders (40000 + 60000), 1 cancelled.
    // "minutes ago" instead of a fixed clock hour so this always lands
    // safely before `now`, whatever time the test runs.
    await createQueueDirect(store.id, "SELESAI", {
      totalPrice: 40000,
      createdAt: minutesAgo(40),
    });
    await createQueueDirect(store.id, "SELESAI", {
      totalPrice: 60000,
      createdAt: minutesAgo(30),
    });
    await createQueueDirect(store.id, "DIBATALKAN", {
      createdAt: minutesAgo(20),
    });

    // Yesterday, just after local midnight -> guaranteed to be before
    // "now"'s time-of-day, so it must count towards the yesterday window.
    const nz = nowZoned();
    const y = nz.getFullYear();
    const m = nz.getMonth() + 1;
    const yesterdayD = nz.getDate() - 1; // JS Date rolls this over correctly

    await createQueueDirect(store.id, "SELESAI", {
      totalPrice: 50000,
      createdAt: zonedTime(y, m, yesterdayD, 0, 1),
    });
    await createQueueDirect(store.id, "DIBATALKAN", {
      createdAt: zonedTime(y, m, yesterdayD, 0, 2),
    });
    await createQueueDirect(store.id, "DIBATALKAN", {
      createdAt: zonedTime(y, m, yesterdayD, 0, 3),
    });

    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    const { today } = result.body.data;

    expect(today.omzet.value).toBe(100000);
    expect(today.omzet.trend).toBe(calcTrend(100000, 50000));

    expect(today.aov.value).toBe(50000); // 100000 / 2
    expect(today.aov.trend).toBe(calcTrend(50000, 50000)); // both AOV = 50000 -> 0

    expect(today.pesanan_selesai.value).toBe(2);
    expect(today.pesanan_selesai.trend).toBe(calcTrend(2, 1));

    expect(today.pesanan_batal.value).toBe(1);
    expect(today.pesanan_batal.trend).toBe(calcTrend(1, 2));
  });

  test("should report a 100% trend when yesterday had zero orders but today has some", async () => {
    await createQueueDirect(store.id, "SELESAI", {
      totalPrice: 30000,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.today.omzet.trend).toBe(100);
    expect(result.body.data.today.pesanan_selesai.trend).toBe(100);
  });

  test("should NOT count yesterday's orders that happened later in the day than 'now' (fair same-time-of-day comparison)", async () => {
    // If yesterday's window ran through the whole day (00:00 -> 00:00
    // today) instead of stopping at the same time-of-day as "now", an order
    // placed at 23:59 yesterday would always be counted even though today's
    // window only ever runs up to the current wall-clock time. That would
    // make the comparison unfair.
    const nz = nowZoned();
    const y = nz.getFullYear();
    const m = nz.getMonth() + 1;
    const yesterdayD = nz.getDate() - 1;

    await createQueueDirect(store.id, "SELESAI", {
      totalPrice: 77000,
      createdAt: zonedTime(y, m, yesterdayD, 23, 59),
    });

    const result = await supertest(web).get(endpoint()).set("Cookie", cookies);

    expect(result.status).toBe(200);
    // Today has zero orders, and yesterday's late-day order should be
    // excluded -> trend should be the "both zero" case (0%), not a false
    // "yesterday had revenue" signal.
    expect(result.body.data.today.omzet.value).toBe(0);
    expect(result.body.data.today.omzet.trend).toBe(0);
  });
});
