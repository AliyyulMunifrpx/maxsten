import path from "path";
import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import {
  createStoreValidation,
  openCloseStoreValidation,
  updateStoreValidation,
  updateOperationalHoursValidation,
  getStoreValidation,
} from "../validation/store_validation.js";
import { validate } from "../validation/validation.js";

import { getDaysInMonth, subMonths } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import fs from "fs/promises";
import assertValidOperationalHours from "../utils/valid_operational_hours.js";
const create = async (requestBody, file) => {
  const req = validate(createStoreValidation, requestBody);

  const existingStore = await prisma.store.count({
    where: { user_id: req.userId, is_delete: false },
  });
  if (existingStore > 0) {
    if (file) await fs.unlink(file.path).catch(() => {});
    throw new ResponseError(400, "You already have a store");
  }

  const logoPath = file ? `/uploads/${file.filename}` : null;

  // Bikin array jadwal default (7 hari: 0 = Minggu s/d 6 = Sabtu)
  const defaultOperationalHours = Array.from({ length: 7 }).map((_, index) => ({
    day: index,
    open_time: "08:00",
    close_time: "20:00",
    is_active: true,
  }));
  const operationalHoursData =
    req.operational_hours && req.operational_hours.length > 0
      ? req.operational_hours
      : defaultOperationalHours;

  assertValidOperationalHours(operationalHoursData);

  try {
    return await prisma.store.create({
      data: {
        user_id: req.userId,
        name: req.name,
        description: req.description,
        street_address: req.street_address,
        village: req.village,
        city: req.city,
        district: req.district,
        province: req.province,
        postal_code: req.postal_code,
        latitude: req.latitude,
        longitude: req.longitude,
        is_delete: false,
        logo_url: logoPath,
        timezone: req.timezone,
        operational_hours: {
          create: operationalHoursData,
        },
      },
      select: {
        public_id: true,
      },
    });
  } catch (error) {
    if (file) await fs.unlink(file.path).catch(() => {});
    if (error.code === "P2002") {
      throw new ResponseError(400, "You already have a store");
    }
    throw error;
  }
};
const openCloseStore = async (request) => {
  const req = validate(openCloseStoreValidation, request);

  // Bungkus seluruh operasi membaca & menulis dalam 1 transaksi
  return await prisma.$transaction(async (tx) => {
    // 1. Cari toko di dalam transaksi (tx)
    const store = await tx.store.findFirst({
      where: {
        public_id: req.store_id,
        user_id: req.userId,
        is_delete: false,
      },
      select: {
        id: true,
        // FIX: _count butuh nested `select` buat bisa filter relasinya
        // dengan `where`. Tanpa itu, Prisma bakal throw validation error
        // setiap kali query ini jalan.
        _count: {
          select: {
            queues: {
              where: {
                status: {
                  in: ["BELUM_BAYAR", "DIPROSES"],
                },
              },
            },
          },
        },
      },
    });

    if (!store) {
      throw new ResponseError(404, "Store not found");
    }

    const activeQueueCount = store._count.queues;

    if (req.manual_status === "CLOSED" && activeQueueCount > 0) {
      throw new ResponseError(400, "You still have active queues");
    }

    // 2. Update status toko di dalam transaksi yang sama
    const updatedStore = await tx.store.update({
      where: {
        id: store.id,
      },
      data: {
        manual_status: req.manual_status,
        manual_updated_at: new Date(),
      },
      select: {
        manual_status: true,
      },
    });

    return {
      message:
        req.manual_status === "OPEN"
          ? "Successfully opened the store"
          : "Successfully closed the store",
      manual_status: updatedStore.manual_status,
    };
  });
};
const updateLogo = async (userId, file) => {
  if (!file) throw new ResponseError(400, "No files were uploaded");

  const store = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
  });
  if (!store) throw new ResponseError(404, "Store not found");

  const oldLogoUrl = store.logo_url;
  const newImagePath = `/uploads/${file.filename}`;

  let updatedStore;
  try {
    updatedStore = await prisma.store.update({
      where: { id: store.id },
      data: { logo_url: newImagePath },
      select: { id: true, name: true, logo_url: true },
    });
  } catch (err) {
    await fs.unlink(path.join("public", newImagePath)).catch(() => {});
    throw err;
  }

  // 2. Baru hapus file lama SETELAH DB dikonfirmasi berhasil.
  if (oldLogoUrl) {
    const oldPath = path.join("public", oldLogoUrl);
    try {
      await fs.unlink(oldPath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error(
          `[updateLogo] gagal hapus logo lama untuk store ${store.id} di path "${oldPath}": ${err.message}`,
        );
      }
    }
  }

  return getStore(userId);
};

