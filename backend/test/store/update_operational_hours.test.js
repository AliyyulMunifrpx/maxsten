import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const LOGIN_EMAIL = "aliyyulmunif780@gmail.com";
const LOGIN_PASSWORD = "aliyyul";

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
  let userId;
  let createdStoreIds = [];

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
  }, 20000);

  afterEach(async () => {
    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }
  });

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

  // ASUMSI ROUTE: PATCH /api/stores/operational-hours. Sesuaikan kalau beda
  // (misal PUT, atau path lain).
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
  });

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
  });

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
    // Kalau ternyata malah ke-reset/null, berarti ada regresi di sini.
    expect(monday.open_time).toBe("08:00");
    expect(monday.is_active).toBe(true);
  });

  test("should return 404 when the user has no store", async () => {
    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({ operational_hours: fullOpenSchedule() });

    expect(result.status).toBe(404);
  });

  test("should return 401 when unauthorized", async () => {
    await createStoreDirect({ name: "Warung Tanpa Login Update" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .send({ operational_hours: fullOpenSchedule() });

    expect(result.status).toBe(401);
  });

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
  });

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
  });

  // Edge case yang gampang kelewat: array kosong. Perilaku
  // prisma.$transaction([]) bisa beda antar versi Prisma - test ini
  // minimal mastiin gak nge-500 diam-diam.
  test("should handle an empty operational_hours array without a 500", async () => {
    await createStoreDirect({ name: "Warung Array Kosong" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({ operational_hours: [] });

    expect(result.status).not.toBe(500);
  });

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
  });
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
  });
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
  });
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
  });
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
  });
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
  });
  test("should reject when operational_hours is missing", async () => {
    await createStoreDirect({ name: "Warung Missing Hours" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({});

    expect(result.status).toBe(400);
  });
  test("should reject null operational_hours", async () => {
    await createStoreDirect({ name: "Warung Null Hours" });

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        operational_hours: null,
      });

    expect(result.status).toBe(400);
  });
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
  });
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
  });
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
  });
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
  });
});
