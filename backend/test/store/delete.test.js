import supertest from "supertest";
import path from "path";
import fsPromises from "fs/promises";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const LOGIN_EMAIL = "aliyyulmunif780@gmail.com";
const LOGIN_PASSWORD = "aliyyul";

// ASUMSI ROUTE: DELETE /api/stores. Sesuaikan kalau path aslinya beda.
const ENDPOINT = "/api/delete-store";

describe("delete store", () => {
  let cookies = [];
  let userId;
  let createdStoreIds = [];

  beforeEach(async () => {
    const result = await supertest(web).post(`/api/users/login`).send({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });
    cookies = result.headers["set-cookie"];

    const user = await prisma.user.findUnique({
      where: { email: LOGIN_EMAIL },
    });
    userId = user.id;

    await prisma.store.deleteMany({ where: { user_id: userId } });
    createdStoreIds = [];
  }, 20000);

  afterEach(async () => {
    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }
  });

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

    const result = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(200);
    expect(result.body.data).toBe("OK");

    // Cari lewat public_id, BUKAN user_id - karena implementasi sekarang
    // nge-null-in user_id pas soft-delete, jadi query by user_id gak akan
    // ketemu row ini lagi.
    const store = await prisma.store.findUnique({
      where: { public_id: created.public_id },
    });
    expect(store.is_delete).toBe(true);
    expect(store.name).toBe("Warung Mau Dihapus");
    expect(store.description).toBe("Warung test");
    expect(store.timezone).toBe("Asia/Jakarta");
  });

  test("should detach the store from the user (user_id set to null) on soft-delete", async () => {
    const created = await createStoreDirect("Warung Cek Detach");

    const result = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);
    expect(result.status).toBe(200);

    const store = await prisma.store.findUnique({
      where: { public_id: created.public_id },
    });
    expect(store.user_id).toBeNull();
  });

  test("should return 404 when the user has no store", async () => {
    const result = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(404);
  });

  test("should return 401 when unauthorized", async () => {
    await createStoreDirect("Warung Tanpa Login Hapus");

    const result = await supertest(web).patch(ENDPOINT);

    expect(result.status).toBe(401);
  });

  test("should return 404 on a repeated delete call for an already-deleted store", async () => {
    await createStoreDirect("Warung Hapus Dua Kali");

    const first = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);
    expect(first.status).toBe(200);

    const second = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);
    expect(second.status).toBe(404);
  });

  test("a soft-deleted store should no longer be returned by GET /api/stores (cross-endpoint consistency)", async () => {
    await createStoreDirect("Warung Konsistensi Get");

    const del = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);
    expect(del.status).toBe(200);

    const get = await supertest(web)
      .get("/api/stores/me")
      .set("Cookie", cookies);
    expect(get.status).toBe(404);
  });

  // Ini nge-test kekhawatiran paling penting soal soft-delete: apakah
  // createStore benar-benar mengabaikan store yang is_delete=true saat
  // ngecek "user sudah punya toko?". Kalau test ini gagal (dapat 400
  // "You already have a store"), berarti ada bug nyata - user yang
  // menghapus tokonya jadi TERKUNCI dan gak bisa pernah bikin toko baru.
  test("should allow creating a brand new store after the previous one was soft-deleted", async () => {
    await createStoreDirect("Warung Lama Dihapus");

    const del = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);
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

  // PENTING: test ini nulis file BENERAN ke disk di lokasi yang sama kayak
  // updateLogo (public/uploads/...), lalu soft-delete, lalu cek apakah
  // file itu BENERAN ilang. Kalau kode deleteStore pakai path yang salah
  // (path.join(process.cwd(), logo_url) tanpa folder "public"), test ini
  // akan GAGAL karena file masih ada - itu bukti langsung path bug-nya.
  test("should actually remove the logo file from disk on soft-delete", async () => {
    const logoRelativePath = "/uploads/delete-store-test-logo.png";
    const actualDiskPath = path.join(process.cwd(), "public", logoRelativePath);

    await fsPromises.mkdir(path.dirname(actualDiskPath), { recursive: true });
    await fsPromises.writeFile(actualDiskPath, "fake-image-content");

    await createStoreDirect("Warung Cek Hapus File Logo", {
      logo_url: logoRelativePath,
    });

    const del = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);
    expect(del.status).toBe(200);

    const stillExists = await fsPromises
      .access(actualDiskPath)
      .then(() => true)
      .catch(() => false);

    expect(stillExists).toBe(false);

    // Jaga-jaga kalau assertion di atas gagal, bersihin fixture-nya biar
    // gak numpuk di repo.
    await fsPromises.unlink(actualDiskPath).catch(() => {});
  });

  test("should not throw when the store has no logo file to delete", async () => {
    await createStoreDirect("Warung Tanpa Logo Dihapus", { logo_url: null });

    const del = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);

    expect(del.status).toBe(200);
  });
});
