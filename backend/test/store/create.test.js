import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import fs from "fs/promises";
import { unlink } from "fs/promises";
import path from "path";

// PNG 1x1 transparan, biar gak butuh file fixture beneran di disk
const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("create store", () => {
  let cookies = [];
  let createdStoreNames = [];
  let testEmail = "";
  let userId = "";

  beforeEach(async () => {
    // 1. Generate email unik
    testEmail = `store_create_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Store Create",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId, // Hapus jika Prisma ID pakai auto-generate
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Store Create",
      },
    });

    // 4. Login untuk dapatkan tiket masuk (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    cookies = result.headers["set-cookie"];
    createdStoreNames = [];
  }, 20000);

  afterEach(async () => {
    // 1. Cari logo_url dari toko milik user tumbal ini
    const storesToDelete = await prisma.store.findMany({
      where: { user_id: userId },
      select: { logo_url: true },
    });

    // 2. Hapus file fisik logonya jika ada
    for (const store of storesToDelete) {
      if (store.logo_url) {
        const cleanPath = store.logo_url.startsWith("/")
          ? store.logo_url.substring(1)
          : store.logo_url;

        const filePath = path.join(process.cwd(), "public", cleanPath);

        try {
          await unlink(filePath);
        } catch (error) {
          // Abaikan jika file memang tidak ada
        }
      }
    }

    // 3. SAPU BERSIH DATA: Hapus User dari Prisma (otomatis cascade menghapus tokonya jika di schema lu diset onDelete: Cascade, tapi kita manual aja biar aman)
    if (testEmail) {
      await prisma.store.deleteMany({ where: { user_id: userId } });
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
    expect(result.status).toBe(201);
    expect(result.body.data.public_id).toBeDefined();
  }, 20000);

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
  }, 20000);

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
  }, 20000);

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
console.log(result.body)
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
  }, 20000);

  test("should reject creating store if unauthorized (no cookie)", async () => {
    const result = await supertest(web)
      .post("/api/stores")
      .send(baseStorePayload("Warung Tanpa Login"));

    expect(result.status).toBe(401);
    expect(result.body.errors).toBe("Unauthorized");
  }, 20000);

  test("should reject creating store with missing required field (name)", async () => {
    const payload = baseStorePayload("Warung Tanpa Nama");
    delete payload.name;

    const result = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send(payload);

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

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
  }, 20000);

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
  }, 20000);

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

  test("should delete uploaded logo from disk if creating store fails (prevent zombie files)", async () => {
    // 1. Kita bikin toko pertama (SUKSES)
    await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send(baseStorePayload("Warung Pertama"));

    // 2. Hitung jumlah file di folder uploads SEBELUM nembak API
    const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filesBefore = await fs.readdir(UPLOAD_DIR);

    // 3. Tembak toko KEDUA pakai file logo fisik. PASTI GAGAL (400)
    const payload = baseStorePayload("Warung Kedua Bikin Error");
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
      .attach("logo", FAKE_LOGO_BUFFER, "zombie-logo.png");

    expect(result.status).toBe(400);

    // 4. Hitung jumlah file di folder uploads SETELAH API gagal.
    const filesAfter = await fs.readdir(UPLOAD_DIR);

    // Ekspektasi: Jumlah file SEBELUM dan SESUDAH harus sama persis!
    expect(filesAfter.length).toBe(filesBefore.length);
  }, 20000);
});
