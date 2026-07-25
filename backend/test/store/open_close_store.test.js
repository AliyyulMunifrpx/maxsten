import supertest from "supertest";
import { randomUUID } from "crypto";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const LOGIN_EMAIL = "aliyyulmunif780@gmail.com";
const LOGIN_PASSWORD = "aliyyul";

function fullOpenSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: true,
  }));
}

describe("open/close store (explicit status)", () => {
  let cookies = [];
  let userId;
  let createdStoreIds = [];
  let createdGuestIds = [];

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

    await prisma.store.deleteMany({ where: { user_id: userId } });
    createdStoreIds = [];
    createdGuestIds = [];
  }, 20000);

  afterEach(async () => {
    if (createdStoreIds.length > 0) {
      // ASUMSI: model Queue punya relasi ke Store. Dihapus manual dulu
      // (bukan cuma andelin cascade delete) biar aman siapapun konfigurasi
      // FK-nya di schema.
      await prisma.queue.deleteMany({
        where: { store: { public_id: { in: createdStoreIds } } },
      });
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }
    if (createdGuestIds.length > 0) {
      await prisma.guest.deleteMany({ where: { id: { in: createdGuestIds } } });
    }
  });

  async function createStoreDirect(name) {
    const store = await prisma.store.create({
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
    createdStoreIds.push(store.public_id);
    return store;
  }

  // Guest wajib dibuat lebih dulu - Guest.id gak ada @default, jadi harus
  // di-generate manual (pakai randomUUID, sesuai tipe kolomnya @db.Char(36)).
  async function createGuestDirect() {
    const guest = await prisma.guest.create({
      data: { id: randomUUID() },
    });
    createdGuestIds.push(guest.id);
    return guest;
  }

  // Queue butuh queue_number, expired_at (gak ada default), dan guest_id
  // (wajib, relasi ke Guest). Bikin guest baru tiap kali biar tiap queue
  // independen satu sama lain.
  let queueCounter = 0;
  async function createQueueDirect(storeId, status) {
    const guest = await createGuestDirect();
    queueCounter += 1;
    return prisma.queue.create({
      data: {
        store_id: storeId,
        status,
        queue_number: queueCounter,
        expired_at: new Date(Date.now() + 60 * 60 * 1000), // 1 jam dari sekarang
        guest_id: guest.id,
      },
    });
  }

  // Route dikonfirmasi dari userRouter.patch("/api/stores/:storeId/status", ...)
  function endpoint(storeId) {
    return `/api/stores/${storeId}/status`;
  }

  test("should explicitly set the store to CLOSED", async () => {
    const store = await createStoreDirect("Warung Set Tutup");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });

    expect(result.status).toBe(200);
    expect(result.body.data.manual_status).toBe("CLOSED");

    const updated = await prisma.store.findUnique({
      where: { public_id: store.public_id },
    });
    expect(updated.manual_status).toBe("CLOSED");
    expect(updated.manual_updated_at).not.toBeNull();
  });

  test("should explicitly set the store to OPEN even if the schedule already says open", async () => {
    const store = await createStoreDirect("Warung Set Buka");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "OPEN" });

    expect(result.status).toBe(200);
    expect(result.body.data.manual_status).toBe("OPEN");
  });

  test("should return 404 for a store_id that does not belong to the logged-in user", async () => {
    const result = await supertest(web)
      .patch(endpoint("some-nonexistent-store-id"))
      .set("Cookie", cookies)
      .send({ manual_status: "OPEN" });

    expect(result.status).toBe(404);
  });

  test("should return 401 when unauthorized", async () => {
    const store = await createStoreDirect("Warung Set Tanpa Login");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .send({ manual_status: "OPEN" });

    expect(result.status).toBe(401);
  });

  test("should reject an invalid manual_status value with a 400", async () => {
    const store = await createStoreDirect("Warung Status Ngaco");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "MAYBE" });

    expect(result.status).toBe(400);
  });

  test("should reject a missing manual_status field with a 400", async () => {
    const store = await createStoreDirect("Warung Status Kosong");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({});

    expect(result.status).toBe(400);
  });

  test("should be reflected consistently by GET /api/stores afterwards", async () => {
    const store = await createStoreDirect("Warung Konsisten Get");

    const patch = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });
    expect(patch.status).toBe(200);

    const get = await supertest(web).get("/api/stores/me").set("Cookie", cookies);
    expect(get.body.data.is_open).toBe(false);
  });

  test("should not crash when two requests race with different target statuses (last write wins)", async () => {
    const store = await createStoreDirect("Warung Race Status");

    const [resultA, resultB] = await Promise.all([
      supertest(web)
        .patch(endpoint(store.public_id))
        .set("Cookie", cookies)
        .send({ manual_status: "OPEN" }),
      supertest(web)
        .patch(endpoint(store.public_id))
        .set("Cookie", cookies)
        .send({ manual_status: "CLOSED" }),
    ]);

    expect([resultA.status, resultB.status]).not.toContain(500);

    const updated = await prisma.store.findUnique({
      where: { public_id: store.public_id },
    });
    // Final state harus salah satu dari dua, gak boleh corrupt/null.
    expect(["OPEN", "CLOSED"]).toContain(updated.manual_status);
  }, 20000);

  test("should reject closing the store when there is an active queue with status BELUM_BAYAR", async () => {
    const store = await createStoreDirect("Warung Ada Antrian Belum Bayar");
    await createQueueDirect(store.id, "BELUM_BAYAR");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });

    expect(result.status).toBe(400);
    expect(result.body.errors).toMatch(/active queues/i);

    // pastiin store BENERAN gak ke-update di DB
    const updated = await prisma.store.findUnique({
      where: { public_id: store.public_id },
    });
    expect(updated.manual_status).not.toBe("CLOSED");
  });

  test("should reject closing the store when there is an active queue with status DIPROSES", async () => {
    const store = await createStoreDirect("Warung Ada Antrian Diproses");
    await createQueueDirect(store.id, "DIPROSES");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });

    expect(result.status).toBe(400);
  });

  test("should allow closing the store when queues exist but none are active (e.g. SELESAI/DIBATALKAN)", async () => {
    const store = await createStoreDirect("Warung Antrian Udah Selesai");
    await createQueueDirect(store.id, "SELESAI");
    await createQueueDirect(store.id, "DIBATALKAN");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });

    expect(result.status).toBe(200);
    expect(result.body.data.manual_status).toBe("CLOSED");
  });

  test("should allow opening the store even when there is an active queue (guard hanya berlaku buat CLOSED)", async () => {
    const store = await createStoreDirect("Warung Buka Walau Ada Antrian");
    await createQueueDirect(store.id, "BELUM_BAYAR");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "OPEN" });

    expect(result.status).toBe(200);
    expect(result.body.data.manual_status).toBe("OPEN");
  });

  test("should allow closing the store once its only active queue is resolved", async () => {
    const store = await createStoreDirect("Warung Antrian Baru Selesai");
    const queue = await createQueueDirect(store.id, "DIPROSES");

    const blocked = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });
    expect(blocked.status).toBe(400);

    await prisma.queue.update({
      where: { id: queue.id },
      data: { status: "SELESAI" },
    });

    const allowed = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });
    expect(allowed.status).toBe(200);
  });
});
