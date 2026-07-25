import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// ASUMSI PATH: sesuaikan kalau lokasi service/error/database beda di repo lu.
vi.mock("../../src/application/database.js", () => ({
  prisma: {
    store: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("fs/promises", () => ({
  default: { unlink: vi.fn() },
  unlink: vi.fn(),
}));

import fs from "fs/promises";
import { prisma } from "../../src/application/database.js";
import storeService from "../../src/service/store_service.js";

// getStore mensyaratkan userId berupa UUID (getStoreValidation), makanya
// pakai string UUID valid, bukan angka biasa kayak sebelumnya.
const FAKE_USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

// Helper: bentuk objek store yang cukup lengkap buat dua pemanggilan
// findFirst di dalam updateLogo -> getStore (termasuk field yang dipakai
// calculateStoreStatus, biar gak throw pas getStore beneran jalan).
function makeFakeStore(overrides = {}) {
  return {
    id: 1,
    public_id: "store-public-id-123",
    name: "Toko",
    logo_url: "/uploads/old-logo.png",
    timezone: "Asia/Jakarta",
    manual_status: null,
    manual_updated_at: null,
    operational_hours: [],
    ...overrides,
  };
}

describe("updateLogo (unit, mocked prisma + fs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should throw 400 when no file is provided, without touching the DB", async () => {
    await expect(
      storeService.updateLogo(FAKE_USER_ID, null),
    ).rejects.toMatchObject({
      status: 400,
    });
    expect(prisma.store.findFirst).not.toHaveBeenCalled();
  });

  test("should throw 404 when the user has no store", async () => {
    prisma.store.findFirst.mockResolvedValue(null);

    await expect(
      storeService.updateLogo(FAKE_USER_ID, { filename: "new-logo.png" }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  test("should not attempt to delete anything when the store previously had no logo", async () => {
    // Panggilan pertama (di dalam updateLogo): store belum punya logo.
    // Panggilan kedua (di dalam getStore, setelah update): logo baru udah ada.
    prisma.store.findFirst
      .mockResolvedValueOnce(makeFakeStore({ logo_url: null }))
      .mockResolvedValueOnce(
        makeFakeStore({ logo_url: "/uploads/new-logo.png" }),
      );
    prisma.store.update.mockResolvedValue(
      makeFakeStore({ logo_url: "/uploads/new-logo.png" }),
    );

    const result = await storeService.updateLogo(FAKE_USER_ID, {
      filename: "new-logo.png",
    });

    expect(fs.unlink).not.toHaveBeenCalled();
    expect(result.logo_url).toBe("/uploads/new-logo.png");
  });

  test("happy path: deletes the old logo, saves the new path, and returns the fresh store via getStore", async () => {
    prisma.store.findFirst
      .mockResolvedValueOnce(
        makeFakeStore({ logo_url: "/uploads/old-logo.png" }),
      )
      .mockResolvedValueOnce(
        makeFakeStore({ logo_url: "/uploads/new-logo.png" }),
      );
    fs.unlink.mockResolvedValue(undefined);
    prisma.store.update.mockResolvedValue(
      makeFakeStore({ logo_url: "/uploads/new-logo.png" }),
    );

    const result = await storeService.updateLogo(FAKE_USER_ID, {
      filename: "new-logo.png",
    });

    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink.mock.calls[0][0]).toMatch(/old-logo\.png$/);
    // Ini sekarang datang dari getStore, bukan langsung dari
    // prisma.store.update - makanya harus ke-cover field khas getStore juga.
    expect(result.logo_url).toBe("/uploads/new-logo.png");
    expect(typeof result.is_open).toBe("boolean");
  });

  // FIXED: urutan operasi bener - DB diupdate DULU. Kalau DB gagal, file
  // LAMA gak boleh kesentuh sama sekali, dan file BARU yang barusan
  // diupload harus dibersihin biar gak orphan.
  test("FIXED: does not touch the old logo when the DB update fails, and cleans up the newly uploaded file instead", async () => {
    prisma.store.findFirst.mockResolvedValue(
      makeFakeStore({ logo_url: "/uploads/old-logo.png" }),
    );
    prisma.store.update.mockRejectedValue(new Error("DB connection lost"));
    fs.unlink.mockResolvedValue(undefined); // cleanup file baru "berhasil"

    await expect(
      storeService.updateLogo(FAKE_USER_ID, { filename: "new-logo.png" }),
    ).rejects.toThrow("DB connection lost");

    // unlink cuma boleh kepanggil SEKALI, dan itu buat file BARU (cleanup),
    // bukan buat file lama. getStore juga gak boleh sempat kepanggil.
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink.mock.calls[0][0]).toMatch(/new-logo\.png$/);
    expect(prisma.store.findFirst).toHaveBeenCalledTimes(1);
  });

  // Batasan yang masih ada: kalau unlink file LAMA gagal karena alasan
  // selain ENOENT (misal permission denied), file itu tetap jadi orphan
  // di disk - tapi DB-nya tetap konsisten (nunjuk ke file baru yang valid),
  // gak ada lagi broken reference. Errornya di-log dengan konteks store id
  // + path biar gampang di-grep di prod.
  test("logs a clear warning (but does not fail the request) when deleting the old logo fails for a non-ENOENT reason", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    prisma.store.findFirst
      .mockResolvedValueOnce(
        makeFakeStore({ logo_url: "/uploads/old-logo.png" }),
      )
      .mockResolvedValueOnce(
        makeFakeStore({ logo_url: "/uploads/new-logo.png" }),
      );
    prisma.store.update.mockResolvedValue(
      makeFakeStore({ logo_url: "/uploads/new-logo.png" }),
    );
    fs.unlink.mockRejectedValue(
      Object.assign(new Error("EACCES"), { code: "EACCES" }),
    );

    const result = await storeService.updateLogo(FAKE_USER_ID, {
      filename: "new-logo.png",
    });

    expect(result.logo_url).toBe("/uploads/new-logo.png");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("store 1"),
    );
  });

  test("does not log anything when the old logo was already gone (ENOENT)", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    prisma.store.findFirst
      .mockResolvedValueOnce(
        makeFakeStore({ logo_url: "/uploads/old-logo.png" }),
      )
      .mockResolvedValueOnce(
        makeFakeStore({ logo_url: "/uploads/new-logo.png" }),
      );
    prisma.store.update.mockResolvedValue(
      makeFakeStore({ logo_url: "/uploads/new-logo.png" }),
    );
    fs.unlink.mockRejectedValue(
      Object.assign(new Error("not found"), { code: "ENOENT" }),
    );

    await storeService.updateLogo(FAKE_USER_ID, { filename: "new-logo.png" });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
