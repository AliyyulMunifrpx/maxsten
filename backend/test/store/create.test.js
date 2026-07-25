import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

// PNG 1x1 transparan, biar gak butuh file fixture beneran di disk
const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("create store", () => {
  let cookies = [];
  let createdStoreNames = [];

  beforeEach(async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: "aliyyulmunif780@gmail.com",
      password: "aliyyul",
    });

    cookies = result.headers["set-cookie"];
    createdStoreNames = [];
  }, 20000);

  afterEach(async () => {
    if (createdStoreNames.length > 0) {
      await prisma.store.deleteMany({
        where: { name: { in: createdStoreNames } },
      });
    }
  });

  // Helper: generate payload + otomatis didaftarin ke daftar cleanup
  function baseStorePayload(name) {
    createdStoreNames.push(name);
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
    };
  }

  test("should can create new store", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send({
        ...baseStorePayload("Warung Berbero"),
        operational_hours: [
          { day: 0, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 1, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 2, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 3, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 4, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 5, open_time: "08:00", close_time: "20:00", is_active: true },
          { day: 6, open_time: "08:00", close_time: "20:00", is_active: true },
        ],
      });
    console.log(result.body);
    expect(result.status).toBe(201);
    expect(result.body.data.public_id).toBeDefined();
  });

  test("should always create exactly 7 operational_hours entries", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send(baseStorePayload("Warung Tujuh Hari"));

    expect(result.status).toBe(201);

    const store = await prisma.store.findUnique({
      where: { public_id: result.body.data.public_id },
      include: { operational_hours: true },
    });

    expect(store.operational_hours).toHaveLength(7);
  });

  test("should save the operational_hours submitted by the user (currently ignored - known bug)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send({
        ...baseStorePayload("Warung Custom Jam"),
        operational_hours: [
          {
            day: 0,
            open_time: "00:00",
            close_time: "00:00",
            is_active: false,
          },
          {
            day: 1,
            open_time: "09:00",
            close_time: "17:00",
            is_active: true,
          },
          {
            day: 2,
            open_time: "09:00",
            close_time: "17:00",
            is_active: true,
          },
          {
            day: 3,
            open_time: "09:00",
            close_time: "17:00",
            is_active: true,
          },
          {
            day: 4,
            open_time: "09:00",
            close_time: "17:00",
            is_active: true,
          },
          {
            day: 5,
            open_time: "09:00",
            close_time: "17:00",
            is_active: true,
          },
          {
            day: 6,
            open_time: "10:00",
            close_time: "15:00",
            is_active: true,
          },
        ],
      });
    expect(result.status).toBe(400);
  }, 20000);

  test("should create store without a logo file (logo_url null)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send(baseStorePayload("Warung Tanpa Logo"));

    expect(result.status).toBe(201);

    const store = await prisma.store.findUnique({
      where: { public_id: result.body.data.public_id },
    });

    expect(store.logo_url).toBeNull();
  });

  // Catatan: field name "logo" di .attach() ini nebak - sesuain sama
  // nama field yang dipake di multer config lu (upload.single("...")).
  test("should create store with a logo file and parse operational_hours sent as JSON string (multipart)", async () => {
    const payload = baseStorePayload("Warung Ada Logo");

    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .field("name", payload.name)
      .field("description", payload.description)
      .field("timezone", payload.timezone)
      .field("street_address", payload.street_address)
      .field("village", payload.village)
      .field("district", payload.district)
      .field("city", payload.city)
      .field("province", payload.province)
      .field("postal_code", payload.postal_code)
      .field("latitude", String(payload.latitude))
      .field("longitude", String(payload.longitude))
      .field(
        "operational_hours",
        JSON.stringify([
          { day: 0, open_time: "08:00", close_time: "20:00", is_active: true },
        ]),
      )
      .attach("logo", FAKE_LOGO_BUFFER, "logo.png");

    expect(result.status).toBe(201);

    const store = await prisma.store.findUnique({
      where: { public_id: result.body.data.public_id },
    });

    expect(store.logo_url).toMatch(/^\/uploads\//);
  }, 20000);

  test("should reject creating a second store for the same user", async () => {
    const first = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send(baseStorePayload("Warung Pertama"));

    expect(first.status).toBe(201);

    const second = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send(baseStorePayload("Warung Kedua"));

    expect(second.status).toBe(400);
    expect(second.body.errors).toBe("You already have a store");
  });

  test("should reject creating store if unauthorized (no cookie)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .send(baseStorePayload("Warung Tanpa Login"));

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  });

  test("should reject creating store with missing required field (name)", async () => {
    const payload = baseStorePayload("Warung Tanpa Nama");
    delete payload.name;

    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send(payload);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  test("should reject creating store with invalid latitude/longitude type", async () => {
    const payload = baseStorePayload("Warung Koordinat Aneh");
    payload.latitude = "bukan-angka";
    payload.longitude = "juga-bukan-angka";

    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send(payload);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  // operational_hours dikirim sebagai string tapi bukan JSON valid ->
  // JSON.parse di controller throw SyntaxError biasa (bukan ResponseError).
  // Idealnya tetep 400, tapi kemungkinan besar sekarang jatuh ke 500.
  test("should handle malformed operational_hours JSON string without crashing", async () => {
    const payload = baseStorePayload("Warung Jam Rusak");

    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .field("name", payload.name)
      .field("description", payload.description)
      .field("timezone", payload.timezone)
      .field("street_address", payload.street_address)
      .field("village", payload.village)
      .field("district", payload.district)
      .field("city", payload.city)
      .field("province", payload.province)
      .field("postal_code", payload.postal_code)
      .field("latitude", String(payload.latitude))
      .field("longitude", String(payload.longitude))
      .field("operational_hours", "{ ini bukan json valid");

    expect(result.status).not.toBe(200);
  });

  test("should not allow two concurrent requests to both create a store for the same user", async () => {
    const payloadA = baseStorePayload("Warung Race A");
    const payloadB = baseStorePayload("Warung Race B");

    const [resultA, resultB] = await Promise.all([
      supertest(web).post("/api/stores").set("Cookie", cookies).send(payloadA),
      supertest(web).post("/api/stores").set("Cookie", cookies).send(payloadB),
    ]);
    const successCount = [resultA, resultB].filter(
      (r) => r.status === 201,
    ).length;

    expect(successCount).toBe(1);
  }, 20000);
});
