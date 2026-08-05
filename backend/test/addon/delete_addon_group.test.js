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

describe("DELETE /api/stores/addon-groups/:addonGroupId", () => {
  let cookies = [];

  // User Scope (Dibuat sekali di beforeAll)
  let testEmail = "";
  let userId = "";
  let hackerEmail = "";
  let hackerUserId = "";

  // Data Scope (Dibuat ulang di beforeEach)
  let storeId = null;
  let targetGroupId = "";
  let addon1_Id = "";
  let addon2_Id = "";

  let hackerStoreId = null;
  let otherUserGroupId = "";

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Hit Supabase CUMA 1 KALI untuk semua test
  // =================================================================
  beforeAll(async () => {
    testEmail = `delete_addon_${Date.now()}@gmail.com`;
    hackerEmail = `hacker_addon_${Date.now()}@gmail.com`;

    // 1. Setup User Utama via Supabase
    const { data: authMain, error: err1 } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Tumbal Main" },
      });
    if (err1) throw new Error(`Supabase Admin Error 1: ${err1.message}`);
    userId = authMain.user.id;
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Main",
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

    // 3. Login SEKALI SAJA untuk dapat Cookie User Utama
    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = loginResult.headers["set-cookie"];
  }, 20000);

  afterAll(async () => {
    // Bersihkan User di akhir file secara total (Prisma & Supabase)
    const userIds = [userId, hackerUserId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
      for (const id of userIds) {
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
    await prisma.guest.deleteMany({}); // Guest bebas dihapus semua krn gak punya parent

    // 2. Buatkan Toko Aktif (User Utama)
    const store = await prisma.store.create({
      data: { user_id: userId, name: "Toko Delete", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // 3. Bikin Grup Target Delete
    targetGroupId = uuidv4();
    addon1_Id = uuidv4();
    addon2_Id = uuidv4();

    await prisma.addonGroup.create({
      data: {
        id: targetGroupId,
        store_id: storeId,
        name: "Topping Hapus",
        created_at: new Date(),
        addons: {
          create: [
            {
              id: addon1_Id,
              name: "Coklat",
              price: 2000,
              created_at: new Date(),
            },
            {
              id: addon2_Id,
              name: "Keju",
              price: 3000,
              created_at: new Date(),
            },
          ],
        },
      },
    });

    // 4. Bikin Toko & Grup Addon untuk Hacker (Tes IDOR)
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
        name: "Topping Hacker",
        created_at: new Date(),
      },
    });
    otherUserGroupId = hackerGroup.id;
  }, 20000);

  afterEach(async () => {
    // Bersihkan data Toko & Addon setiap selesai 1 test case
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
    await prisma.guest.deleteMany({});
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("1. Should successfully soft-delete the Addon Group AND all its Addons", async () => {
    const result = await supertest(web)
      .delete(`/api/stores/addon-groups/${targetGroupId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");

    // PEMBUKTIAN KE DATABASE: Pastikan Parent dan Child status is_delete-nya jadi TRUE
    const deletedGroup = await prisma.addonGroup.findUnique({
      where: { id: targetGroupId },
    });
    expect(deletedGroup.is_delete).toBe(true);

    const deletedAddons = await prisma.addon.findMany({
      where: { addon_group_id: targetGroupId },
    });
    expect(deletedAddons).toHaveLength(2);
    // Loop untuk mastiin semua addon di dalamnya ikut terhapus
    deletedAddons.forEach((addon) => {
      expect(addon.is_delete).toBe(true);
    });
  });

  test("2. [SECURITY] Should return 404 when trying to delete ANOTHER USER's group", async () => {
    const result = await supertest(web)
      .delete(`/api/stores/addon-groups/${otherUserGroupId}`)
      .set("Cookie", cookies);

    // Harus 404, grup milik Hacker nggak boleh bisa dihapus sama User Utama
    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Addon group not found");
  });

  test("3. [BUSINESS LOGIC] Should return 409 if trying to delete Addon Group linked to an active queue", async () => {
    // A. Bikin Produk
    const product = await prisma.product.create({
      data: {
        store_id: storeId,
        name: "Es Teh",
        price: 5000,
        is_available: true,
        is_delete: false,
      },
    });

    // B. Hubungkan Produk dengan Addon Group
    await prisma.productAddonGroup.create({
      data: { product_id: product.id, addon_group_id: targetGroupId },
    });

    // C. Bikin Guest & Antrean Aktif (BELUM_BAYAR)
    const guest = await prisma.guest.create({ data: { id: uuidv4() } });
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    await prisma.queue.create({
      data: {
        store_id: storeId,
        guest_id: guest.id,
        queue_number: 1,
        expired_at: futureDate,
        status: "BELUM_BAYAR", // 👈 Status Aktif
        total_price: 5000,
        queueDetails: {
          create: [{ product_id: product.id, quantity: 1 }],
        },
      },
    });

    // D. Coba Hapus Grup Addon-nya
    const result = await supertest(web)
      .delete(`/api/stores/addon-groups/${targetGroupId}`)
      .set("Cookie", cookies);

    // E. Harus Ditolak (409)
    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("active queue");

    // F. PEMBUKTIAN DATABASE: Pastikan datanya batal dihapus (masih false)
    const groupInDb = await prisma.addonGroup.findUnique({
      where: { id: targetGroupId },
    });
    expect(groupInDb.is_delete).toBe(false);
  });

  test("4. Should return 404 if the Addon Group is already soft-deleted", async () => {
    // Simulasi grup udah dihapus duluan
    await prisma.addonGroup.update({
      where: { id: targetGroupId },
      data: { is_delete: true },
    });

    const result = await supertest(web)
      .delete(`/api/stores/addon-groups/${targetGroupId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Addon group not found");
  });

  test("5. Should return 404 if User's store is already deleted", async () => {
    // Hapus toko si user
    await prisma.store.update({
      where: { id: storeId },
      data: { is_delete: true },
    });

    const result = await supertest(web)
      .delete(`/api/stores/addon-groups/${targetGroupId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe("Store not found");
  });

  test("6. Should return 400 when addonGroupId is not a valid UUID", async () => {
    const result = await supertest(web)
      .delete(`/api/stores/addon-groups/bukan-uuid-123`)
      .set("Cookie", cookies);

    // Ditolak sama Joi validation
    expect(result.status).toBe(400);
  });
});
