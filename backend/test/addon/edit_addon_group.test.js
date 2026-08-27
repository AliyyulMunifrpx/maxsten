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

const ENDPOINT_PREFIX = "/api/stores/addon-groups";

describe("PATCH /api/stores/addon-groups/:addonGroupId", () => {
  // 👇 UBAH 1: Ganti cookies jadi accessToken
  let accessToken = "";

  // User Scope (Dibuat sekali di beforeAll)
  let testEmail = "";
  let userId = "";
  let hackerEmail = "";
  let hackerUserId = "";

  // Data Scope (Direset di beforeEach)
  let storeId = null;
  let targetGroupId = "";
  let addon1_Id = "";
  let addon2_Id = "";
  let existingGroupName = "Topping Premium";

  let hackerStoreId = null;
  let otherUserGroupId = "";

  // Guest Tracking (Untuk Test 5)
  let guestId = "";

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Hit Supabase CUMA 1 KALI untuk semua test
  // =================================================================
  beforeAll(async () => {
    testEmail = `edit_addon_${Date.now()}@gmail.com`;
    hackerEmail = `hacker_edit_addon_${Date.now()}@gmail.com`;

    // 1. Setup User Utama via Supabase
    const { data: authMain, error: err1 } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Tumbal Edit Addon" },
      });
    if (err1) throw new Error(`Supabase Admin Error 1: ${err1.message}`);
    userId = authMain.user.id;
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Edit Addon",
      },
    });

    // 2. Setup Hacker via Supabase
    const { data: authHacker, error: err2 } =
      await supabase.auth.admin.createUser({
        email: hackerEmail,
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Tumbal Hacker" },
      });
    if (err2) throw new Error(`Supabase Admin Error 2: ${err2.message}`);
    hackerUserId = authHacker.user.id;
    await prisma.user.create({
      data: {
        id: hackerUserId,
        supabase_id: hackerUserId,
        email: hackerEmail,
        name: "Tumbal Hacker",
      },
    });

    // 3. Login SEKALI SAJA untuk dapat Access Token User Utama
    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });

    // 👇 UBAH 2: Tangkap access_token dari body JSON
    accessToken = loginResult.body.data.access_token;
  }, 20000);

  afterAll(async () => {
    // Bersihkan User di akhir file secara total (Prisma & Supabase)
    const activeUserIds = [userId, hackerUserId].filter(Boolean);
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
    const activeUserIds = [userId, hackerUserId].filter(Boolean);

    // 1. Bersihkan sisa data test sebelumnya (Targeted Cleanup)
    await prisma.queueDetail.deleteMany({
      where: { queue: { store: { user_id: { in: activeUserIds } } } },
    });
    await prisma.queue.deleteMany({
      where: { store: { user_id: { in: activeUserIds } } },
    });
    await prisma.productAddonGroup.deleteMany({
      where: { product: { store: { user_id: { in: activeUserIds } } } },
    });
    await prisma.product.deleteMany({
      where: { store: { user_id: { in: activeUserIds } } },
    });
    await prisma.addon.deleteMany({
      where: { addon_group: { store: { user_id: { in: activeUserIds } } } },
    });
    await prisma.addonGroup.deleteMany({
      where: { store: { user_id: { in: activeUserIds } } },
    });
    await prisma.store.deleteMany({
      where: { user_id: { in: activeUserIds } },
    });
    if (guestId) {
      await prisma.guest.deleteMany({ where: { id: guestId } });
      guestId = "";
    }

    // 2. Buatkan Toko Aktif (User Utama)
    const store = await prisma.store.create({
      data: { user_id: userId, name: "Toko Update", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // 3. Bikin Grup Target Edit
    targetGroupId = uuidv4();
    addon1_Id = uuidv4();
    addon2_Id = uuidv4();

    await prisma.addonGroup.create({
      data: {
        id: targetGroupId,
        store_id: storeId,
        name: "Topping Dasar",
        created_at: new Date(),
        addons: {
          create: [
            {
              id: addon1_Id,
              name: "Gula Normal",
              price: 0,
              created_at: new Date(),
            },
            {
              id: addon2_Id,
              name: "Gula Less",
              price: 0,
              created_at: new Date(),
            },
          ],
        },
      },
    });

    // 4. Bikin grup dummy untuk test error nama kembar (409)
    await prisma.addonGroup.create({
      data: {
        store_id: storeId,
        name: existingGroupName.trim().toLowerCase(),
        created_at: new Date(),
      },
    });

    // 5. Bikin Toko & Grup Hacker untuk tes IDOR
    const hackerStore = await prisma.store.create({
      data: {
        user_id: hackerUserId,
        name: "Toko Hacker",
        timezone: "Asia/Jakarta",
      },
    });
    hackerStoreId = hackerStore.id;

    const hackerGroup = await prisma.addonGroup.create({
      data: {
        store_id: hackerStoreId,
        name: "Topping Rahasia",
        created_at: new Date(),
      },
    });
    otherUserGroupId = hackerGroup.id;
  }, 20000);

  afterEach(async () => {
    // Bersihkan data Toko, Addon, & Queue setiap selesai 1 test case
    const activeUserIds = [userId, hackerUserId].filter(Boolean);
    if (activeUserIds.length > 0) {
      await prisma.queueDetail.deleteMany({
        where: { queue: { store: { user_id: { in: activeUserIds } } } },
      });
      await prisma.queue.deleteMany({
        where: { store: { user_id: { in: activeUserIds } } },
      });
      await prisma.productAddonGroup.deleteMany({
        where: { product: { store: { user_id: { in: activeUserIds } } } },
      });
      await prisma.product.deleteMany({
        where: { store: { user_id: { in: activeUserIds } } },
      });
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
    if (guestId) {
      await prisma.guest.deleteMany({ where: { id: guestId } });
      guestId = "";
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("1. Should successfully Update name, Update Addon, Add new Addon, and Delete missing Addon", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetGroupId}`)
      // 👇 UBAH 3: Inject Bearer Token
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Topping Dasar (Updated)",
        addons: [
          { id: addon1_Id, name: "Gula Normal (Updated)", price: 1000 },
          { name: "Extra Shot", price: 5000 }, // Baru
        ],
      });

    expect(result.status).toBe(200);
    expect(result.body.data.addons).toHaveLength(2);
  }, 20000);

  test("2. Should return 400 'Invalid add-on' if payload contains fake Addon ID", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetGroupId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Topping Dasar",
        addons: [{ id: uuidv4(), name: "Penyusup", price: 0 }],
      });

    expect(result.status).toBe(400);
  }, 20000);

  test("3. Should return 409 if renaming to an EXISTING group name", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetGroupId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: existingGroupName,
        addons: [{ id: addon1_Id, name: "Gula Normal", price: 0 }],
      });
    expect(result.status).toBe(409);
  }, 20000);

  test("4. [SECURITY] Should return 404 when trying to update ANOTHER USER's group", async () => {
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${otherUserGroupId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Bajak Nama",
        addons: [{ id: addon1_Id, name: "Gula Normal", price: 0 }],
      });
    expect(result.status).toBe(404);
  }, 20000);

  test("5. [BUSINESS LOGIC] Should return 409 if trying to edit Addon Group linked to an active queue", async () => {
    // A. Bikin Produk
    const product = await prisma.product.create({
      data: {
        store_id: storeId,
        name: "Kopi Hitam",
        price: 10000,
        is_available: true,
        is_delete: false,
      },
    });

    // B. Hubungkan Produk dengan Addon Group
    await prisma.productAddonGroup.create({
      data: { product_id: product.id, addon_group_id: targetGroupId },
    });

    // C. Bikin Guest & Antrean Aktif (DIPROSES)
    guestId = uuidv4();
    const guest = await prisma.guest.create({ data: { id: guestId } });
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    await prisma.queue.create({
      data: {
        store_id: storeId,
        guest_id: guest.id,
        queue_number: 1,
        expired_at: futureDate,
        status: "DIPROSES", // 👈 Status Aktif
        total_price: 10000,
        queueDetails: {
          create: [{ product_id: product.id, quantity: 1 }],
        },
      },
    });

    // D. Coba Edit Grup Addon-nya
    const result = await supertest(web)
      .patch(`${ENDPOINT_PREFIX}/${targetGroupId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Topping Dasar (Mau Ganti)",
        addons: [{ id: addon1_Id, name: "Gula Normal", price: 0 }],
      });

    // E. Harus Ditolak (409)
    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("active queue");
  }, 20000);
});
