import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js"; // FIX: sebelumnya tidak di-import padahal dipakai
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import { getDashboardValidation } from "../validation/dashboard_validation.js";
import { validate } from "../validation/validation.js";

// TAMBAHAN: date-fns & date-fns-tz untuk trend Month-to-Date (bulan ini vs bulan lalu)
import { getDaysInMonth, subMonths } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const calcTrend = (current, previous) => {
  // Edge case: periode lalu = 0 -> selalu +100% (hindari NaN/Infinity)
  if (!previous) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const getDashboard = async (request) => {
  const userId = validate(getDashboardValidation, request);

  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      id: true, // ID diperlukan untuk query antrean agregasi
      public_id: true,
      name: true,
      description: true,
      address: true,
      logo_url: true,
      manual_status: true,
      manual_updated_at: true,
      operational_hours: true, // Tetap diambil untuk logic calculateStoreStatus
      timezone: true, // TAMBAHAN: dibutuhkan untuk hitung MTD di zona waktu toko

      _count: {
        select: {
          products: { where: { is_delete: false } },
          addonGroups: { where: { is_delete: false } },
        },
      },
      products: {
        where: { is_delete: false },
        take: 5,
        select: {
          id: true,
          name: true,
          price: true,
          image_url: true,
          is_available: true,
        },
      },
      addonGroups: {
        where: { is_delete: false },
        take: 5,
        select: {
          id: true,
          name: true,
          addons: {
            where: { is_delete: false },
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan");
  }

  const tz = store.timezone || "Asia/Jakarta";

  // ==========================================
  // LOGIKA RINGKASAN PENJUALAN HARI INI (TIDAK DIUBAH)
  // ==========================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const aggSelesai = await prisma.queue.aggregate({
    where: {
      store_id: store.id,
      status: "SELESAI",
      created_at: { gte: today },
    },
    _sum: { total_price: true },
    _count: true,
  });

  const aggBatal = await prisma.queue.aggregate({
    where: {
      store_id: store.id,
      status: "DIBATALKAN",
      created_at: { gte: today },
    },
    _count: true,
  });

  // ==========================================
  // TAMBAHAN: TREND MONTH-TO-DATE - bulan ini vs bulan lalu, TANPA filter apapun.
  // Selalu real-time berdasarkan "sekarang" di zona waktu toko.
  // Kalau hari ini tanggal 13, bandingkan tgl 1-13 bulan ini vs tgl 1-13 bulan lalu
  // (dicap ke jumlah hari bulan lalu kalau lebih pendek, misal Februari).
  // ==========================================
  const nowUtc = new Date();
  const nowZoned = toZonedTime(nowUtc, tz);

  const zonedThisMonthStart = new Date(
    nowZoned.getFullYear(),
    nowZoned.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const utcThisMonthStart = fromZonedTime(zonedThisMonthStart, tz);

  const prevAnchor = subMonths(zonedThisMonthStart, 1);
  const prevYear = prevAnchor.getFullYear();
  const prevMonthIdx = prevAnchor.getMonth();

  const daysInPrevMonth = getDaysInMonth(new Date(prevYear, prevMonthIdx, 1));
  const todayLocalDay = nowZoned.getDate();
  const cutoffDay = Math.min(todayLocalDay, daysInPrevMonth);

  const zonedPrevStart = new Date(prevYear, prevMonthIdx, 1, 0, 0, 0, 0);
  const zonedPrevEndExclusive = new Date(
    prevYear,
    prevMonthIdx,
    cutoffDay + 1,
    0,
    0,
    0,
    0,
  );
  const utcPrevStart = fromZonedTime(zonedPrevStart, tz);
  const utcPrevEndExclusive = fromZonedTime(zonedPrevEndExclusive, tz);

  const [
    aggSelesaiThisMonth,
    aggBatalThisMonth,
    aggSelesaiPrevMonth,
    aggBatalPrevMonth,
  ] = await Promise.all([
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: utcThisMonthStart, lt: nowUtc },
      },
      _sum: { total_price: true },
      _count: true,
    }),
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "DIBATALKAN",
        created_at: { gte: utcThisMonthStart, lt: nowUtc },
      },
      _count: true,
    }),
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: utcPrevStart, lt: utcPrevEndExclusive },
      },
      _sum: { total_price: true },
      _count: true,
    }),
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "DIBATALKAN",
        created_at: { gte: utcPrevStart, lt: utcPrevEndExclusive },
      },
      _count: true,
    }),
  ]);

  // Kalkulasi status buka/tutup secara realtime
  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  // Rapikan response, JANGAN masukkan operational_hours ke hasil return
  return {
    public_id: store.public_id,
    name: store.name,
    description: store.description,
    address: store.address,
    logo_url: store.logo_url,
    is_open: isStoreOpen,
    total_products: store._count.products,
    total_addon_groups: store._count.addonGroups, // FIX: sebelumnya "addon_groups" (typo, selalu undefined)
    products: store.products,
    addon_groups: store.addonGroups,

    // Data snapshot untuk metrik dashboard
    sales_today: {
      omzet: aggSelesai._sum.total_price || 0,
      pesanan_selesai: aggSelesai._count || 0,
      pesanan_batal: aggBatal._count || 0,
     
    },
  };
};

export default { getDashboard };
