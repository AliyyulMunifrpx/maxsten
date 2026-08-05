import supertest from "supertest";
import path from "path";
import fsPromises from "fs/promises";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const ENDPOINT = "/api/stores/me";

describe("delete store", () => {
  let cookies = [];
  let testEmail = "";
  let userId = "";
  let createdStoreIds = [];

  beforeEach(async () => {
    // 1. Generate email unik
    testEmail = `store_delete_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Store Delete",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId, // Hapus jika Prisma ID pakai auto-generate default
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Store Delete",
      },
    });

    // 4. Login untuk dapatkan tiket masuk (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });

    cookies = result.headers["set-cookie"];

    // Gak perlu lagi hapus toko lama di sini, karena user ini 100% baru lahir
    createdStoreIds = [];
  }, 20000);

  afterEach(async () => {
    // 1. Hapus semua toko yang dibuat selama test (Pencarian pakai public_id)
    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }

    // 2. Hapus user tumbal dari Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 3. Hapus user tumbal dari Supabase Auth
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // best-effort cleanup
      }
    }
  }, 20000);

  async function createStoreDirect(name, overrides = {}) {
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        name,
        description: "Warung test",
        timezone: "Asia/Jakarta",
        street_address: "Jl. Test No. 1",
        village: "Tonoboyo",
        district: "Bandongan",
        city: "KAB. MAGELANG",
        province: "JAWA TENGAH",
        postal_code: "56151",
        latitude: -7.5849,
        longitude: 110.2754,
        is_delete: false,
        ...overrides,
      },
    });
    createdStoreIds.push(store.public_id);
    return store;
  }

  test("should soft-delete the store and respond with { data: 'OK' }", async () => {
    const created = await createStoreDirect("Warung Mau Dihapus");

    const result = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");

    // Cari lewat public_id
    const store = await prisma.store.findUnique({
      where: { public_id: created.public_id },
    });
    expect(store.is_delete).toBe(true);
    expect(store.name).toBe("Warung Mau Dihapus");
    expect(store.description).toBe("Warung test");
    expect(store.timezone).toBe("Asia/Jakarta");
  }, 20000);

  test("should detach the store from the user (user_id set to null) on soft-delete", async () => {
    const created = await createStoreDirect("Warung Cek Detach");

    const result = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(result.status).toBe(200);

    const store = await prisma.store.findUnique({
      where: { public_id: created.public_id },
    });
    expect(store.user_id).toBeNull();
  }, 20000);

  test("should return 404 when the user has no store", async () => {
    const result = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(result.status).toBe(404);
  }, 20000);

  test("should return 401 when unauthorized", async () => {
    await createStoreDirect("Warung Tanpa Login Hapus");

    const result = await supertest(web).delete(ENDPOINT); // Tanpa cookie
    expect(result.status).toBe(401);
  }, 20000);

  test("should return 404 on a repeated delete call for an already-deleted store", async () => {
    await createStoreDirect("Warung Hapus Dua Kali");

    const first = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(first.status).toBe(200);

    const second = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(second.status).toBe(404);
  }, 20000);

  test("a soft-deleted store should no longer be returned by GET /api/stores (cross-endpoint consistency)", async () => {
    await createStoreDirect("Warung Konsistensi Get");

    const del = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(del.status).toBe(200);

    const get = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);
    expect(get.status).toBe(404);
  }, 20000);

  test("should allow creating a brand new store after the previous one was soft-deleted", async () => {
    await createStoreDirect("Warung Lama Dihapus");

    const del = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(del.status).toBe(200);

    const createResult = await supertest(web)
      .post("/api/stores")
      .set("Cookie", cookies)
      .send({
        name: "Warung Baru Setelah Hapus",
        description: "Toko baru",
        timezone: "Asia/Jakarta",
        street_address: "Jl. Baru No. 1",
        village: "Tonoboyo",
        district: "Bandongan",
        city: "KAB. MAGELANG",
        province: "JAWA TENGAH",
        postal_code: "56151",
        latitude: -7.5849,
        longitude: 110.2754,
      });

    if (createResult.status === 201) {
      createdStoreIds.push(createResult.body.data.public_id);
    }

    expect(createResult.status).toBe(201);
  }, 20000);

  test("should actually remove the logo file from disk on soft-delete", async () => {
    // 💡 PENINGKATAN: Pakai Date.now() biar aman kalau test dijalankan concurrent/parallel
    const logoRelativePath = `/uploads/delete-store-test-${Date.now()}.png`;
    const actualDiskPath = path.join(process.cwd(), "public", logoRelativePath);

    await fsPromises.mkdir(path.dirname(actualDiskPath), { recursive: true });
    await fsPromises.writeFile(actualDiskPath, "fake-image-content");

    await createStoreDirect("Warung Cek Hapus File Logo", {
      logo_url: logoRelativePath,
    });

    const del = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(del.status).toBe(200);

    // Mengecek apakah file sudah benar-benar hilang dari disk
    const stillExists = await fsPromises
      .access(actualDiskPath)
      .then(() => true)
      .catch(() => false);

    expect(stillExists).toBe(false);

    // Cleanup darurat kalau ternyata testnya gagal
    await fsPromises.unlink(actualDiskPath).catch(() => {});
  }, 20000);

  test("should not throw when the store has no logo file to delete", async () => {
    await createStoreDirect("Warung Tanpa Logo Dihapus", { logo_url: null });

    const del = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(del.status).toBe(200);
  }, 20000);
});
