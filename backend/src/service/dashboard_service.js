import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import { validate } from "../validation/validation.js";
import Joi from "joi";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getDashboardValidation } from "../validation/dashboard_validation.js";

const calcTrend = (current, previous) => {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0 && current > 0) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

// ✅ HELPER AMAN: Konversi Date & hitung rata-rata waktu tunggu (dalam menit)
const calculateAvgWaitTime = (queues) => {
  let totalWaitMs = 0;
  let validCount = 0;

  queues.forEach((q) => {
    if (q.processed_at && q.completed_at) {
      const processedTime = new Date(q.processed_at).getTime();
      const completedTime = new Date(q.completed_at).getTime();

      const waitMs = completedTime - processedTime;
      if (waitMs >= 0) {
        totalWaitMs += waitMs;
        validCount++;
      }
    }
  });

  if (validCount === 0) return 0;
  return Math.round(totalWaitMs / validCount / 60000); // 60000 ms = 1 menit
};

const getDashboard = async (request) => {
  const userId = validate(getDashboardValidation, request);

  // 1. Ambil Data Dasar Toko
  const store = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
    select: {
      id: true,
      public_id: true,
      name: true,
      description: true,
      logo_url: true,
      timezone: true,
      operational_hours: true,
      manual_status: true,
      manual_updated_at: true,
    },
  });
  if (!store) throw new ResponseError(404, "Store not found");
  const tz = store.timezone || "Asia/Jakarta";

  // ==========================================
  // 2. SETUP WAKTU (FIXED: KEMARIN FULL 1 HARI)
  // ==========================================
  const nowUtc = new Date();
  const nowZoned = toZonedTime(nowUtc, tz);

  // Awal hari ini (00:00:00.000)
  const startOfTodayZoned = new Date(
    nowZoned.getFullYear(),
    nowZoned.getMonth(),
    nowZoned.getDate(),
    0, 0, 0, 0
  );
  const startOfTodayUtc = fromZonedTime(startOfTodayZoned, tz);

  // Awal kemarin (00:00:00.000)
  const zonedYesterdayStart = new Date(
    nowZoned.getFullYear(),
    nowZoned.getMonth(),
    nowZoned.getDate() - 1,
    0, 0, 0, 0
  );
  const utcYesterdayStart = fromZonedTime(zonedYesterdayStart, tz);

  // ✅ FIX UTAMA: Akhir kemarin diset ke ujung hari (23:59:59.999) supaya adil (1 hari penuh)
  const zonedYesterdayEndExclusive = new Date(
    nowZoned.getFullYear(),
    nowZoned.getMonth(),
    nowZoned.getDate() - 1,
    23, 59, 59, 999
  );
  const utcYesterdayEndExclusive = fromZonedTime(zonedYesterdayEndExclusive, tz);

  // ==========================================
  // 3. PARALLEL QUERIES (SUPER CEPAT)
  // ==========================================
  const [
    latestProducts,
    latestAddons,
    oldestActiveQueues,
    activeQueuesCount,
    aggTodaySelesai,
    aggTodayBatal,
    todayCompletedQueues,
    aggYesterdaySelesai,
    aggYesterdayBatal,
    yesterdayCompletedQueues,
  ] = await Promise.all([
    // ✅ 5 Produk Terbaru
    prisma.product.findMany({
      where: { store_id: store.id, is_delete: false },
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image_url: true,
        is_available: true,
      },
    }),

    // ✅ 5 Addon Terbaru
    prisma.addon.findMany({
      where: { addon_group: { store_id: store.id }, is_delete: false },
      orderBy: { created_at: "desc" },
      take: 5,
      select: { id: true, name: true, price: true, addon_group_id: true },
    }),

    // ✅ 5 Antrean Terlama yg masih aktif
    prisma.queue.findMany({
      where: {
        store_id: store.id,
        status: { in: ["BELUM_BAYAR", "DIPROSES"] },
      },
      orderBy: { created_at: "asc" },
      take: 5,
      select: {
        id: true,
        queue_number: true,
        status: true,
        total_price: true,
        created_at: true,
        expired_at: true,
      },
    }),

    // ✅ Total count antrean aktif
    prisma.queue.count({
      where: {
        store_id: store.id,
        status: { in: ["BELUM_BAYAR", "DIPROSES"] },
      },
    }),

    // Agregasi HARI INI - Selesai
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: startOfTodayUtc, lt: nowUtc },
      },
      _sum: { total_price: true },
      _count: true,
    }),
    
    // Agregasi HARI INI - Batal
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "DIBATALKAN",
        created_at: { gte: startOfTodayUtc, lt: nowUtc },
      },
      _count: true,
    }),

    // Ambil data antrean selesai hari ini (untuk chart jam & waktu tunggu)
    prisma.queue.findMany({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: startOfTodayUtc, lt: nowUtc },
      },
      select: { created_at: true, processed_at: true, completed_at: true },
    }),

    // Agregasi KEMARIN - Selesai
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: utcYesterdayStart, lt: utcYesterdayEndExclusive },
      },
      _sum: { total_price: true },
      _count: true,
    }),

    // Agregasi KEMARIN - Batal
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "DIBATALKAN",
        created_at: { gte: utcYesterdayStart, lt: utcYesterdayEndExclusive },
      },
      _count: true,
    }),

    // Ambil data antrean selesai kemarin (untuk waktu tunggu kemarin)
    prisma.queue.findMany({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: utcYesterdayStart, lt: utcYesterdayEndExclusive },
      },
      select: { processed_at: true, completed_at: true },
    }),
  ]);

  // ==========================================
  // 3B. TOTAL TERJUAL PER PRODUK
  // ==========================================
  const latestProductIds = latestProducts.map((p) => p.id);

  const soldAggregates = latestProductIds.length
    ? await prisma.queueDetail.groupBy({
        by: ["product_id"],
        where: {
          product_id: { in: latestProductIds },
          queue: { status: "SELESAI" },
        },
        _sum: { quantity: true },
      })
    : [];

  const soldMap = new Map(
    soldAggregates.map((row) => [row.product_id, row._sum.quantity || 0]),
  );

  const latestProductsWithSold = latestProducts.map((p) => ({
    ...p,
    total_sold: soldMap.get(p.id) || 0,
  }));

  // ==========================================
  // 4. KALKULASI METRIK & TREND
  // ==========================================

  const omzetToday = aggTodaySelesai._sum.total_price || 0;
  const pesananSelesaiToday = aggTodaySelesai._count || 0;
  const pesananBatalToday = aggTodayBatal._count || 0;

  const omzetYesterday = aggYesterdaySelesai._sum.total_price || 0;
  const pesananSelesaiYesterday = aggYesterdaySelesai._count || 0;
  const pesananBatalYesterday = aggYesterdayBatal._count || 0;

  // AOV
  const aovTodayRaw =
    pesananSelesaiToday > 0 ? omzetToday / pesananSelesaiToday : 0;
  const aovYesterdayRaw =
    pesananSelesaiYesterday > 0 ? omzetYesterday / pesananSelesaiYesterday : 0;
  const aovToday = Math.round(aovTodayRaw);

  // Waktu Tunggu Dapur (dalam menit)
  const avgWaitTimeToday = calculateAvgWaitTime(todayCompletedQueues);
  const avgWaitTimeYesterday = calculateAvgWaitTime(yesterdayCompletedQueues);

  // Peak Hour & Chart Jam
  const hourlyCounts = Array(24).fill(0);
  todayCompletedQueues.forEach((q) => {
    const localHour = toZonedTime(q.created_at, tz).getHours();
    hourlyCounts[localHour]++;
  });

  const maxHourlyCount = Math.max(...hourlyCounts);
  const peakHourIndex = hourlyCounts.indexOf(maxHourlyCount);
  const peakHourString =
    maxHourlyCount > 0
      ? `${String(peakHourIndex).padStart(2, "0")}:00 - ${String(peakHourIndex + 1).padStart(2, "0")}:00`
      : "-";

  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  // ==========================================
  // 5. RESPONSE FINAL
  // ==========================================
  return {
    server_time: nowUtc.toISOString(),
    store: {
      public_id: store.public_id,
      name: store.name,
      description: store.description,
      logo_url: store.logo_url,
      is_open: isStoreOpen,
    },
    lists: {
      latest_products: latestProductsWithSold,
      latest_addons: latestAddons,
      oldest_active_queues: oldestActiveQueues,
      active_queues_count: activeQueuesCount,
    },
    today: {
      omzet: {
        value: omzetToday,
        trend: calcTrend(omzetToday, omzetYesterday),
      },
      pesanan_selesai: {
        value: pesananSelesaiToday,
        trend: calcTrend(pesananSelesaiToday, pesananSelesaiYesterday),
      },
      pesanan_batal: {
        value: pesananBatalToday,
        trend: calcTrend(pesananBatalToday, pesananBatalYesterday),
      },
      aov: {
        value: aovToday,
        trend: calcTrend(aovTodayRaw, aovYesterdayRaw),
      },
      avg_wait_time: {
        value: avgWaitTimeToday,
        trend: calcTrend(avgWaitTimeToday, avgWaitTimeYesterday),
      },
      peak_hour: peakHourString,
      hourly_traffic: hourlyCounts,
    },
  };
};

export default { getDashboard };
