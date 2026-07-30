import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const LOGIN_EMAIL = "aliyyulmunif780@gmail.com";
const LOGIN_PASSWORD = "aliyyul";

// ASUMSI ROUTE & FIELD NAME FILE: PATCH /api/stores/me/logo, multipart field
// bernama "logo". Sesuaikan kalau method/path/field name aslinya beda.
const ENDPOINT = "/api/stores/me/logo";
const FILE_FIELD = "logo";

// File fisik disimpan di <cwd>/public/uploads, dan logo_url yang tersimpan
// di DB berbentuk "/uploads/<filename>" (path publik, bukan path disk asli).
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Helper: convert logo_url ("/uploads/xxx.png") -> path fisik di disk
// ("<cwd>/public/uploads/xxx.png").
function logoUrlToDiskPath(logoUrl) {
  return path.join(process.cwd(), "public", logoUrl);
}

function baseProfilePayload(name) {
  return {
    name,
    description: "Warung makan terenak sedunia",
    timezone: "Asia/Jakarta",
    street_address: "Jl. Magelang No. 123",
    village: "Tonoboyo",
    district: "Bandongan",
    city: "KAB. MAGELANG",
    province: "JAWA TENGAH",
    postal_code: "56151",
    latitude: -7.5849,
    longitude: 110.2754,
    payment_timeout: 15,
  };
}

describe("update store logo", () => {
  let cookies = [];
  let userId;
  let createdStoreIds = [];
  let createdFilePaths = [];

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
    createdFilePaths = [];

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }, 20000);

  afterEach(async () => {
    vi.restoreAllMocks();

    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }

    // Bersihin file fisik yang sempat dibuat/diupload selama test, biar
    // gak numpuk sampah di folder uploads antar run.
    for (const filePath of createdFilePaths) {
      await fs.unlink(filePath).catch(() => {});
    }
  });

  async function createStoreDirect(name, { logoFileName } = {}) {
    let logo_url = null;

    if (logoFileName) {
      const filePath = path.join(UPLOAD_DIR, logoFileName);
      await fs.writeFile(filePath, "fake-old-logo-bytes");
      createdFilePaths.push(filePath);
      logo_url = `/uploads/${logoFileName}`;
    }

    const store = await prisma.store.create({
      data: {
        user_id: userId,
        ...baseProfilePayload(name),
        logo_url,
        is_delete: false,
      },
    });
    createdStoreIds.push(store.public_id);
    return store;
  }

  function attachNewLogo(req, filename = "new-logo.png") {
    return req.attach(FILE_FIELD, Buffer.from("fake-new-logo-bytes"), filename);
  }

  test("should return 400 when no file is provided, and should not touch the store", async () => {
    const store = await createStoreDirect("Warung Logo Kosong");

    const result = await supertest(web).patch(ENDPOINT).set("Cookie", cookies);

    expect(result.status).toBe(400);

    const fresh = await prisma.store.findFirst({ where: { user_id: userId } });
    expect(fresh.logo_url).toBe(store.logo_url);
  });

  test("should return 404 when the user has no store", async () => {
    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(404);
  });

  test("should return 401 when unauthorized", async () => {
    await createStoreDirect("Warung Logo Tanpa Login");

    const result = await attachNewLogo(supertest(web).patch(ENDPOINT));

    expect(result.status).toBe(401);
  });

  test("should not error out when the store previously had no logo, and should save the new one", async () => {
    await createStoreDirect("Warung Logo Baru", { logoFileName: null });

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(200);
    expect(result.body.data.logo_url).toMatch(/^\/uploads\/.+/);

    // catat file baru biar ke-cleanup di afterEach
    createdFilePaths.push(logoUrlToDiskPath(result.body.data.logo_url));
  });

  test("happy path: deletes the old logo file on disk, saves the new one, and returns fresh store data", async () => {
    await createStoreDirect("Warung Logo Lama", {
      logoFileName: "old-logo-happy.png",
    });
    const oldFilePath = path.join(UPLOAD_DIR, "old-logo-happy.png");
    expect(fsSync.existsSync(oldFilePath)).toBe(true);

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(200);
    expect(result.body.data.logo_url).toMatch(/^\/uploads\/.+/);
    expect(typeof result.body.data.is_open).toBe("boolean");

    // file lama harus udah kehapus dari disk
    expect(fsSync.existsSync(oldFilePath)).toBe(false);

    const newFilePath = logoUrlToDiskPath(result.body.data.logo_url);
    expect(fsSync.existsSync(newFilePath)).toBe(true);
    createdFilePaths.push(newFilePath);
  });

  // Ini spy fs.unlink doang (bukan mock total), sisanya (DB, upload file
  // baru) tetap jalan beneran lewat request HTTP. Tujuannya nyimulasiin
  // "file lama gagal dihapus karena bukan ENOENT" tanpa perlu bikin
  // permission error beneran di disk test.
  test("logs a warning but still returns 200 when deleting the old logo fails for a non-ENOENT reason", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const store = await createStoreDirect("Warung Logo Gagal Hapus", {
      logoFileName: "old-logo-eacces.png",
    });
    const oldFilePath = path.join(UPLOAD_DIR, "old-logo-eacces.png");

    // PENTING: store_service manggil fs.unlink dengan RELATIVE path
    // (path.join("public", logoUrl), contoh "public/uploads/xxx.png"),
    // sedangkan oldFilePath di test ini ABSOLUTE. Makanya harus di-resolve
    // dulu keduanya sebelum dibandingin, kalau enggak gak akan pernah match.
    const originalUnlink = fs.unlink.bind(fs);
    const unlinkSpy = vi.spyOn(fs, "unlink").mockImplementation((p) => {
      if (path.resolve(String(p)) === path.resolve(oldFilePath)) {
        return Promise.reject(
          Object.assign(new Error("EACCES"), { code: "EACCES" }),
        );
      }
      return originalUnlink(p);
    });

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );
    expect(result.status).toBe(200);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`store ${store.id}`),
    );

    unlinkSpy.mockRestore();
    // file lama masih ketinggalan di disk karena "gagal dihapus" -> bersihin manual
    createdFilePaths.push(oldFilePath);
    createdFilePaths.push(logoUrlToDiskPath(result.body.data.logo_url));
  });

  test("does not log anything when the old logo file was already gone (ENOENT)", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const store = await createStoreDirect("Warung Logo Sudah Hilang", {
      logoFileName: "old-logo-enoent.png",
    });
    const oldFilePath = path.join(UPLOAD_DIR, "old-logo-enoent.png");
    // hapus manual duluan biar app beneran nemu ENOENT pas nyoba unlink
    await fs.unlink(oldFilePath);
    createdFilePaths = createdFilePaths.filter((p) => p !== oldFilePath);

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(200);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    createdFilePaths.push(logoUrlToDiskPath(result.body.data.logo_url));
  });

  // CATATAN: skenario "DB update gagal -> file lama gak boleh kesentuh,
  // file baru yang barusan diupload harus dibersihin" sengaja gak
  // diduplikasi di sini. Itu lebih pas diuji sebagai unit test dengan
  // prisma.store.update di-mock reject (kayak versi lama), karena bikin
  // DB beneran gagal di tengah integration test itu gak praktis/reliable.
});
