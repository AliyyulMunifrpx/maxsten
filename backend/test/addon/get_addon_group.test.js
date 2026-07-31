import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";

const LOGIN_EMAIL = "test_addongroup@gmail.com";
const LOGIN_PASSWORD = "password123";

describe("GET /api/stores/addon-groups/:addonGroupId", () => {
  let cookies = [];
  let userId = "";
  let storeId = null;
  let activeAddonGroupId = "";
  let deletedAddonGroupId = "";
  let otherUserAddonGroupId = "";

  beforeEach(async () => {
    // 1. Bersihkan data (dari child ke parent untuk hindari error Foreign Key)
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "other_user@gmail.com" } });

    // 2. Register dan Login untuk User Utama
    await supertest(web).post("/api/users").send({
      email: LOGIN_EMAIL,
      name: "User Addon Test",
      password: LOGIN_PASSWORD,
    });

    const result = await supertest(web).post(`/api/users/login`).send({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });

    cookies = result.headers["set-cookie"];
    const user = await prisma.user.findUnique({
      where: { email: LOGIN_EMAIL },
    });
    userId = user.id;

    // 3. Buat Store milik User Utama
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name: "Toko Utama",
        timezone: "Asia/Jakarta",
      },
    });
    storeId = store.id;

    // 4. Buat Addon Group AKTIF beserta Addon-nya (Ada yang aktif, ada yang soft-delete)
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
              is_delete: true,
              created_at: new Date(),
            }, // 👈 Sengaja di soft-delete
          ],
        },
      },
    });

    // 5. Buat Addon Group SOFT-DELETE (is_delete: true) milik User Utama
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

    // 6. Buat User & Toko Lain (Untuk simulasi celah keamanan IDOR)
    const otherUser = await prisma.user.create({
      data: {
        email: "other_user@gmail.com",
        name: "Orang Lain",
        supabase_id: uuidv4(),
      },
    });
    const otherStore = await prisma.store.create({
      data: {
        user_id: otherUser.id,
        name: "Toko Orang Lain",
        timezone: "Asia/Jakarta",
      },
    });

    otherUserAddonGroupId = uuidv4();
    await prisma.addonGroup.create({
      data: {
        id: otherUserAddonGroupId,
        store_id: otherStore.id,
        name: "Topping Rahasia",
        created_at: new Date(),
      },
    });
  }, 20000);

  afterEach(async () => {
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "other_user@gmail.com" } });
  });

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
  });

  test("2. Should return 401 when unauthorized (no cookie)", async () => {
    const result = await supertest(web).get(
      `/api/stores/addon-groups/${activeAddonGroupId}`,
    );

    expect(result.status).toBe(401);
  });

  test("3. Should return 400 when addonGroupId is NOT a valid UUID", async () => {
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/bukan-uuid-yang-valid`)
      .set("Cookie", cookies);

    // Ditolak oleh Joi Validation
    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  test("4. Should return 404 when Addon Group UUID does not exist in database", async () => {
    const randomUuid = uuidv4();
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/${randomUuid}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe(
      "The add-on group was not found, or you do not have access",
    );
  });

  test("5. Should return 404 when Addon Group is already soft-deleted", async () => {
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/${deletedAddonGroupId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe(
      "The add-on group was not found, or you do not have access",
    );
  });

  test("6. [SECURITY] Should return 404 when trying to access OTHER USER's Addon Group", async () => {
    // User login dengan akun utama, tapi nembak ID Addon Group punya toko orang lain
    const result = await supertest(web)
      .get(`/api/stores/addon-groups/${otherUserAddonGroupId}`)
      .set("Cookie", cookies);

    expect(result.status).toBe(404);
    expect(result.body.errors).toBe(
      "The add-on group was not found, or you do not have access",
    );
  });
});
