import supertest from "supertest";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { v4 as uuidv4 } from "uuid";

const LOGIN_EMAIL = "test_edit_addon@gmail.com";
const LOGIN_PASSWORD = "password123";

describe("PATCH /api/stores/addon-groups/:addonGroupId", () => {
  let cookies = [];
  let userId = "";
  let storeId = null;

  let targetGroupId = "";
  let addon1_Id = "";
  let addon2_Id = "";

  let existingGroupName = "Topping Premium";
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
      name: "User Update",
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
      data: { user_id: userId, name: "Toko Update", timezone: "Asia/Jakarta" },
    });
    storeId = store.id;

    // 4. Bikin Grup Target Edit
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

    // 5. Bikin grup dummy untuk error nama kembar
    await prisma.addonGroup.create({
      data: {
        store_id: storeId,
        name: existingGroupName,
        created_at: new Date(),
      },
    });

    // 6. Bikin data hacker untuk IDOR
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
        name: "Topping Rahasia",
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

  test("1. Should successfully Update name, Update Addon, Add new Addon, and Delete missing Addon", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/addon-groups/${targetGroupId}`)
      .set("Cookie", cookies)
      .send({
        name: "Topping Dasar (Updated)",
        addons: [
          { id: addon1_Id, name: "Gula Normal (Updated)", price: 1000 },
          { name: "Extra Shot", price: 5000 }, // Baru
        ],
      });

    expect(result.status).toBe(200);
    expect(result.body.data.addons).toHaveLength(2);
  });

  test("2. Should return 400 'Invalid add-on' if payload contains fake Addon ID", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/addon-groups/${targetGroupId}`)
      .set("Cookie", cookies)
      .send({
        name: "Topping Dasar",
        addons: [{ id: uuidv4(), name: "Penyusup", price: 0 }],
      });

    expect(result.status).toBe(400);
  });

  test("3. Should return 409 if renaming to an EXISTING group name", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/addon-groups/${targetGroupId}`)
      .set("Cookie", cookies)
      .send({
        name: existingGroupName,
        addons: [{ id: addon1_Id, name: "Gula Normal", price: 0 }],
      });

    expect(result.status).toBe(409);
  });

  test("4. [SECURITY] Should return 404 when trying to update ANOTHER USER's group", async () => {
    const result = await supertest(web)
      .patch(`/api/stores/addon-groups/${otherUserGroupId}`)
      .set("Cookie", cookies)
      .send({ name: "Bajak Nama", addons: [] });

    expect(result.status).toBe(404);
  });

  // 👇 INI TEST BARU UNTUK CEK ANTREAN AKTIF 👇
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
    const guest = await prisma.guest.create({ data: { id: uuidv4() } });
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
      .patch(`/api/stores/addon-groups/${targetGroupId}`)
      .set("Cookie", cookies)
      .send({
        name: "Topping Dasar (Mau Ganti)",
        addons: [],
      });

    // E. Harus Ditolak (409)
    expect(result.status).toBe(409);
    expect(result.body.errors).toContain("active queue");
  });
});
