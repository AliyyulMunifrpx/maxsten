import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

// 🔥 PERBAIKAN: Hapus import path dan fs/promises!

const ENDPOINT = "/api/stores/me";

// Buffer gambar transparan kecil untuk disuntikkan ke Supabase selama testing
const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

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
        id: userId,
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

    createdStoreIds = [];
  }, 20000);

  afterEach(async () => {
    // 1. Bersihkan sisa gambar di Supabase jika ada test yang gagal di tengah jalan
    if (createdStoreIds.length > 0) {
      const storesToDelete = await prisma.store.findMany({
        where: { public_id: { in: createdStoreIds } },
        select: { logo_url: true },
      });

      for (const store of storesToDelete) {
        if (store.logo_url && store.logo_url.includes("supabase.co")) {
          const parts = store.logo_url.split("/store-logos/");
          if (parts.length > 1) {
            await supabase.storage
              .from("store-logos")
              .remove([parts[1]])
              .catch(() => {});
          }
        }
      }
    }

    // 2. Hapus semua toko yang dibuat selama test (Pencarian pakai public_id)
    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }

    // 3. Hapus user tumbal dari Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 4. Hapus user tumbal dari Supabase Auth
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
    console.log("DEBUG: result.status", result.status, "result.body", result.body);
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

  test("should actually remove the logo file from Supabase on soft-delete", async () => {
    // 1. Upload logo "bohongan" langsung ke Supabase pakai client SDK
    const fileNameOnly = `test-delete-${Date.now()}.png`;
    const fullPath = `images/${fileNameOnly}`;

    await supabase.storage
      .from("store-logos")
      .upload(fullPath, FAKE_LOGO_BUFFER, { contentType: "image/png" });

    // Dapatkan Public URL-nya untuk disimpan ke Database
    const { data: publicUrlData } = supabase.storage
      .from("store-logos")
      .getPublicUrl(fullPath);

    // 2. Buat toko di Database dengan URL Supabase tersebut
    await createStoreDirect("Warung Cek Hapus File Logo", {
      logo_url: publicUrlData.publicUrl,
    });

    // 3. Eksekusi API Delete Store
    const del = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(del.status).toBe(200);

    // 4. Mengecek apakah file sudah benar-benar hilang dari Supabase Bucket
    const { data: fileList } = await supabase.storage
      .from("store-logos")
      .list("images");

    // Cari apakah masih ada file dengan nama yang kita buat tadi
    const stillExists =
      fileList && fileList.some((f) => f.name === fileNameOnly);

    // Ekspektasi: File harus sudah hilang dari bucket
    expect(stillExists).toBe(false);
  }, 20000);

  test("should not throw when the store has no logo file to delete", async () => {
    await createStoreDirect("Warung Tanpa Logo Dihapus", { logo_url: null });

    const del = await supertest(web).delete(ENDPOINT).set("Cookie", cookies);
    expect(del.status).toBe(200);
  }, 20000);
});