const updateStoreProfile = async (userId, request) => {
  const req = validate(updateStoreValidation, request);

  const existingStore = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
  });
  if (!existingStore) throw new ResponseError(404, "Store not found.");

  await prisma.store.update({
    where: { id: existingStore.id },
    data: {
      name: req.name,
      description: req.description,
      street_address: req.street_address,
      village: req.village,
      district: req.district,
      city: req.city,
      province: req.province,
      postal_code: req.postal_code,
      latitude: req.latitude,
      longitude: req.longitude,
      timezone: req.timezone,
      payment_timeout: req.payment_timeout,
    },
  });
  return await getStore(userId);
};
const getStoreHistory = async (
  userId,
  month,
  year,
  page = 1,
  limit = 10,
  topPage = 1,
  topLimit = 10,
  status = "ALL",
) => {
  const ALLOWED_STATUS = ["ALL", "SELESAI", "DIBATALKAN"];
  const MAX_LIMIT = 100;
  const toPositiveInt = (value) => {
    const num = Number(value);
    return Number.isInteger(num) ? num : NaN;
  };

  const store = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
    select: { id: true, timezone: true, created_at: true },
  });

  if (!store) throw new ResponseError(404, "Store not found");

  const tz = store.timezone || "Asia/Jakarta";

  const nowUtc = new Date();
  const nowZoned = toZonedTime(nowUtc, tz);

  const currentYear = nowZoned.getFullYear();
  const currentMonth = nowZoned.getMonth() + 1;

  const selectedYear = year ? Number(year) : currentYear;
  const selectedMonth = month ? Number(month) : currentMonth;

  if (
    !Number.isInteger(selectedMonth) ||
    selectedMonth < 1 ||
    selectedMonth > 12 ||
    !Number.isInteger(selectedYear)
  ) {
    throw new ResponseError(400, "Invalid month/year parameters");
  }

  if (!ALLOWED_STATUS.includes(status)) {
    throw new ResponseError(
      400,
      `Invalid status parameter. Allowed values: ${ALLOWED_STATUS.join(", ")}`,
    );
  }

  const pageNum = toPositiveInt(page);
  const limitNum = toPositiveInt(limit);
  const topPageNum = toPositiveInt(topPage);
  const topLimitNum = toPositiveInt(topLimit);

  if (
    !Number.isInteger(pageNum) ||
    pageNum < 1 ||
    !Number.isInteger(limitNum) ||
    limitNum < 1 ||
    !Number.isInteger(topPageNum) ||
    topPageNum < 1 ||
    !Number.isInteger(topLimitNum) ||
    topLimitNum < 1
  ) {
    throw new ResponseError(
      400,
      "page, limit, topPage, and topLimit must be positive integers",
    );
  }

  if (limitNum > MAX_LIMIT || topLimitNum > MAX_LIMIT) {
    throw new ResponseError(
      400,
      `limit and topLimit must not exceed ${MAX_LIMIT}`,
    );
  }

  const isCurrentMonth =
    selectedYear === currentYear && selectedMonth === currentMonth;

  const zonedMonthStart = new Date(
    selectedYear,
    selectedMonth - 1,
    1,
    0,
    0,
    0,
    0,
  );
  const utcMonthStart = fromZonedTime(zonedMonthStart, tz);

  const zonedNextMonthStart = new Date(
    selectedYear,
    selectedMonth,
    1,
    0,
    0,
    0,
    0,
  );
  const utcNextMonthStart = fromZonedTime(zonedNextMonthStart, tz);

  const rangeEndUtc = isCurrentMonth ? nowUtc : utcNextMonthStart;

  const dateCondition = {
    created_at: { gte: utcMonthStart, lt: rangeEndUtc },
  };

  let prevRangeStartUtc, prevRangeEndUtc;

  if (isCurrentMonth) {
    const prevAnchor = subMonths(zonedMonthStart, 1);
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

    prevRangeStartUtc = fromZonedTime(zonedPrevStart, tz);
    prevRangeEndUtc = fromZonedTime(zonedPrevEndExclusive, tz);
  } else {
    const prevAnchor = subMonths(zonedMonthStart, 1);
    const prevYear = prevAnchor.getFullYear();
    const prevMonthIdx = prevAnchor.getMonth();

    const zonedPrevStart = new Date(prevYear, prevMonthIdx, 1, 0, 0, 0, 0);
    const zonedPrevEndExclusive = new Date(
      prevYear,
      prevMonthIdx + 1,
      1,
      0,
      0,
      0,
      0,
    );

    prevRangeStartUtc = fromZonedTime(zonedPrevStart, tz);
    prevRangeEndUtc = fromZonedTime(zonedPrevEndExclusive, tz);
  }

  const prevDateCondition = {
    created_at: { gte: prevRangeStartUtc, lt: prevRangeEndUtc },
  };

  const daysInSelectedMonth = getDaysInMonth(
    new Date(selectedYear, selectedMonth - 1, 1),
  );
  const labelOrder = Array.from({ length: daysInSelectedMonth }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );

  const aggSelesai = await prisma.queue.aggregate({
    where: { store_id: store.id, status: "SELESAI", ...dateCondition },
    _sum: { total_price: true },
    _count: true,
  });

  const aggBatal = await prisma.queue.aggregate({
    where: { store_id: store.id, status: "DIBATALKAN", ...dateCondition },
    _count: true,
  });

  const aggSelesaiPrev = await prisma.queue.aggregate({
    where: { store_id: store.id, status: "SELESAI", ...prevDateCondition },
    _sum: { total_price: true },
    _count: true,
  });

  const aggBatalPrev = await prisma.queue.aggregate({
    where: { store_id: store.id, status: "DIBATALKAN", ...prevDateCondition },
    _count: true,
  });

  const totalOmzet = aggSelesai._sum.total_price || 0;
  const totalPesananSelesai = aggSelesai._count || 0;
  const totalBatal = aggBatal._count || 0;

  const totalTransactions = totalPesananSelesai + totalBatal;
  const cancellationRate =
    totalTransactions > 0
      ? Number(((totalBatal / totalTransactions) * 100).toFixed(2))
      : 0;

  const averageOrderValue =
    totalPesananSelesai > 0 ? Math.round(totalOmzet / totalPesananSelesai) : 0;

  const calcTrend = (current, previous) => {
    // 1. Jika bulan lalu 0 dan bulan ini juga 0 = Tidak ada perubahan (0%)
    if (previous === 0 && current === 0) return 0;

    // 2. Jika bulan lalu 0, tapi bulan ini ada pemasukan = Naik 100% (karena dibagi 0 itu error/infinity)
    if (previous === 0 && current > 0) return 100;

    // 3. Jika datanya normal, hitung persentase kenaikan/penurunan
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  const trend = {
    omzet: calcTrend(totalOmzet, aggSelesaiPrev._sum.total_price || 0),
    pesanan: calcTrend(totalPesananSelesai, aggSelesaiPrev._count),
    batal: calcTrend(totalBatal, aggBatalPrev._count),
  };

  let statusCondition = { in: ["SELESAI", "DIBATALKAN"] };
  if (status === "SELESAI") statusCondition = "SELESAI";
  else if (status === "DIBATALKAN") statusCondition = "DIBATALKAN";

  const skip = (pageNum - 1) * limitNum;
  const history = await prisma.queue.findMany({
    where: {
      store_id: store.id,
      status: statusCondition,
      ...dateCondition,
    },
    orderBy: { created_at: "desc" },
    skip,
    take: limitNum,
    include: {
      queueDetails: {
        include: { product: true, variant: true },
      },
    },
  });

  let totalRows = totalPesananSelesai + totalBatal;
  if (status === "SELESAI") totalRows = totalPesananSelesai;
  if (status === "DIBATALKAN") totalRows = totalBatal;
  const totalPages = Math.ceil(totalRows / limitNum);

  // --- DATA UNTUK CHART ---
  const revenueRows = await prisma.queue.findMany({
    where: { store_id: store.id, status: "SELESAI", ...dateCondition },
    select: { created_at: true, total_price: true },
    orderBy: { created_at: "asc" },
  });

  const overallHourlyCounts = Array(24).fill(0);
  const dailyCounts = Array(7).fill(0);
  const dayNames = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  const revenueChartMap = {};
  const hourlyTrafficByDate = {};

  labelOrder.forEach((label) => {
    revenueChartMap[label] = { label, omzet: 0, pesanan: 0 };
    hourlyTrafficByDate[label] = Array(24).fill(0);
  });

  revenueRows.forEach((row) => {
    const localDate = toZonedTime(new Date(row.created_at), tz);
    const labelTanggal = String(localDate.getDate()).padStart(2, "0");
    const jam = localDate.getHours();
    const hari = localDate.getDay();

    if (revenueChartMap[labelTanggal]) {
      revenueChartMap[labelTanggal].omzet += row.total_price;
      revenueChartMap[labelTanggal].pesanan += 1;
    }

    overallHourlyCounts[jam] += 1;
    dailyCounts[hari] += 1;

    if (hourlyTrafficByDate[labelTanggal]) {
      hourlyTrafficByDate[labelTanggal][jam] += 1;
    }
  });

  const revenueChartData = labelOrder.map((label) => revenueChartMap[label]);

  const dailyChartData = dailyCounts.map((count, index) => ({
    label: dayNames[index],
    pesanan: count,
  }));

  const maxHourlyCount = Math.max(...overallHourlyCounts);
  const peakHourIndex = overallHourlyCounts.indexOf(maxHourlyCount);
  const peakHourString =
    maxHourlyCount > 0
      ? `${String(peakHourIndex).padStart(2, "0")}:00 - ${String(peakHourIndex + 1).padStart(2, "0")}:00`
      : "-";

  const maxDailyCount = Math.max(...dailyCounts);
  const peakDayIndex = dailyCounts.indexOf(maxDailyCount);
  const peakDayName = maxDailyCount > 0 ? dayNames[peakDayIndex] : "-";

  // --- DATA TAMBAHAN ---
  const waitTimeRows = await prisma.queue.findMany({
    where: {
      store_id: store.id,
      status: "SELESAI",
      completed_at: { not: null },
      ...dateCondition,
    },
    select: { created_at: true, completed_at: true },
  });

  const averageWaitTimeMinutes = waitTimeRows.length
    ? Math.round(
        waitTimeRows.reduce((sum, row) => {
          const createdAt = new Date(row.created_at);
          const completedAt = new Date(row.completed_at);
          return sum + (completedAt - createdAt) / 60000;
        }, 0) / waitTimeRows.length,
      )
    : 0;

  // Top Selling Products (Cuma tabel ranking)
  const allTopSellingGroups = await prisma.queueDetail.groupBy({
    by: ["product_id"],
    where: {
      queue: { store_id: store.id, status: "SELESAI", ...dateCondition },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
  });

  const totalTopSellingRows = allTopSellingGroups.length;
  const skipTop = (topPageNum - 1) * topLimitNum;
  const topSellingGroups = allTopSellingGroups.slice(
    skipTop,
    skipTop + topLimitNum,
  );

  const productIdsForNames = Array.from(
    new Set([...topSellingGroups.map((r) => r.product_id)]),
  );

  const products = await prisma.product.findMany({
    where: { id: { in: productIdsForNames } },
    select: { id: true, name: true },
  });
  const productNameMap = new Map(products.map((p) => [p.id, p.name]));

  const topSellingList = topSellingGroups.map((row, index) => ({
    rank: skipTop + index + 1,
    product_id: row.product_id,
    name: productNameMap.get(row.product_id) || "Produk Tidak Diketahui",
    totalQuantity: row._sum.quantity,
  }));

  // Top Addons
  const allCompletedDetails = await prisma.queueDetail.findMany({
    where: {
      queue: { store_id: store.id, status: "SELESAI", ...dateCondition },
      selected_addons: { not: null },
    },
    select: { selected_addons: true, quantity: true },
  });

  const addonSalesMap = {};

  allCompletedDetails.forEach((detail) => {
    let addons = detail.selected_addons;
    if (typeof addons === "string") {
      try {
        addons = JSON.parse(addons);
      } catch (e) {
        addons = [];
      }
    }

    if (Array.isArray(addons)) {
      addons.forEach((addon) => {
        const addonName = addon.name;
        if (addonName) {
          if (!addonSalesMap[addonName]) {
            addonSalesMap[addonName] = { name: addonName, totalQuantity: 0 };
          }
          addonSalesMap[addonName].totalQuantity += detail.quantity;
        }
      });
    }
  });

  const topSellingAddons = Object.values(addonSalesMap)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10);

  return {
    meta: {
      selectedMonth,
      selectedYear,
      currentMonth,
      currentYear,
      isCurrentMonth,
      storeCreatedAt: store.created_at,
      timezone: tz,
    },
    summary: {
      totalOmzet,
      totalPesanan: totalPesananSelesai,
      totalBatal,
      cancellationRate,
      averageOrderValue,
      averageWaitTimeMinutes,
      trend,
      peakTraffic: {
        peakHour: peakHourString,
        peakDay: peakDayName,
      },
    },
    charts: {
      revenueDaily: revenueChartData,
      trafficHourlyByDate: hourlyTrafficByDate,
      trafficDaily: dailyChartData,
    },
    pagination: {
      totalRows,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
    },
    history,
    topSelling: {
      rankings: topSellingList,
      pagination: {
        totalRows: totalTopSellingRows,
        totalPages: Math.ceil(totalTopSellingRows / topLimitNum),
        currentPage: topPageNum,
        limit: topLimitNum,
      },
    },
    topAddons: topSellingAddons,
  };
};
const getOperationalHours = async (userId) => {
  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      operational_hours: true,
    },
  });
  if (!store) {
    throw new ResponseError(404, "Store not found.");
  }
  return store;
};
const updateOperationalHours = async (userId, request) => {
  const req = validate(updateOperationalHoursValidation, request);

  const store = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
    select: { id: true },
  });

  if (!store) throw new ResponseError(404, "Store not found.");

  assertValidOperationalHours(req.operational_hours);

  const updates = req.operational_hours.map((hour) => {
    return prisma.storeOperationalHour.upsert({
      where: {
        store_id_day: {
          store_id: store.id,
          day: hour.day,
        },
      },
      update: {
        open_time: hour.open_time,
        close_time: hour.close_time,
        is_active: hour.is_active,
      },
      create: {
        store_id: store.id,
        day: hour.day,
        open_time: hour.open_time,
        close_time: hour.close_time,
        is_active: hour.is_active,
      },
    });
  });

  await prisma.$transaction(updates);

  return await getOperationalHours(userId);
};

