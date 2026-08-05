import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
// 🚨 Import supabase admin & client
import { supabase } from "../../src/application/supabase.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const ENDPOINT = "/api/stores/me/logo";
const FILE_FIELD = "logo";
const BUCKET_NAME = "store-logos";

// Buffer gambar transparan kecil untuk disuntikkan ke API selama testing
const FAKE_LOGO_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

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
  let uploadedFileNames = []; // Menyimpan nama file Supabase untuk dibersihkan nanti

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
        id: userId,
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
    createdStoreIds = [];
    uploadedFileNames = [];
  }, 20000);

  afterEach(async () => {
    vi.restoreAllMocks();

    // 1. Hapus Relasi Toko Prisma & Catat logo URL yang tersisa
    if (createdStoreIds.length > 0) {
      const stores = await prisma.store.findMany({
        where: { public_id: { in: createdStoreIds } },
        select: { logo_url: true },
      });

      for (const store of stores) {
        if (store.logo_url && store.logo_url.includes("supabase.co")) {
          const parts = store.logo_url.split(`/${BUCKET_NAME}/`);
          if (parts.length > 1) {
            uploadedFileNames.push(parts[1]);
          }
        }
      }

      await prisma.store.deleteMany({
        where: { public_id: { in: createdStoreIds } },
      });
    }

    // 2. Bersihin file dari bucket Supabase yang sempat dibuat selama test
    if (uploadedFileNames.length > 0) {
      // Hilangkan nama duplikat sebelum menghapus
      const uniqueFiles = [...new Set(uploadedFileNames)];
      await supabase.storage
        .from(BUCKET_NAME)
        .remove(uniqueFiles)
        .catch(() => {});
    }

    // 3. Hapus User dari tabel Prisma
    if (testEmail) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }

    // 4. Hapus User dari Supabase Auth
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (err) {
        // best-effort cleanup
      }
    }
  }, 20000);

  async function createStoreDirect(name, { logoFileName } = {}) {
    let logo_url = null;

    if (logoFileName) {
      const fullPath = `images/${logoFileName}`;
      // Upload manual file fake ke Supabase
      await supabase.storage
        .from(BUCKET_NAME)
        .upload(fullPath, FAKE_LOGO_BUFFER, { contentType: "image/png" });

      uploadedFileNames.push(fullPath);

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fullPath);
      logo_url = data.publicUrl;
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
    return req.attach(FILE_FIELD, FAKE_LOGO_BUFFER, filename);
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
    expect(result.body.data.logo_url).toMatch(/supabase\.co/);
  }, 20000);

  test("happy path: deletes the old logo file in bucket, saves the new one, and returns fresh store data", async () => {
    const oldFileName = `old-logo-happy-${Date.now()}.png`;

    await createStoreDirect("Warung Logo Lama", {
      logoFileName: oldFileName,
    });

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(200);
    expect(result.body.data.logo_url).toMatch(/supabase\.co/);
    expect(typeof result.body.data.is_open).toBe("boolean");

    // Pastikan gambar lama sudah tidak ada di Supabase
    const { data: fileList } = await supabase.storage
      .from(BUCKET_NAME)
      .list("images");
    const stillExists =
      fileList && fileList.some((f) => f.name === oldFileName);
    expect(stillExists).toBe(false);
  }, 20000);

  test("does not log error when the old logo file was already missing in bucket", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const oldFileName = `old-logo-enoent-${Date.now()}.png`;
    const store = await createStoreDirect("Warung Logo Sudah Hilang", {
      logoFileName: oldFileName,
    });

    // Hapus manual file tersebut dari Supabase sebelum API dipanggil
    await supabase.storage.from(BUCKET_NAME).remove([`images/${oldFileName}`]);

    const result = await attachNewLogo(
      supertest(web).patch(ENDPOINT).set("Cookie", cookies),
    );

    expect(result.status).toBe(200);

    // Ekspektasi: Kode API mu menangkap (catch) error dengan silent kalau file tidak ada,
    // jadi console.error yang dilempar oleh API seharusnya tidak pernah dipanggil.
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  }, 20000);
});
