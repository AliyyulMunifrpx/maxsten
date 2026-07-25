import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { calculateStoreStatus } from "../../src/utils/store_status_helper.js";
// ASUMSI PATH: sesuaikan kalau calculateStoreStatus di-export dari file lain

// Helper: bikin 7 hari operational_hours dengan jam yang sama semua,
// biar gampang bikin variasi test (full open 24 jam, full closed, dst).
function makeWeekSchedule({
  open_time = "08:00",
  close_time = "20:00",
  is_active = true,
} = {}) {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open_time,
    close_time,
    is_active,
  }));
}

function makeStore(overrides = {}) {
  return {
    timezone: "Asia/Jakarta",
    manual_status: null,
    manual_updated_at: null,
    ...overrides,
  };
}

describe("calculateStoreStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // 2026-07-23 05:00:00Z == Asia/Jakarta 12:00 siang, hari Kamis (day=4)
  const JAKARTA_NOON_UTC = "2026-07-23T05:00:00.000Z";

  test("returns true when current time is within today's active schedule", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(JAKARTA_NOON_UTC));

    const store = makeStore();
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("returns false when current time is before today's opening time", () => {
    // Jakarta 07:00 (sebelum buka jam 08:00) == UTC 00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T00:00:00.000Z"));

    const store = makeStore();
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(false);
  });

  test("returns false when current time is after today's closing time", () => {
    // Jakarta 21:00 (setelah tutup jam 20:00) == UTC 14:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T14:00:00.000Z"));

    const store = makeStore();
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(false);
  });

  test("treats opening time boundary as inclusive (open exactly at open_time)", () => {
    // Jakarta 08:00 pas == UTC 01:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T01:00:00.000Z"));

    const store = makeStore();
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("treats closing time boundary as inclusive (still open exactly at close_time)", () => {
    // Jakarta 20:00 pas == UTC 13:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T13:00:00.000Z"));

    const store = makeStore();
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("returns false when today's schedule exists but is_active is false", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(JAKARTA_NOON_UTC)); // di dalam jam operasional kalau aktif

    const store = makeStore();
    const schedule = makeWeekSchedule({ is_active: false });

    expect(calculateStoreStatus(store, schedule)).toBe(false);
  });

  test("returns false when there is no schedule entry at all for today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(JAKARTA_NOON_UTC)); // hari Kamis, day=4

    const store = makeStore();
    const schedule = makeWeekSchedule().filter((h) => h.day !== 4); // hapus entry hari ini

    expect(calculateStoreStatus(store, schedule)).toBe(false);
  });

  test("manual_status OPEN today overrides an otherwise-closed schedule", () => {
    vi.useFakeTimers();
    const now = new Date(JAKARTA_NOON_UTC);
    vi.setSystemTime(now);

    const store = makeStore({ manual_status: "OPEN", manual_updated_at: now });
    const schedule = makeWeekSchedule({ is_active: false }); // schedule bilang tutup

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("manual_status CLOSED today overrides an otherwise-open schedule", () => {
    vi.useFakeTimers();
    const now = new Date(JAKARTA_NOON_UTC);
    vi.setSystemTime(now);

    const store = makeStore({
      manual_status: "CLOSED",
      manual_updated_at: now,
    });
    const schedule = makeWeekSchedule({
      open_time: "00:00",
      close_time: "23:59",
    }); // schedule bilang buka

    expect(calculateStoreStatus(store, schedule)).toBe(false);
  });

  test("stale manual_status from a previous day is ignored, falls back to schedule", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(JAKARTA_NOON_UTC));

    const yesterday = new Date("2026-07-22T05:00:00.000Z");
    const store = makeStore({
      manual_status: "CLOSED",
      manual_updated_at: yesterday,
    });
    const schedule = makeWeekSchedule({
      open_time: "00:00",
      close_time: "23:59",
    }); // beneran buka hari ini

    // override kadaluarsa -> harusnya balik ngikutin jadwal (buka)
    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("defaults to Asia/Jakarta when store.timezone is missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(JAKARTA_NOON_UTC)); // noon di Jakarta

    const store = makeStore({ timezone: undefined });
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("correctly resolves day-of-week for a timezone far from Jakarta (date-boundary case)", () => {
    // UTC 2026-07-23T02:00:00Z:
    //  - Jakarta (+7): Kamis 23 Juli, 09:00
    //  - New York (EDT, -4): Rabu 22 Juli, 22:00
    // Test ini membuktikan currentDay/currentHourMin dihitung dari timezone
    // TOKO, bukan dari timezone server/local, dan bisa jatuh ke hari yang beda.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T02:00:00.000Z"));

    const store = makeStore({ timezone: "America/New_York" });
    // Rabu (day=3) di New York: buka 20:00-23:00 supaya jam 22:00 masuk range
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });
    schedule[3] = {
      day: 3,
      open_time: "20:00",
      close_time: "23:00",
      is_active: true,
    };

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("handles overnight schedule crossing midnight - still open before midnight (session started today)", () => {
    vi.useFakeTimers();
    // Jakarta 23:30 == UTC 16:30, Kamis (day=4), open 20:00-02:00
    vi.setSystemTime(new Date("2026-07-23T16:30:00.000Z"));

    const store = makeStore();
    const schedule = makeWeekSchedule({
      open_time: "20:00",
      close_time: "02:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("handles overnight schedule crossing midnight - still open after midnight (session started yesterday)", () => {
    vi.useFakeTimers();
    // Jakarta 01:00 Jumat (day=5) == UTC 2026-07-23T18:00:00Z.
    // Sesi overnight-nya "milik" hari Kamis (day=4, open 20:00 close 02:00),
    // tapi karena udah lewat tengah malam, currentDay sekarang Jumat.
    vi.setSystemTime(new Date("2026-07-23T18:00:00.000Z"));

    const store = makeStore();
    const schedule = makeWeekSchedule({
      open_time: "20:00",
      close_time: "02:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("overnight schedule correctly reports closed during the daytime gap", () => {
    vi.useFakeTimers();
    // Jakarta 10:00 -- di luar sesi overnight manapun (bukan sisa kemarin,
    // belum masuk sesi malam ini)
    vi.setSystemTime(new Date("2026-07-23T03:00:00.000Z"));

    const store = makeStore();
    const schedule = makeWeekSchedule({
      open_time: "20:00",
      close_time: "02:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(false);
  });

  test("falls back to schedule when manual_status has an unrecognized value", () => {
    vi.useFakeTimers();
    const now = new Date(JAKARTA_NOON_UTC);
    vi.setSystemTime(now);

    // Nilai selain "OPEN"/"CLOSED" (misal data korup/typo) tidak boleh
    // diam-diam dianggap "tutup" - harus jatuh lanjut ke cek jadwal.
    const store = makeStore({ manual_status: "MAYBE", manual_updated_at: now });
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });

    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });

  test("falls back to Asia/Jakarta (instead of throwing) when store.timezone is an invalid IANA zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(JAKARTA_NOON_UTC));

    const store = makeStore({ timezone: "Not/A_Real_Zone" });
    const schedule = makeWeekSchedule({
      open_time: "08:00",
      close_time: "20:00",
    });

    expect(() => calculateStoreStatus(store, schedule)).not.toThrow();
    expect(calculateStoreStatus(store, schedule)).toBe(true);
  });
});
