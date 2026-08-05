import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

function fullOpenSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "08:00",
    close_time: "20:00",
    is_active: true,
  }));
}

describe("update operational hours", () => {
  let cookies = [];
  let testEmail = "";
  let userId = "";
  let createdStoreIds = [];

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `update_hours_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Ops Hours",
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
        name: "Tumbal Ops Hours",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });
    cookies = result.headers["set-cookie"];

    // 5. Reset Array.
    // Tidak butuh hapus toko lama di sini karena user ini 100% fresh.
    createdStoreIds = [];
  }, 20000);

  afterEach(async () => {
    // 1. Hapus Relasi Toko Prisma
    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }

    // 2. Hapus User dari tabel Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 3. Hapus User dari Supabase Auth
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // best-effort cleanup
      }
    }
  }, 20000);

  async function createStoreDirect({
    name,
    schedule = fullOpenSchedule(),
  } = {}) {
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
        operational_hours: schedule.length ? { create: schedule } : undefined,
      },
    });
    createdStoreIds.push(store.public_id);
    return store;
  }

  // ASUMSI ROUTE: PATCH /api/stores/operational-hours.
  const ENDPOINT = "/api/stores/me/operational-hours";

  test("should update existing days with new values (upsert -> update path)", async () => {
    await createStoreDirect({ name: "Warung Update Jam 1" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          { day: 0, open_time: "10:00", close_time: "14:00", is_active: false },
          { day: 1, open_time: "09:00", close_time: "17:00", is_active: true },
        ],
      });

    expect(result.status).toBe(200);

    const hours = await prisma.storeOperationalHour.findMany({
      where: { store: { user_id: userId } },
      orderBy: { day: "asc" },
    });

    const sunday = hours.find((h) => h.day === 0);
    const monday = hours.find((h) => h.day === 1);
    expect(sunday.open_time).toBe("10:00");
    expect(sunday.is_active).toBe(false);
    expect(monday.open_time).toBe("09:00");
  }, 20000);

  test("should create rows for days that did not previously exist (upsert -> create path)", async () => {
    await createStoreDirect({ name: "Warung Belum Ada Jam", schedule: [] });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({ operational_hours: fullOpenSchedule() });

    expect(result.status).toBe(200);

    const hours = await prisma.storeOperationalHour.findMany({
      where: { store: { user_id: userId } },
    });
    expect(hours).toHaveLength(7);
  }, 20000);

  test("leaves days not included in the request untouched (documents partial-update behavior)", async () => {
    await createStoreDirect({ name: "Warung Partial Update" }); // semua hari 08:00-20:00

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          { day: 0, open_time: "00:00", close_time: "00:00", is_active: false },
        ],
      });

    expect(result.status).toBe(400);

    const hours = await prisma.storeOperationalHour.findMany({
      where: { store: { user_id: userId } },
    });
    const monday = hours.find((h) => h.day === 1);
    // day=1 gak dikirim di request -> harus tetep nilai lama (08:00-20:00).
    expect(monday.open_time).toBe("08:00");
    expect(monday.is_active).toBe(true);
  }, 20000);

  test("should return 404 when the user has no store", async () => {
    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({ operational_hours: fullOpenSchedule() });

    expect(result.status).toBe(404);
  }, 20000);

  test("should return 401 when unauthorized", async () => {
    await createStoreDirect({ name: "Warung Tanpa Login Update" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .send({ operational_hours: fullOpenSchedule() }); // Tanpa cookie

    expect(result.status).toBe(401);
  }, 20000);

  test("should reject a day value outside 0-6", async () => {
    await createStoreDirect({ name: "Warung Hari Aneh" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          { day: 7, open_time: "08:00", close_time: "20:00", is_active: true },
        ],
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("should reject a malformed time value", async () => {
    await createStoreDirect({ name: "Warung Jam Aneh" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          { day: 0, open_time: "25:99", close_time: "20:00", is_active: true },
        ],
      });
    expect(result.status).toBe(400);
  }, 20000);

  test("should handle an empty operational_hours array without a 500", async () => {
    await createStoreDirect({ name: "Warung Array Kosong" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({ operational_hours: [] });

    expect(result.status).not.toBe(500);
  }, 20000);

  test("should not crash or duplicate rows when two requests race to upsert the same day", async () => {
    await createStoreDirect({ name: "Warung Race Jam" });

    const [resultA, resultB] = await Promise.all([
      supertest(web)
        .patch(ENDPOINT)
        .set("Cookie", cookies)
        .send({
          operational_hours: [
            {
              day: 0,
              open_time: "06:00",
              close_time: "12:00",
              is_active: true,
            },
          ],
        }),
      supertest(web)
        .patch(ENDPOINT)
        .set("Cookie", cookies)
        .send({
          operational_hours: [
            {
              day: 0,
              open_time: "13:00",
              close_time: "18:00",
              is_active: true,
            },
          ],
        }),
    ]);

    expect([resultA.status, resultB.status]).not.toContain(500);

    const sundayRows = await prisma.storeOperationalHour.findMany({
      where: { store: { user_id: userId }, day: 0 },
    });
    // Harus tetep cuma 1 row buat day=0, siapapun yang menang race.
    expect(sundayRows).toHaveLength(1);
  }, 20000);

  test("should reject duplicate day in operational_hours", async () => {
    await createStoreDirect({ name: "Warung Duplicate Day" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          {
            day: 0,
            open_time: "08:00",
            close_time: "20:00",
            is_active: true,
          },
          {
            day: 0,
            open_time: "09:00",
            close_time: "21:00",
            is_active: true,
          },
        ],
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("should allow overnight operational hours", async () => {
    await createStoreDirect({ name: "Warung Malam" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          {
            day: 0,
            open_time: "20:00",
            close_time: "04:00",
            is_active: true,
          },
        ],
      });

    expect(result.status).toBe(200);
  }, 20000);

  test("should reject when open_time equals close_time", async () => {
    await createStoreDirect({ name: "Warung Sama Jam" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          {
            day: 0,
            open_time: "08:00",
            close_time: "08:00",
            is_active: true,
          },
        ],
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("should allow inactive day without opening hours", async () => {
    await createStoreDirect({ name: "Warung Libur" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          {
            day: 0,
            open_time: null,
            close_time: null,
            is_active: false,
          },
        ],
      });
    expect(result.status).toBe(200);
  }, 20000);

  test("should allow all operational days to be inactive", async () => {
    await createStoreDirect({ name: "Warung Tutup Terus" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: Array.from({ length: 7 }, (_, day) => ({
          day,
          open_time: null,
          close_time: null,
          is_active: false,
        })),
      });

    expect(result.status).toBe(200);
  }, 20000);

  test("should reject too many operational hours", async () => {
    await createStoreDirect({ name: "Warung Banyak Hari" });

    const payload = Array.from({ length: 100 }, (_, i) => ({
      day: i,
      open_time: "08:00",
      close_time: "20:00",
      is_active: true,
    }));

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: payload,
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("should reject when operational_hours is missing", async () => {
    await createStoreDirect({ name: "Warung Missing Hours" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({});

    expect(result.status).toBe(400);
  }, 20000);

  test("should reject null operational_hours", async () => {
    await createStoreDirect({ name: "Warung Null Hours" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: null,
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("should reject invalid time format", async () => {
    await createStoreDirect({ name: "Warung Invalid Time" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          {
            day: 0,
            open_time: "abc",
            close_time: "20:00",
            is_active: true,
          },
        ],
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("should reject non zero padded time", async () => {
    await createStoreDirect({ name: "Warung Jam Pendek" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          {
            day: 0,
            open_time: "8:00",
            close_time: "20:00",
            is_active: true,
          },
        ],
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("should reject hour 24", async () => {
    await createStoreDirect({ name: "Warung 24 Jam" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          {
            day: 0,
            open_time: "24:00",
            close_time: "20:00",
            is_active: true,
          },
        ],
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("should reject minute 60", async () => {
    await createStoreDirect({ name: "Warung Menit Salah" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: [
          {
            day: 0,
            open_time: "12:60",
            close_time: "20:00",
            is_active: true,
          },
        ],
      });

    expect(result.status).toBe(400);
  }, 20000);
});