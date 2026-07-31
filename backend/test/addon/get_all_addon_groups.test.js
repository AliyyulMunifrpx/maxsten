import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";

const LOGIN_EMAIL = "test_get_addongroups@gmail.com";
const LOGIN_PASSWORD = "password123";
const ENDPOINT = "/api/stores/addon-groups";

describe("GET /api/stores/addon-groups", () => {
  let cookies = [];
  let userId = "";
  let storeId = null;

  beforeEach(async () => {
    // 1. Bersihkan database
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "other@gmail.com" } });

    // 2. Register dan Login
    await supertest(web).post("/api/users").send({
      email: LOGIN_EMAIL,
      name: "User Get Addon",
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

    // 3. Buatkan Toko Utama
    const store = await prisma.store.create({
      data: { user_id: userId, name: "Toko Utama", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // --- SETUP DATA ADDON DENGAN TANGGAL BERBEDA (UNTUK TES SORTING) ---
    const dateOld = new Date(Date.now() - 100000); // Lebih lama
    const dateNew = new Date(); // Paling baru

    // [A] Grup 1: Paling Lama
    await prisma.addonGroup.create({
      data: {
        id: uuidv4(),
        store_id: storeId,
        name: "Grup Lama",
        created_at: dateOld,
        addons: {
          create: [
            { name: "Addon Lama 1", price: 1000, created_at: dateOld },
            // Addon ini dihapus, harusnya ga ikut ke-load
            {
              name: "Addon Dihapus",
              price: 0,
              created_at: dateNew,
              is_delete: true,
            },
          ],
        },
      },
    });

    // [B] Grup 2: Paling Baru (Harusnya muncul duluan di response)
    await prisma.addonGroup.create({
      data: {
        id: uuidv4(),
        store_id: storeId,
        name: "Grup Baru",
        created_at: dateNew,
        addons: {
          create: [
            { name: "Addon Baru 1", price: 2000, created_at: dateNew },
            { name: "Addon Baru 2", price: 3000, created_at: dateOld }, // Harusnya Addon Baru 1 duluan
          ],
        },
      },
    });

    // [C] Grup 3: Dihapus (is_delete: true) -> Harusnya ga ikut ke-load
    await prisma.addonGroup.create({
      data: {
        store_id: storeId,
        name: "Grup Hantu",
        is_delete: true,
        created_at: dateNew,
      },
    });

    // [D] Toko & Grup Orang Lain (Untuk tes Celah Keamanan / IDOR)
    const otherUser = await prisma.user.create({
      data: { email: "other@gmail.com", name: "Other", supabase_id: uuidv4() },
    });
    const otherStore = await prisma.store.create({
      data: {
        user_id: otherUser.id,
        name: "Toko Lain",
        timezone: "Asia/Jakarta",
      },
    });
    await prisma.addonGroup.create({
      data: {
        store_id: otherStore.id,
        name: "Grup Orang Lain",
        created_at: dateNew,
      },
    });
  }, 20000);

  afterEach(async () => {
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "other@gmail.com" } });
  });

  // ====================== TEST CASES ====================== //

  test("1. Should get all active Addon Groups and sort them by 'created_at' DESC", async () => {
    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(200);

    const data = result.body.data;
    // Harus nge-return 2 grup (Grup 3 yang dihapus dan Grup 4 milik orang lain tidak ikut)
    expect(data).toHaveLength(2);

    // Cek Sorting DESC (Grup terbaru harus di index 0)
    expect(data[0].name).toBe("Grup Baru");
    expect(data[1].name).toBe("Grup Lama");

    // Cek Filter & Sorting Addon di dalam Grup
    const grupBaruAddons = data[0].addons;
    expect(grupBaruAddons).toHaveLength(2);
    expect(grupBaruAddons[0].name).toBe("Addon Baru 1"); // Karena created_at-nya lebih baru

    const grupLamaAddons = data[1].addons;
    expect(grupLamaAddons).toHaveLength(1); // Cuma 1 karena Addon ke-2 is_delete: true
    expect(grupLamaAddons[0].name).toBe("Addon Lama 1");
  });

  test("2. Should return empty array if Store has no Addon Groups", async () => {
    // Hapus semua grup milik toko ini dulu
    await prisma.addonGroup.deleteMany({ where: { store_id: storeId } });

    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual([]); // Jangan return null, harus array kosong
  });

  test("3. Should return 404 if User does NOT have an active store", async () => {
    // Hapus tokonya si user
    await prisma.store.deleteMany({ where: { user_id: userId } });

    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Store not found");
  });

  test("4. Should return 401 when unauthorized (no cookie)", async () => {
    const result = await supertest(web).get(ENDPOINT);

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});
