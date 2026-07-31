import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const LOGIN_EMAIL = "aliyyulmunif780@gmail.com";
const LOGIN_PASSWORD = "aliyyul";

// Jadwal "buka 24 jam" tiap hari, biar is_open deterministik = true
// tanpa perlu mock waktu (integration test pakai jam beneran).
function fullOpenSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: true,
  }));
}

// Jadwal "tutup terus", buat test yang butuh schedule bilang tutup.
function fullClosedSchedule() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time: "00:00",
    close_time: "23:59",
    is_active: false,
  }));
}

describe("get store", () => {
  let cookies = [];
  let userId;
  let createdStoreIds = [];

  beforeEach(async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });
    cookies = result.headers["set-cookie"];

    // ASUMSI: model User punya field "email". Sesuaikan kalau beda.
    const user = await prisma.user.findUnique({
      where: { email: LOGIN_EMAIL },
    });
    userId = user.id;

    // Bersihin dulu store lama punya user ini biar tiap test start clean
    // (constraint "1 user 1 store" bikin test ini butuh state kosong).
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

  // Helper: langsung insert store + operational_hours via Prisma, supaya
  // manual_status / manual_updated_at / schedule bisa dikontrol penuh
  // tanpa bergantung ke bug operational_hours yang diabaikan di create endpoint.
  async function createStoreDirect({
    name,
    schedule = fullOpenSchedule(),
    manual_status = null,
    manual_updated_at = null,
    timezone = "Asia/Jakarta",
  }) {
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name,
        description: "Warung test",
        timezone,
        street_address: "Jl. Test No. 1",
        village: "Tonoboyo",
        district: "Bandongan",
        city: "KAB. MAGELANG",
        province: "JAWA TENGAH",
        postal_code: "56151",
        latitude: -7.5849,
        longitude: 110.2754,
        manual_status,
        manual_updated_at,
        is_delete: false,
        operational_hours: { create: schedule },
      },
    });
    createdStoreIds.push(store.public_id);
    return store;
  }

  test("should get the logged-in user's store with expected fields", async () => {
    await createStoreDirect({ name: "Warung Get 1" });

    // ASUMSI ROUTE: GET /api/stores mengambil store milik user yang login
    // (mirror dari POST /api/stores). Ganti kalau rute aslinya beda
    // (misal /api/stores/me).
    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);
    console.log(result.body)
    expect(result.status).toBe(200);
    expect(result.body.data.public_id).toBeDefined();
    expect(result.body.data.name).toBe("Warung Get 1");
    expect(typeof result.body.data.is_open).toBe("boolean");
    expect(result.body.data.operational_hours).toHaveLength(7);
  });

  test("should return 404 when the logged-in user has no store", async () => {
    // Sengaja gak bikin store apapun (sudah dibersihin di beforeEach)
    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBeDefined();
  });

  test("should return 401 when unauthorized (no cookie)", async () => {
    await createStoreDirect({ name: "Warung Get 2" });

    const result = await supertest(web).get("/api/stores/me");

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  });

  test("should reflect is_open=true from schedule when there is no manual override", async () => {
    await createStoreDirect({
      name: "Warung Buka 24 Jam",
      schedule: fullOpenSchedule(),
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.is_open).toBe(true);
  });

  test("should reflect is_open=false from schedule when there is no manual override", async () => {
    await createStoreDirect({
      name: "Warung Tutup Terus",
      schedule: fullClosedSchedule(),
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.is_open).toBe(false);
  });

  test("should force is_open=false via manual override even when schedule says open", async () => {
    await createStoreDirect({
      name: "Warung Override Tutup",
      schedule: fullOpenSchedule(),
      manual_status: "CLOSED",
      manual_updated_at: new Date(),
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.is_open).toBe(false);
  });

  test("should force is_open=true via manual override even when schedule says closed", async () => {
    await createStoreDirect({
      name: "Warung Override Buka",
      schedule: fullClosedSchedule(),
      manual_status: "OPEN",
      manual_updated_at: new Date(),
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.is_open).toBe(true);
  });

  test("should ignore a stale manual override from a previous day and fall back to schedule", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await createStoreDirect({
      name: "Warung Override Basi",
      schedule: fullOpenSchedule(),
      manual_status: "CLOSED",
      manual_updated_at: yesterday,
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    // Override kemarin sudah basi -> harus balik ke jadwal (buka)
    expect(result.body.data.is_open).toBe(true);
  });

  test("should not return a soft-deleted store (is_delete=true)", async () => {
    await createStoreDirect({ name: "Warung Dihapus" });
    await prisma.store.updateMany({
      where: { user_id: userId },
      data: { is_delete: true },
    });

    const result = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
  });
});
