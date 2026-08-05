import supertest from "supertest";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
} from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";

const ENDPOINT = "/api/stores/addon-groups";

describe("GET /api/stores/addon-groups", () => {
  let cookies = [];

  // User Scope (Hanya dibuat 1 kali di beforeAll)
  let testEmail = "";
  let userId = "";
  let otherEmail = "";
  let otherUserId = "";

  // Data Scope (Direset di setiap beforeEach)
  let storeId = null;

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Hit Supabase CUMA 1 KALI untuk semua test
  // =================================================================
  beforeAll(async () => {
    testEmail = `get_all_addongroups_${Date.now()}@gmail.com`;
    otherEmail = `other_addongroups_${Date.now()}@gmail.com`;

    // 1. Setup User Utama via Supabase
    const { data: authMain, error: err1 } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Tumbal Get Addon" },
      });
    if (err1) throw new Error(`Supabase Admin Error 1: ${err1.message}`);
    userId = authMain.user.id;

    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Get Addon",
      },
    });

    // 2. Setup User Lain (Untuk IDOR) via Supabase
    const { data: authOther, error: err2 } =
      await supabase.auth.admin.createUser({
        email: otherEmail,
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Tumbal Other" },
      });
    if (err2) throw new Error(`Supabase Admin Error 2: ${err2.message}`);
    otherUserId = authOther.user.id;

    await prisma.user.create({
      data: {
        id: otherUserId,
        supabase_id: otherUserId,
        email: otherEmail,
        name: "Tumbal Other",
      },
    });

    // 3. Login SEKALI SAJA untuk dapat Cookie User Utama
    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = loginResult.headers["set-cookie"];
  }, 20000);

  afterAll(async () => {
    // Bersihkan User di akhir file secara total (Prisma & Supabase)
    const activeUserIds = [userId, otherUserId].filter(Boolean);
    if (activeUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: activeUserIds } },
      });
      for (const id of activeUserIds) {
        try {
          await supabase.auth.admin.deleteUser(id);
        } catch (err) {}
      }
    }
  }, 20000);

  // =================================================================
  // ⚡ RESET LOKAL: Database Prisma Cepat Kilat (Tanpa Internet)
  // =================================================================
  beforeEach(async () => {
    const activeUserIds = [userId, otherUserId].filter(Boolean);

    // 1. Bersihkan sisa data test sebelumnya (Targeted Cleanup)
    await prisma.addon.deleteMany({
      where: { addon_group: { store: { user_id: { in: activeUserIds } } } },
    });
    await prisma.addonGroup.deleteMany({
      where: { store: { user_id: { in: activeUserIds } } },
    });
    await prisma.store.deleteMany({
      where: { user_id: { in: activeUserIds } },
    });

    // 2. Buatkan Toko Utama
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
    const otherStore = await prisma.store.create({
      data: {
        user_id: otherUserId,
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
    // Bersihkan data Toko & Addon setiap selesai 1 test case
    const activeUserIds = [userId, otherUserId].filter(Boolean);
    if (activeUserIds.length > 0) {
      await prisma.addon.deleteMany({
        where: { addon_group: { store: { user_id: { in: activeUserIds } } } },
      });
      await prisma.addonGroup.deleteMany({
        where: { store: { user_id: { in: activeUserIds } } },
      });
      await prisma.store.deleteMany({
        where: { user_id: { in: activeUserIds } },
      });
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("1. Should get all active Addon Groups and sort them by 'created_at' ASC", async () => {
    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(200);

    const data = result.body.data;
    // Harus nge-return 2 grup (Grup 3 yang dihapus dan Grup 4 milik orang lain tidak ikut)
    expect(data).toHaveLength(2);
    // Cek Sorting ASC (Grup terlama harus di index 0)
    expect(data[0].name).toBe("Grup Lama");
    expect(data[1].name).toBe("Grup Baru");
    // Cek Filter & Sorting Addon di dalam Grup
    const grupBaruAddons = data[1].addons;
    expect(grupBaruAddons).toHaveLength(2);
    expect(grupBaruAddons[0].name).toBe("Addon Baru 2"); // Karena created_at-nya lebih lama

    const grupLamaAddons = data[0].addons;
    expect(grupLamaAddons).toHaveLength(1); // Cuma 1 karena Addon ke-2 is_delete: true
    expect(grupLamaAddons[0].name).toBe("Addon Lama 1");
  }, 20000);

  test("2. Should return empty array if Store has no Addon Groups", async () => {
    // Hapus semua grup milik toko ini dulu
    await prisma.addonGroup.deleteMany({ where: { store_id: storeId } });

    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual([]); // Jangan return null, harus array kosong
  }, 20000);

  test("3. Should return 404 if User does NOT have an active store", async () => {
    // Hapus tokonya si user
    await prisma.store.deleteMany({ where: { user_id: userId } });

    const result = await supertest(web).get(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Store not found");
  }, 20000);

  test("4. Should return 401 when unauthorized (no cookie)", async () => {
    const result = await supertest(web).get(ENDPOINT);

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  }, 20000);
});
