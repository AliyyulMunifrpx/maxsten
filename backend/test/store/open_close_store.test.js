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

describe("open/close store (explicit status)", () => {
  let cookies = [];
  let testEmail = "";
  let userId = "";
  let createdStoreIds = [];
  let createdGuestIds = [];

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `open_close_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Buka Tutup",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId, // Hapus jika Prisma ID lu pakai auto-generate UUID/Int
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Buka Tutup",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    cookies = result.headers["set-cookie"];

    // 5. Kosongkan array tracking ID.
    // Gak butuh delete store lama karena user ini 100% fresh lahir.
    createdStoreIds = [];
    createdGuestIds = [];
  }, 20000);

  afterEach(async () => {
    // 1. Hapus Relasi Toko (Queue lalu Store)
    if (createdStoreIds.length > 0) {
      await prisma.queue.deleteMany({
        where: { store: { public_id: { in: createdStoreIds } } },
      });
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }

    // 2. Hapus Guest
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

  async function createGuestDirect() {
    const guest = await prisma.guest.create({
      data: { id: randomUUID() },
    });
    createdGuestIds.push(guest.id);
    return guest;
  }

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
  }, 20000);

  test("should explicitly set the store to OPEN even if the schedule already says open", async () => {
    const store = await createStoreDirect("Warung Set Buka");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "OPEN" });

    expect(result.status).toBe(200);
    expect(result.body.data.manual_status).toBe("OPEN");
  }, 20000);

  test("should return 404 for a store_id that does not belong to the logged-in user", async () => {
    const result = await supertest(web)
      .patch(endpoint("some-nonexistent-store-id"))
      .set("Cookie", cookies)
      .send({ manual_status: "OPEN" });

    expect(result.status).toBe(404);
  }, 20000);

  test("should return 401 when unauthorized", async () => {
    const store = await createStoreDirect("Warung Set Tanpa Login");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .send({ manual_status: "OPEN" }); // Tanpa cookie auth

    expect(result.status).toBe(401);
  }, 20000);

  test("should reject an invalid manual_status value with a 400", async () => {
    const store = await createStoreDirect("Warung Status Ngaco");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "MAYBE" });

    expect(result.status).toBe(400);
  }, 20000);

  test("should reject a missing manual_status field with a 400", async () => {
    const store = await createStoreDirect("Warung Status Kosong");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({});

    expect(result.status).toBe(400);
  }, 20000);

  test("should be reflected consistently by GET /api/stores afterwards", async () => {
    const store = await createStoreDirect("Warung Konsisten Get");

    const patch = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });
    expect(patch.status).toBe(200);

    const get = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);
    expect(get.body.data.is_open).toBe(false);
  }, 20000);

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
  }, 20000);

  test("should reject closing the store when there is an active queue with status DIPROSES", async () => {
    const store = await createStoreDirect("Warung Ada Antrian Diproses");
    await createQueueDirect(store.id, "DIPROSES");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });

    expect(result.status).toBe(400);
  }, 20000);

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
  }, 20000);

  test("should allow opening the store even when there is an active queue (guard hanya berlaku buat CLOSED)", async () => {
    const store = await createStoreDirect("Warung Buka Walau Ada Antrian");
    await createQueueDirect(store.id, "BELUM_BAYAR");

    const result = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "OPEN" });

    expect(result.status).toBe(200);
    expect(result.body.data.manual_status).toBe("OPEN");
  }, 20000);

  test("should allow closing the store once its only active queue is resolved", async () => {
    const store = await createStoreDirect("Warung Antrian Baru Selesai");
    const queue = await createQueueDirect(store.id, "DIPROSES");

    // Tutup saat masih DIPROSES -> Ditolak (400)
    const blocked = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });
    expect(blocked.status).toBe(400);

    // Kita "selesaikan" pesanannya secara manual via Prisma
    await prisma.queue.update({
      where: { id: queue.id },
      data: { status: "SELESAI" },
    });

    // Tutup ulang pas pesanan udah SELESAI -> Diterima (200)
    const allowed = await supertest(web)
      .patch(endpoint(store.public_id))
      .set("Cookie", cookies)
      .send({ manual_status: "CLOSED" });
    expect(allowed.status).toBe(200);
  }, 20000);
});
