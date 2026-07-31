import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";

const LOGIN_EMAIL = "test_create_addon@gmail.com";
const LOGIN_PASSWORD = "password123";
const ENDPOINT = "/api/stores/addon-groups"; // Sesuaikan dengan route POST lu

describe("POST /api/stores/addon-groups", () => {
  let cookies = [];
  let userId = "";
  let storeId = null;

  beforeEach(async () => {
    // 1. Bersihkan database
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });

    // 2. Register dan Login
    await supertest(web).post("/api/users").send({
      email: LOGIN_EMAIL,
      name: "User Addon",
      password: LOGIN_PASSWORD,
    });

    const loginResult = await supertest(web).post("/api/users/login").send({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });

    cookies = loginResult.headers["set-cookie"];

    const user = await prisma.user.findUnique({
      where: { email: LOGIN_EMAIL },
    });
    userId = user.id;

    // 3. Buatkan Toko Aktif
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Toko Addon",
        timezone: "Asia/Jakarta",
      },
    });
    storeId = store.id;
  }, 20000);

  afterEach(async () => {
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
  });

  // ====================== TEST CASES ====================== //

  test("1. Should create Addon Group successfully with valid JSON array", async () => {
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Minuman",
        addons: [
          { name: "Boba", price: 3000 },
          { name: "Keju", price: 4000 },
        ],
      });
    expect(result.status).toBe(201); // Atau 201 kalau lu set begitu di controller
    expect(result.body.data.name).toBe("Topping Minuman");
    expect(result.body.data.addons).toHaveLength(2);

    // Verifikasi ke DB
    const inDb = await prisma.addonGroup.findFirst({
      where: { name: "Topping Minuman" },
      include: { addons: true },
    });
    expect(inDb).not.toBeNull();
    expect(inDb.addons).toHaveLength(2);
  });

  test("2. Should create Addon Group successfully when 'addons' is sent as stringified JSON (FormData style)", async () => {
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Makanan",
        addons: JSON.stringify([{ name: "Ayam Suwir", price: 5000 }]), // Dikirim sebagai string
      });

    expect(result.status).toBe(201);
    expect(result.body.data.name).toBe("Topping Makanan");
  });

  test("3. Should return 400 if 'addons' string is INVALID JSON", async () => {
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Error",
        addons: "Bukan JSON yang valid [,,",
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain("Invalid addons data format");
  });

  test("4. Should return 400 if Addon names inside the group are DUPLICATES", async () => {
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Kembar",
        addons: [
          { name: "Boba", price: 3000 },
          { name: "Boba", price: 4000 }, // 👈 Nama kembar di 1 request
        ],
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toContain(
      "Add-on names within a group must be unique",
    );
  });

  test("5. Should return 409 if Addon Group name already exists (Trigger P2002 via Partial Index)", async () => {
    // Insert pertama (Berhasil)
    await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Spesial",
        addons: [{ name: "Oreo", price: 2000 }],
      });

    // Insert kedua dengan nama yang sama (Harus gagal)
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Spesial",
        addons: [{ name: "Mesis", price: 1000 }],
      });
    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("already exists");
  });

  test("6. [CRUCIAL] Should ALLOW creating Addon Group with the same name IF the old one is soft-deleted", async () => {
    // 1. Buat grup secara manual dan set is_delete: true
    await prisma.addonGroup.create({
      data: {
        name: "Topping Musiman",
        store_id: storeId,
        is_delete: true, // 👈 Sudah dihapus
        created_at: new Date(),
      },
    });

    // 2. Tembak API buat bikin grup dengan NAMA YANG SAMA
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Musiman",
        addons: [{ name: "Kurma", price: 5000 }],
      });

    // 3. Harus berhasil karena Partial Unique Index (WHERE is_delete = false) mengizinkannya
    expect(result.status).toBe(201);
    expect(result.body.data.name).toBe("Topping Musiman");
  });

  test("7. Should return 404 if User does NOT have an active store", async () => {
    // Hapus toko si user
    await prisma.store.deleteMany({ where: { user_id: userId } });

    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Hantu",
        addons: [{ name: "Boba", price: 3000 }],
      });

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Store not found");
  });
});
