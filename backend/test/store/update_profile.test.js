import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const LOGIN_EMAIL = "aliyyulmunif780@gmail.com";
const LOGIN_PASSWORD = "aliyyul";

// ASUMSI ROUTE: PATCH /api/stores. Sesuaikan kalau method/path aslinya beda.
const ENDPOINT = "/api/stores/me";

function baseProfilePayload(name) {
  return {
    name,
    description: "Warung makan terenak sedunia",
    timezone: "Asia/Jakarta",
    street_address: "Jl. Magelang No. 123",
    village: "Tonoboyo",
    district: "Bandongan",
    city: "KAB. MAGELANG",
    province: "JAWA TENGAH",
    postal_code: "56151",
    latitude: -7.5849,
    longitude: 110.2754,
    payment_timeout: 15,
  };
}

describe("update store profile", () => {
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

  async function createStoreDirect(name) {
    const store = await prisma.store.create({
      data: { user_id: userId, ...baseProfilePayload(name), is_delete: false },
    });
    createdStoreIds.push(store.public_id);
    return store;
  }

  test("should update the store profile and return recalculated store data", async () => {
    await createStoreDirect("Warung Profil Awal");

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send(baseProfilePayload("Warung Profil Baru"));
    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("Warung Profil Baru");
    expect(typeof result.body.data.is_open).toBe("boolean");
  });

  test("should return 404 when the user has no store", async () => {
    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send(baseProfilePayload("Warung Gak Ada"));

    expect(result.status).toBe(404);
  });

  test("should return 401 when unauthorized", async () => {
    await createStoreDirect("Warung Profil Tanpa Login");

    const result = await supertest(web)
      .patch(ENDPOINT)
      .send(baseProfilePayload("Warung Ganti Diam Diam"));

    expect(result.status).toBe(401);
  });

  // BUG: gak ada validasi bahwa timezone adalah IANA zone yang valid.
  // Kalau ini ternyata lolos 200 dan tersimpan apa adanya, artinya data
  // toko bisa punya timezone yang salah tanpa peringatan apapun ke user
  // (dampaknya sekarang di-mitigasi oleh fallback di calculateStoreStatus,
  // tapi datanya sendiri tetap salah/tidak konsisten).
  test("shouldn't be able to enter a random time zone", async () => {
    await createStoreDirect("Warung Timezone Aneh");

    const payload = baseProfilePayload("Warung Timezone Aneh");
    payload.timezone = "Bukan/Timezone_Valid";

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send(payload);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBe("Invalid timezone");
    const store = await prisma.store.findFirst({ where: { user_id: userId } });
    expect(store.timezone).toBe("Asia/Jakarta");
  });

  // Kalau schema validasi lu memang mengizinkan partial update (bukan full
  // replace kayak create), test ini HARUS diganti untuk assert field lain
  // tetap sama seperti sebelumnya. Kalau ternyata field lain malah jadi
  // null, itu bug null-out yang serius.
  test("preserves other fields when sending a partial payload", async () => {
    const original = await createStoreDirect("Warung Partial Profil");

    const result = await supertest(web)
      .patch(ENDPOINT)
      .set("Cookie", cookies)
      .send({ name: "Cuma Ganti Nama" });

    expect(result.status).toBe(200);
    expect(result.body.data.name).toBe("Cuma Ganti Nama");
    // INI yang belum ada - pastiin field lain gak ke-null-in
    expect(result.body.data.street_address).toBe(original.street_address);
    expect(result.body.data.city).toBe(original.city);
    expect(result.body.data.payment_timeout).toBe(original.payment_timeout);
  });

  test("should not crash when two full-profile updates race for the same store", async () => {
    await createStoreDirect("Warung Race Profil");

    const [resultA, resultB] = await Promise.all([
      supertest(web)
        .patch(ENDPOINT)
        .set("Cookie", cookies)
        .send(baseProfilePayload("Nama A")),
      supertest(web)
        .patch(ENDPOINT)
        .set("Cookie", cookies)
        .send(baseProfilePayload("Nama B")),
    ]);

    expect([resultA.status, resultB.status]).not.toContain(500);

    const store = await prisma.store.findFirst({ where: { user_id: userId } });
    expect(["Nama A", "Nama B"]).toContain(store.name);
  }, 20000);
});
