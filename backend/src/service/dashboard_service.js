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
    manual_status: true,      // ➕ tambah
    manual_updated_at: true,  // ➕ tambah
  },
});
  if (!store) throw new ResponseError(404, "Store not found");
  const tz = store.timezone || "Asia/Jakarta";

  // ==========================================
  // 2. SETUP WAKTU (KEBAL TIMEZONE SERVER)
  // ==========================================
  const nowUtc = new Date();
  const nowZoned = toZonedTime(nowUtc, tz);

  // Awal Hari Ini (00:00:00 lokal)
  const startOfTodayZoned = new Date(
    nowZoned.getFullYear(),
    nowZoned.getMonth(),
    nowZoned.getDate(),
    0,
    0,
    0,
    0,
  );
  const startOfTodayUtc = fromZonedTime(startOfTodayZoned, tz);

  // Kemarin, dipotong di JAM:MENIT:DETIK yang SAMA dengan sekarang -
  // supaya "hari ini (sejauh ini)" dan "kemarin (sejauh jam yang sama)"
  // dibandingkan dalam rentang waktu yang sama panjangnya (fair, gak
  // kebablasan kayak isu MTD sebelumnya). new Date(...) dengan
  // getDate() - 1 otomatis rollover ke bulan/tahun sebelumnya kalau hari
  // ini tanggal 1.
  const zonedYesterdayStart = new Date(
    nowZoned.getFullYear(),
    nowZoned.getMonth(),
    nowZoned.getDate() - 1,
    0,
    0,
    0,
    0,
  );
  const utcYesterdayStart = fromZonedTime(zonedYesterdayStart, tz);

  const zonedYesterdayEndExclusive = new Date(
    nowZoned.getFullYear(),
    nowZoned.getMonth(),
    nowZoned.getDate() - 1,
    nowZoned.getHours(),
    nowZoned.getMinutes(),
    nowZoned.getSeconds(),
    nowZoned.getMilliseconds(),
  );
  const utcYesterdayEndExclusive = fromZonedTime(
    zonedYesterdayEndExclusive,
    tz,
  );

  // ==========================================
  // 3. PARALLEL QUERIES (SUPER CEPAT)
  // ==========================================
  const [
    latestProducts,
    latestAddons,
    oldestActiveQueues,
    activeQueuesCount, // ✅ total antrean BELUM_BAYAR + DIPROSES, buat badge notif
    aggTodaySelesai,
    aggTodayBatal,
    todayCompletedQueues, // Buat ngitung Peak Hour & chart jam-jaman
    aggYesterdaySelesai,
    aggYesterdayBatal,
  ] = await Promise.all([
    // ✅ 5 Produk Terbaru
    prisma.product.findMany({
      where: { store_id: store.id, is_delete: false },
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        description: true, // ✅ dipakai FE buat card produk
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

    // ✅ 5 Antrean Terlama (Paling atas) yg masih aktif
    prisma.queue.findMany({
      where: {
        store_id: store.id,
        status: { in: ["BELUM_BAYAR", "DIPROSES"] },
      },
      orderBy: { created_at: "asc" }, // ASC = Terlama
      take: 5,
      select: {
        id: true,
        queue_number: true,
        status: true,
        total_price: true,
        created_at: true,
        expired_at: true, // ✅ dari tabel queue: created_at + timeout payment milik toko, dipakai FE buat hitung sisa waktu
      },
    }),

    // ✅ Total count antrean aktif (BELUM_BAYAR + DIPROSES) — gak kena limit take:5,
    // dipakai buat badge notif jumlah antrean.
    prisma.queue.count({
      where: {
        store_id: store.id,
        status: { in: ["BELUM_BAYAR", "DIPROSES"] },
      },
    }),

    // Agregasi HARI INI
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: startOfTodayUtc, lt: nowUtc },
      },
      _sum: { total_price: true },
      _count: true,
    }),
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "DIBATALKAN",
        created_at: { gte: startOfTodayUtc, lt: nowUtc },
      },
      _count: true,
    }),
    prisma.queue.findMany({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: startOfTodayUtc, lt: nowUtc },
      },
      select: { created_at: true },
    }),

    // Agregasi KEMARIN (sampai jam yang sama dengan sekarang)
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "SELESAI",
        created_at: { gte: utcYesterdayStart, lt: utcYesterdayEndExclusive },
      },
      _sum: { total_price: true },
      _count: true,
    }),
    prisma.queue.aggregate({
      where: {
        store_id: store.id,
        status: "DIBATALKAN",
        created_at: { gte: utcYesterdayStart, lt: utcYesterdayEndExclusive },
      },
      _count: true,
    }),
  ]);

  // ==========================================
  // 3B. TOTAL TERJUAL PER PRODUK (5 Produk Terbaru)
  // ==========================================
  // 1 query groupBy buat semua produk sekaligus (bukan aggregate per
  // produk satu-satu) - pola sama seperti product_service.js getAllProducts,
  // biar gak N+1.
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
  // 4. KALKULASI METRIK & TREND (Hari Ini vs Kemarin)
  // ==========================================

  const omzetToday = aggTodaySelesai._sum.total_price || 0;
  const pesananSelesaiToday = aggTodaySelesai._count || 0;
  const pesananBatalToday = aggTodayBatal._count || 0;

  const omzetYesterday = aggYesterdaySelesai._sum.total_price || 0;
  const pesananSelesaiYesterday = aggYesterdaySelesai._count || 0;
  const pesananBatalYesterday = aggYesterdayBatal._count || 0;

  // AOV - trend dihitung dari rasio omzet/pesanan yang BELUM dibulatkan,
  // Math.round cuma dipakai buat value yang ditampilkan (konsisten sama
  // history_service.js yang cuma membulatkan sekali buat averageOrderValue).
  const aovTodayRaw =
    pesananSelesaiToday > 0 ? omzetToday / pesananSelesaiToday : 0;
  const aovYesterdayRaw =
    pesananSelesaiYesterday > 0 ? omzetYesterday / pesananSelesaiYesterday : 0;
  const aovToday = Math.round(aovTodayRaw);

  // B. Hitung Jam Paling Ramai & Chart Jam-Jaman HARI INI
  const hourlyCounts = Array(24).fill(0);
  todayCompletedQueues.forEach((q) => {
    const localHour = toZonedTime(q.created_at, tz).getHours();
    hourlyCounts[localHour]++;
  });

  const maxHourlyCount = Math.max(...hourlyCounts);
  const peakHourIndex = hourlyCounts.indexOf(maxHourlyCount);
  // NOTE: label "23:00 - 24:00" untuk jam terakhir sengaja dibiarkan sama
  // seperti history_service.js.
  const peakHourString =
    maxHourlyCount > 0
      ? `${String(peakHourIndex).padStart(2, "0")}:00 - ${String(peakHourIndex + 1).padStart(2, "0")}:00`
      : "-";

  // C. Status Toko Buka/Tutup
  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  // ==========================================
  // 5. RESPONSE FINAL (RAPAT DAN BERSIH)
  // ==========================================
  return {
    server_time: nowUtc.toISOString(), // ✅ FE hitung countdown relatif ke ini, bukan ke jam device user
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
      oldest_active_queues: oldestActiveQueues, // ✅ Kasir bisa langsung lihat antrean yang udah nunggu lama
      active_queues_count: activeQueuesCount, // ✅ Buat badge notif jumlah antrean
    },
    today: {
      omzet: {
        value: omzetToday,
        trend: calcTrend(omzetToday, omzetYesterday), // vs kemarin, jam yang sama
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
      peak_hour: peakHourString, // ✅ Jam tersibuk hari ini
      hourly_traffic: hourlyCounts, // ✅ Chart live jam-jaman hari ini (index 0-23 = jam, partial kalau toko belum tutup)
    },
  };
};

export default { getDashboard };
