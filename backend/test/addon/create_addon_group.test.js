import supertest from "supertest";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, test } from "vitest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";

const ENDPOINT = "/api/stores/addon-groups"; 

describe("POST /api/stores/addon-groups", () => {
  let cookies = [];
  
  // User Scope (Dibuat sekali di beforeAll)
  let testEmail = "";
  let userId = "";

  // Data Scope (Dibuat di beforeEach)
  let storeId = null;

  // =================================================================
  // ⚡ SEKSI SUPER RINGAN: Hit Supabase CUMA 1 KALI untuk semua test
  // =================================================================
  beforeAll(async () => {
    testEmail = `create_addon_${Date.now()}@gmail.com`;

    // 1. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: "Tumbal Addon" },
    });
    if (error) throw new Error(`Supabase Admin Error: ${error.message}`);
    userId = authData.user.id;

    // 2. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId,
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Addon",
      },
    });

    // 3. Login SEKALI SAJA untuk dapat Cookie
    const loginResult = await supertest(web).post("/api/users/login").send({
      email: testEmail,
      password: "password123",
    });
    cookies = loginResult.headers["set-cookie"];
  }, 20000);

  afterAll(async () => {
    // Bersihkan User di akhir file secara total
    await prisma.user.deleteMany({
      where: { id: userId }
    });
    if (userId) {
      try { await supabase.auth.admin.deleteUser(userId); } catch (err) {}
    }
  }, 20000);

  // =================================================================
  // ⚡ RESET LOKAL: Database Prisma Cepat Kilat (Tanpa Internet)
  // =================================================================
  beforeEach(async () => {
    // 1. Bersihkan sisa data milik user ini (Targeted Cleanup)
    await prisma.addon.deleteMany({
      where: { addon_group: { store: { user_id: userId } } }
    });
    await prisma.addonGroup.deleteMany({
      where: { store: { user_id: userId } }
    });
    await prisma.store.deleteMany({
      where: { user_id: userId }
    });

    // 2. Buatkan Toko Aktif
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
    // Bersihkan data Toko & Addon setiap selesai 1 test case
    await prisma.addon.deleteMany({
      where: { addon_group: { store: { user_id: userId } } }
    });
    await prisma.addonGroup.deleteMany({
      where: { store: { user_id: userId } }
    });
    await prisma.store.deleteMany({
      where: { user_id: userId }
    });
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
    expect(result.status).toBe(201);
    expect(result.body.data.name).toBe("topping minuman");
    expect(result.body.data.addons).toHaveLength(2);

    // Verifikasi ke DB
    const inDb = await prisma.addonGroup.findFirst({
      where: { name: "topping minuman", store_id: storeId },
      include: { addons: true },
    });
    expect(inDb).not.toBeNull();
    expect(inDb.addons).toHaveLength(2);
  }, 20000);

  test("2. Should create Addon Group successfully when 'addons' is sent as stringified JSON (FormData style)", async () => {
    const result = await supertest(web)
      .post(ENDPOINT)
      .set("Cookie", cookies)
      .send({
        name: "Topping Makanan",
        addons: JSON.stringify([{ name: "Ayam Suwir", price: 5000 }]), // Dikirim sebagai string
      });

    expect(result.status).toBe(201);
    expect(result.body.data.name).toBe("topping makanan");
  }, 20000);

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
  }, 20000);

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
  }, 20000);

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
  }, 20000);

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
        name: "Topping musiman",
        addons: [{ name: "Kurma", price: 5000 }],
      });

    // 3. Harus berhasil karena Partial Unique Index (WHERE is_delete = false) mengizinkannya
    expect(result.status).toBe(201);
    expect(result.body.data.name).toBe("topping musiman");
  }, 20000);

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
  }, 20000);
});