import { formatInTimeZone } from "date-fns-tz";

const DEFAULT_TIMEZONE = "Asia/Jakarta";

// Validasi IANA timezone string. Kalau invalid, jangan sampe throw
// RangeError yang bikin request 500 - fallback ke default.
function resolveTimeZone(timezone) {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

// ISO day-of-week token 'i' = 1(Senin)..7(Minggu). Mod 7 mengubahnya jadi
// konvensi JS Date#getDay(): 0(Minggu)..6(Sabtu), tanpa perlu round-trip
// parse ulang lewat toLocaleString/new Date seperti versi sebelumnya.
function getZonedDayOfWeek(date, timeZone) {
  const isoDay = Number(formatInTimeZone(date, timeZone, "i")); // ISO: Senin=1 ... Minggu=7
  return (isoDay - 1) % 7; // geser jadi Senin=0 ... Minggu=6, samain sama DAYS di FE
}

function getZonedDateString(date, timeZone) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

function getZonedHourMin(date, timeZone) {
  return formatInTimeZone(date, timeZone, "HH:mm");
}

// Cek apakah "now" (HH:mm) berada dalam jendela [open, close] untuk SATU
// entry jadwal, dengan asumsi entry itu bukan overnight (close >= open).
function isWithinSameDayWindow(currentHourMin, openTime, closeTime) {
  return currentHourMin >= openTime && currentHourMin <= closeTime;
}

export const calculateStoreStatus = (store, operationalHours) => {
  const now = new Date();
  const storeTimeZone = resolveTimeZone(store.timezone);

  const todayString = getZonedDateString(now, storeTimeZone);
  const currentDay = getZonedDayOfWeek(now, storeTimeZone);
  const currentHourMin = getZonedHourMin(now, storeTimeZone);

  // 1. CEK OVERRIDE MANUAL DULU
  if (store.manual_status && store.manual_updated_at) {
    const overrideDateString = getZonedDateString(
      new Date(store.manual_updated_at),
      storeTimeZone,
    );

    // Override cuma berlaku kalau di-set di HARI YANG SAMA (di timezone toko).
    if (overrideDateString === todayString) {
      // Hanya percaya nilai yang dikenal ("OPEN"/"CLOSED"). Nilai lain
      // (typo/corrupt data) diabaikan, jatuh lanjut ke cek jadwal di bawah,
      // bukan diam-diam dianggap "CLOSED".
      if (store.manual_status === "OPEN") return true;
      if (store.manual_status === "CLOSED") return false;
    }
  }

  // 2. CEK JADWAL HARI INI (termasuk sesi overnight yang MULAI hari ini,
  //    misal buka 20:00 dan baru tutup 02:00 dini hari besok)
  const todaySchedule = operationalHours.find((h) => h.day === currentDay);

  if (todaySchedule?.is_active) {
    const { open_time, close_time } = todaySchedule;
    const isOvernight = close_time < open_time;

    if (isOvernight) {
      // Sesi dimulai hari ini kalau sekarang >= open_time (masih malam ini,
      // belum lewat tengah malam). Bagian "sudah lewat tengah malam"
      // ditangani oleh pengecekan jadwal KEMARIN di bawah, karena
      // currentDay sudah berubah begitu lewat jam 00:00.
      if (currentHourMin >= open_time) return true;
    } else if (isWithinSameDayWindow(currentHourMin, open_time, close_time)) {
      return true;
    }
  }

  // 3. CEK JADWAL KEMARIN, buat nutup celah sesi overnight yang MULAI
  //    kemarin dan masih berlanjut sampai dini hari ini (misal kemarin
  //    buka 20:00 tutup 02:00, sekarang jam 01:00 -> currentDay sudah
  //    hari berikutnya, tapi tokonya masih buka).
  const previousDay = (currentDay + 6) % 7;
  const yesterdaySchedule = operationalHours.find((h) => h.day === previousDay);

  if (yesterdaySchedule?.is_active) {
    const { open_time, close_time } = yesterdaySchedule;
    const isOvernight = close_time < open_time;

    if (isOvernight && currentHourMin <= close_time) {
      return true;
    }
  }

  return false;
};
