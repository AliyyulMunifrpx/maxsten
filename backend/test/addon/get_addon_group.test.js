import supertest from "supertest";
import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";

describe("GET /api/stores/addon-groups/:addonGroupId", () => {
  let cookies = [];

  // User Scope
  let testEmail = "";
  let userId = "";
  let otherEmail = "";
  let otherUserId = "";

  // Data Scope
  let storeId = null;
  let activeAddonGroupId = "";
  let deletedAddonGroupId = "";
  let otherStoreId = null;
  let otherUserAddonGroupId = "";

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Setup dilakukan CUMA 1 KALI di awal file
  // =================================================================
  beforeAll(async () => {
    testEmail = `get_addon_${Date.now()}@gmail.com`;
    otherEmail = `other_get_addon_${Date.now()}@gmail.com`;

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

    // 3. Login SEKALI SAJA untuk User Utama
    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = loginResult.headers["set-cookie"];

    // 4. Buat Store milik User Utama
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Toko Utama",
        timezone: "Asia/Jakarta",
      },
    });
    storeId = store.id;

    // 5. Buat Addon Group AKTIF beserta Addon-nya
    activeAddonGroupId = uuidv4();
    await prisma.addonGroup.create({
      data: {
        id: activeAddonGroupId,
        store_id: storeId,
        name: "Topping Minuman",
        created_at: new Date(),
        addons: {
          create: [
            { id: uuidv4(), name: "Boba", price: 3000, created_at: new Date() },
            {
              id: uuidv4(),
              name: "Keju (Habis)",
              price: 4000,
              is_delete: true, // 👈 Sengaja di soft-delete
              created_at: new Date(),
            },
          ],
        },
      },
    });

    // 6. Buat Addon Group SOFT-DELETE milik User Utama
    deletedAddonGroupId = uuidv4();
    await prisma.addonGroup.create({
      data: {
        id: deletedAddonGroupId,
        store_id: storeId,
        name: "Topping Makanan (Dihapus)",
        is_delete: true,
        created_at: new Date(),
      },
    });

    // 7. Buat Toko & Addon Group milik Orang Lain
    const otherStore = await prisma.store.create({
      data: {
        user_id: otherUserId,
        name: "Toko Orang Lain",
        timezone: "Asia/Jakarta",
      },
    });
    otherStoreId = otherStore.id;

    otherUserAddonGroupId = uuidv4();
    await prisma.addonGroup.create({
      data: {
        id: otherUserAddonGroupId,
        store_id: otherStoreId,
        name: "Topping Rahasia",
        created_at: new Date(),
      },
    });
  }, 20000);

  // =================================================================
  // ⚡ CLEANUP UTAMA: Dilakukan CUMA 1 KALI di akhir (Anti-Tubrukan)
  // =================================================================
  afterAll(async () => {
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
      await prisma.user.deleteMany({
        where: { id: { in: activeUserIds } },
      });

      // Hapus dari Supabase
      for (const id of activeUserIds) {
        try {
          await supabase.auth.admin.deleteUser(id);
        } catch (err) {}
      }
    }
  }, 20000);

  // ====================== TEST CASES ====================== //

  test("1. Should return 200 and Addon Group data successfully", async () => {
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/${activeAddonGroupId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.id).toBe(activeAddonGroupId);
    expect(result.body.data.name).toBe("Topping Minuman");
    expect(result.body.data.created_at).toBeDefined();

    // Pastikan addon yang ter-load HANYA yang aktif (is_delete: false)
    expect(result.body.data.addons).toHaveLength(1);
    expect(result.body.data.addons[0].name).toBe("Boba");
  }, 20000);

  test("2. Should return 401 when unauthorized (no cookie)", async () => {
    const result = await supertest(web).get(
      `/api/stores/addon-groups/${activeAddonGroupId}`,
    );

    expect(result.status).toBe(401);
  }, 20000);

  test("3. Should return 400 when addonGroupId is NOT a valid UUID", async () => {
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/bukan-uuid-yang-valid`)
      .set("Cookie", cookies);

    // Ditolak oleh Joi Validation
    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  }, 20000);

  test("4. Should return 404 when Addon Group UUID does not exist in database", async () => {
    const randomUuid = uuidv4();
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/${randomUuid}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe(
      "The add-on group was not found, or you do not have access",
    );
  }, 20000);

  test("5. Should return 404 when Addon Group is already soft-deleted", async () => {
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/${deletedAddonGroupId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe(
      "The add-on group was not found, or you do not have access",
    );
  }, 20000);

  test("6. [SECURITY] Should return 404 when trying to access OTHER USER's Addon Group", async () => {
    // User login dengan akun utama, tapi nembak ID Addon Group punya toko orang lain
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/${otherUserAddonGroupId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe(
      "The add-on group was not found, or you do not have access",
    );
  }, 20000);
});
