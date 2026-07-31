import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";

const LOGIN_EMAIL = "test_delete_addon@gmail.com";
const LOGIN_PASSWORD = "password123";

describe("DELETE /api/stores/addon-groups/:addonGroupId", () => {
  let cookies = [];
  let userId = "";
  let storeId = null;

  let targetGroupId = "";
  let addon1_Id = "";
  let addon2_Id = "";

  let otherUserGroupId = "";

  beforeEach(async () => {
    // 1. Bersihkan semua tabel terkait dari child ke parent
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.productAddonGroup.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "hacker@gmail.com" } });

    // 2. Register dan Login
    await supertest(web).post("/api/users").send({
      email: LOGIN_EMAIL,
      name: "User Delete",
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
      data: { user_id: userId, name: "Toko Delete", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // 4. Bikin Grup Target Delete
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

    // 5. Bikin data hacker untuk tes IDOR (Biar user ga bisa hapus grup toko lain)
    const hacker = await prisma.user.create({
      data: {
        email: "hacker@gmail.com",
        name: "Hacker",
        supabase_id: uuidv4(),
      },
    });
    const hackerStore = await prisma.store.create({
      data: {
        user_id: hacker.id,
        name: "Toko Hacker",
        timezone: "Asia/Jakarta",
      },
    });
    const hackerGroup = await prisma.addonGroup.create({
      data: {
        store_id: hackerStore.id,
        name: "Topping Hacker",
        created_at: new Date(),
      },
    });
    otherUserGroupId = hackerGroup.id;
  }, 20000);

  afterEach(async () => {
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.productAddonGroup.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.addon.deleteMany({});
    await prisma.addonGroup.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({ where: { email: LOGIN_EMAIL } });
    await prisma.user.deleteMany({ where: { email: "hacker@gmail.com" } });
  });

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