const getStore = async (request) => {
  const userId = validate(getStoreValidation, request);

  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      public_id: true,
      name: true,
      description: true,
      city: true,
      province: true,
      village: true,
      district: true,
      street_address: true,
      postal_code: true,
      logo_url: true,
      timezone: true,
      manual_status: true,
      manual_updated_at: true,
      operational_hours: { orderBy: { day: "asc" } },
      payment_timeout: true,
    },
  });

  if (!store) {
    throw new ResponseError(404, "Store not found");
  }

  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  return {
    ...store,
    is_open: isStoreOpen,
  };
};
const deleteStore = async (userId) => {
  // 1. Ambil id DAN logo_url dari store
  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      id: true,
      logo_url: true, // <-- Tambahkan ini
    },
  });

  if (!store) {
    throw new ResponseError(404, "Store not found");
  }

  // 2. Soft delete toko di database terlebih dahulu
  await prisma.store.update({
    where: {
      id: store.id,
    },
    data: {
      is_delete: true,
      user_id: null, // Opsional: lepas relasi user agar user bisa buat store baru jika perlu
    },
  });

  // 3. Hapus file logo dari server jika toko punya logo
  if (store.logo_url) {
    try {
      // Hilangkan tanda '/' di depan path jika ada, lalu arahkan ke lokasi folder upload kamu
      // Sesuaikan 'public' atau '.' sesuai letak folder uploads di project kamu
      const filePath = path.join(
        process.cwd(),
        "public",
        ...store.logo_url.split("/"),
      );
      console.log(filePath);
      await fs.unlink(filePath);
    } catch (error) {
      // Log error saja tanpa throw, agar kegagalan hapus file tidak membatalkan soft delete di DB
      console.error(
        "Failed to delete the logo file from the server:",
        error.message,
      );
    }
  }
};
const postalCode = async (postalCode) => {
  const response = await fetch(
    `https://carikodepos.id/api/search?q=${postalCode}&limit=5`,
  );

  if (!response.ok) {
    throw new ResponseError(500, "Failed to retrieve the ZIP code data");
  }

  return await response.json();
};
export default {
  create,
  openCloseStore,
  updateLogo,
  updateStoreProfile,
  getStoreHistory,
  updateOperationalHours,
  getStore,
  deleteStore,
  postalCode,
};
