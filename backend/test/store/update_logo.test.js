import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const ENDPOINT = "/api/stores/me/logo";
const FILE_FIELD = "logo";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Helper: convert logo_url ("/uploads/xxx.png") -> path fisik di disk
function logoUrlToDiskPath(logoUrl) {
  const cleanPath = logoUrl.startsWith("/") ? logoUrl.substring(1) : logoUrl;
  return path.join(process.cwd(), "public", cleanPath);
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
  let testEmail = "";
  let userId = "";
  let createdStoreIds = [];
  let createdFilePaths = [];

  beforeEach(async () => {
    // 1. Generate email unik per test
    testEmail = `update_logo_${Date.now()}@gmail.com`;

    // 2. Bikin akun langsung via Supabase Admin (Bypass email verifikasi)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        name: "Tumbal Update Logo",
      },
    });

    if (error) {
      throw new Error(`Supabase Admin Error: ${error.message}`);
    }

    userId = authData.user.id;

    // 3. Inject data ke Prisma
    await prisma.user.create({
      data: {
        id: userId, // Hapus jika Prisma ID lu pakai auto-generate UUID/Int
        supabase_id: userId,
        email: testEmail,
        name: "Tumbal Update Logo",
      },
    });

    // 4. Login untuk dapat tiket (cookie)
    const result = await supertest(web).post(`/api/users/login`).send({
      email: testEmail,
      password: "password123",
    });
    cookies = result.headers["set-cookie"];

    // 5. Reset Array.
    // Tidak butuh hapus toko lama karena user ini 100% fresh.
    createdStoreIds = [];
    createdFilePaths = [];

    // Pastikan folder uploads tersedia
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }, 20000);

  afterEach(async () => {
    vi.restoreAllMocks();

    // 1. Hapus Relasi Toko Prisma
    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }

    // 2. Hapus User dari tabel Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 3. Hapus User dari Supabase Auth
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // best-effort cleanup
      }
    }

    // 4. Bersihin file fisik yang sempat dibuat/diupload selama test
    for (const filePath of createdFilePaths) {
      await fs.unlink(filePath).catch(() => {});
    }
  }, 20000);

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
  }, 20000);

  test("should return 404 when the user has no store", async () => {
    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );
    expect(result.status).toBe(404);
  }, 20000);

  test("should return 401 when unauthorized", async () => {
    await createStoreDirect("Warung Logo Tanpa Login");

    const result = await attachNewLogo(supertest(web).patch(ENDPOINT)); // Tanpa cookie
    expect(result.status).toBe(401);
  }, 20000);

  test("should not error out when the store previously had no logo, and should save the new one", async () => {
    await createStoreDirect("Warung Logo Baru", { logoFileName: null });

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(200);
    expect(result.body.data.logo_url).toMatch(/^\/uploads\/.+/);

    createdFilePaths.push(logoUrlToDiskPath(result.body.data.logo_url));
  }, 20000);

  test("happy path: deletes the old logo file on disk, saves the new one, and returns fresh store data", async () => {
    // 💡 PENINGKATAN: Pakai Date.now() di nama file dummy biar terhindar dari tabrakan Race Condition di folder saat parallel test
    const oldFileName = `old-logo-happy-${Date.now()}.png`;

    await createStoreDirect("Warung Logo Lama", {
      logoFileName: oldFileName,
    });

    const oldFilePath = path.join(UPLOAD_DIR, oldFileName);
    expect(fsSync.existsSync(oldFilePath)).toBe(true);

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(200);
    expect(result.body.data.logo_url).toMatch(/^\/uploads\/.+/);
    expect(typeof result.body.data.is_open).toBe("boolean");

    expect(fsSync.existsSync(oldFilePath)).toBe(false);

    const newFilePath = logoUrlToDiskPath(result.body.data.logo_url);
    expect(fsSync.existsSync(newFilePath)).toBe(true);
    createdFilePaths.push(newFilePath);
  }, 20000);

  test("logs a warning but still returns 200 when deleting the old logo fails for a non-ENOENT reason", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const oldFileName = `old-logo-eacces-${Date.now()}.png`;
    const store = await createStoreDirect("Warung Logo Gagal Hapus", {
      logoFileName: oldFileName,
    });
    const oldFilePath = path.join(UPLOAD_DIR, oldFileName);

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
    createdFilePaths.push(oldFilePath);
    createdFilePaths.push(logoUrlToDiskPath(result.body.data.logo_url));
  }, 20000);

  test("does not log anything when the old logo file was already gone (ENOENT)", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const oldFileName = `old-logo-enoent-${Date.now()}.png`;
    const store = await createStoreDirect("Warung Logo Sudah Hilang", {
      logoFileName: oldFileName,
    });
    const oldFilePath = path.join(UPLOAD_DIR, oldFileName);

    // hapus manual duluan
    await fs.unlink(oldFilePath);
    createdFilePaths = createdFilePaths.filter((p) => p !== oldFilePath);

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(200);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    createdFilePaths.push(logoUrlToDiskPath(result.body.data.logo_url));
  }, 20000);
});
