import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import {
  createProductValidation,
  createStoreValidation,
  createAddonGroupValidation,
  getAddonGroupsValidation,
  openCloseStoreValidation,
  updateProductValidation,
  updateStoreValidation,
  updateOperationalHoursValidation,
} from "../validation/store_validation.js";
import { validate } from "../validation/validation.js";

import { getDaysInMonth, subMonths } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const create = async (requestBody, file) => {
  const req = validate(createStoreValidation, requestBody);

  const existingStore = await prisma.store.count({
    where: { user_id: req.userId, is_delete: false },
  });
  if (existingStore > 0) {
    throw new ResponseError(400, "Kamu sudah memiliki toko.");
  }

  const logoPath = file ? `/uploads/${file.filename}` : null;

  return await prisma.store.create({
    data: {
      name: req.name,
      description: req.description,
      address: req.address,
      user_id: req.userId,
      logo_url: logoPath,
      timezone: req.timezone,
    },
    select: {
      id: true,
      public_id: true,
      name: true,
      logo_url: true,
    },
  });
};

const createProduct = async (request, file) => {
  if (typeof request.variants === "string") {
    try {
      request.variants = JSON.parse(request.variants);
    } catch (e) {
      request.variants = [];
    }
  }

  if (typeof request.addon_group_ids === "string") {
    try {
      request.addon_group_ids = JSON.parse(request.addon_group_ids);
    } catch (e) {
      request.addon_group_ids = [];
    }
  }

  if (typeof request.price === "string") {
    request.price = Number(request.price);
  }

  const req = validate(createProductValidation, request);

  const store = await prisma.store.findUnique({
    where: { user_id: req.userId, is_delete: false },
    select: { id: true },
  });
  if (!store) {
    throw new ResponseError(
      404,
      "Toko tidak ditemukan. Silakan pastikan toko sudah dibuat terlebih dahulu.",
    );
  }

  const existingProduct = await prisma.product.count({
    where: {
      store_id: store.id,
      name: req.name,
      is_delete: false,
    },
  });

  if (existingProduct > 0) {
    throw new ResponseError(
      400,
      `Produk dengan nama '${req.name}' sudah ada di toko ini.`,
    );
  }

  const productImagePath = file ? `/uploads/${file.filename}` : null;

  let parsedVariants = req.variants;
  if (typeof req.variants === "string") {
    try {
      parsedVariants = JSON.parse(req.variants);
    } catch (e) {
      parsedVariants = [];
    }
  }

  let parsedAddonGroupIds = req.addon_group_ids;
  if (typeof req.addon_group_ids === "string") {
    try {
      parsedAddonGroupIds = JSON.parse(req.addon_group_ids);
    } catch (e) {
      parsedAddonGroupIds = [];
    }
  }

  if (parsedAddonGroupIds && parsedAddonGroupIds.length > 0) {
    const validAddonGroups = await prisma.addonGroup.count({
      where: {
        id: { in: parsedAddonGroupIds },
        store_id: store.id,
        is_delete: false,
      },
    });
    if (validAddonGroups !== parsedAddonGroupIds.length) {
      throw new ResponseError(
        400,
        "Beberapa grup add-on tidak valid untuk toko ini.",
      );
    }
  }

  return await prisma.product.create({
    data: {
      name: req.name,
      price: Number(req.price),
      image_url: productImagePath,
      store_id: store.id,

      ...(parsedVariants &&
        parsedVariants.length > 0 && {
          variants: {
            create: parsedVariants.map((variant) => ({
              name: variant.name,
              additional_price: Number(variant.additional_price) || 0,
            })),
          },
        }),

      ...(parsedAddonGroupIds &&
        parsedAddonGroupIds.length > 0 && {
          productAddonGroups: {
            create: parsedAddonGroupIds.map((addonGroupId) => ({
              addon_group_id: addonGroupId,
            })),
          },
        }),
    },
    include: {
      variants: true,
      productAddonGroups: {
        include: {
          addon_group: {
            include: {
              addons: true,
            },
          },
        },
      },
    },
  });
};

const openCloseStore = async (request) => {
  const req = validate(openCloseStoreValidation, request);

  const store = await prisma.store.findFirst({
    where: {
      public_id: req.store_id,
      user_id: req.userId,
      is_delete: false,
    },
    include: {
      operational_hours: true,
    },
  });

  if (!store) {
    throw new ResponseError(
      404,
      "toko tidak ditemukan, atau anda tidak memiliki akses",
    );
  }

  const isCurrentlyOpen = calculateStoreStatus(store, store.operational_hours);
  const newManualStatus = isCurrentlyOpen ? "CLOSED" : "OPEN";

  await prisma.store.update({
    where: {
      id: store.id,
    },
    data: {
      manual_status: newManualStatus,
      manual_updated_at: new Date(),
    },
  });

  return {
    message:
      newManualStatus === "OPEN"
        ? "berhasil membuka toko"
        : "berhasil menutup toko",
    is_open: newManualStatus === "OPEN",
  };
};

const updateLogo = async (userId, file) => {
  if (!file) throw new ResponseError(400, "Tidak ada file yang diupload");

  const store = await prisma.store.findUnique({
    where: { user_id: userId, is_delete: false },
  });
  if (!store) throw new ResponseError(404, "Toko tidak ditemukan");

  const imagePath = `/uploads/${file.filename}`;

  return await prisma.store.update({
    where: { id: store.id },
    data: { logo_url: imagePath },
    select: { id: true, name: true, logo_url: true },
  });
};

const updateStoreProfile = async (userId, request) => {
  const req = validate(updateStoreValidation, request);

  const existingStore = await prisma.store.findUnique({
    where: { user_id: userId, is_delete: false },
  });
  if (!existingStore) throw new ResponseError(404, "Toko tidak ditemukan");

  return await prisma.store.update({
    where: { id: existingStore.id },
    data: {
      name: req.name,
      description: req.description,
      address: req.address,
      timezone: req.timezone,
      // FIX: sebelumnya field ini gak pernah disimpen, jadi walau seller
      // ngisi form-nya, nilainya gak pernah nyampe ke database.
      payment_timeout: req.payment_timeout,
    },
    select: {
      id: true,
      name: true,
      description: true,
      address: true,
      timezone: true,
      // FIX: di-return juga biar frontend bisa langsung sinkron abis save,
      // gak perlu nunggu refetch ["storeMe"] buat liat nilai barunya.
      payment_timeout: true,
    },
  });
};

const getAddonGroups = async (request) => {
  const req = validate(getAddonGroupsValidation, request);

  const store = await prisma.store.findUnique({
    where: { user_id: req, is_delete: false },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan.");
  }

  return prisma.addonGroup.findMany({
    where: { store_id: store.id, is_delete: false },
    include: {
      addons: {
        where: {
          is_delete: false,
        },
      },
    },
  });
};

const createAddonGroup = async (request) => {
  if (typeof request.addons === "string") {
    try {
      request.addons = JSON.parse(request.addons);
    } catch (e) {
      request.addons = [];
    }
  }

  const req = validate(createAddonGroupValidation, request);

  const store = await prisma.store.findUnique({
    where: { user_id: req.userId, is_delete: false },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan.");
  }

  return prisma.addonGroup.create({
    data: {
      name: req.name,
      store_id: store.id,
      addons: {
        create: req.addons.map((addon) => ({
          name: addon.name,
          price: Number(addon.price),
        })),
      },
    },
    include: {
      addons: true,
    },
  });
};

const updateProductInfo = async (userId, productId, request) => {
  const req = validate(updateProductValidation, request);

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      is_delete: false,
      store: { user_id: userId, is_delete: false },
    },
    include: {
      variants: {
        where: { is_delete: false },
      },
    },
  });

  if (!product)
    throw new ResponseError(404, "Produk tidak ditemukan atau bukan milikmu");

  const reqVariants = req.variants || [];
  const existingVariantsToUpdate = reqVariants.filter((v) => v.id);
  const newVariantsToCreate = reqVariants.filter((v) => !v.id);

  const selectedAddonGroupIds = Array.isArray(req.addon_group_ids)
    ? req.addon_group_ids
    : [];

  if (selectedAddonGroupIds.length > 0) {
    const validAddonGroups = await prisma.addonGroup.count({
      where: {
        id: { in: selectedAddonGroupIds },
        is_delete: false,
        store: { user_id: userId },
      },
    });
    if (validAddonGroups !== selectedAddonGroupIds.length) {
      throw new ResponseError(
        400,
        "Beberapa grup add-on tidak valid untuk produk ini.",
      );
    }
  }

  const existingProductAddonGroups = await prisma.productAddonGroup.findMany({
    where: { product_id: productId },
    select: { addon_group_id: true },
  });

  const existingAddonGroupIds = existingProductAddonGroups.map(
    (row) => row.addon_group_id,
  );

  const addonGroupsToCreate = selectedAddonGroupIds.filter(
    (id) => !existingAddonGroupIds.includes(id),
  );
  const addonGroupsToDelete = existingAddonGroupIds.filter(
    (id) => !selectedAddonGroupIds.includes(id),
  );

  const retainedVariantIds = existingVariantsToUpdate.map((v) => v.id);

  try {
    return await prisma.product.update({
      where: { id: productId },
      data: {
        name: req.name,
        price: req.price,

        variants: {
          updateMany: {
            where: { id: { notIn: retainedVariantIds } },
            data: { is_delete: true },
          },
          update: existingVariantsToUpdate.map((v) => ({
            where: { id: v.id },
            data: { name: v.name, additional_price: v.additional_price },
          })),
          create: newVariantsToCreate.map((v) => ({
            name: v.name,
            additional_price: v.additional_price,
          })),
        },

        productAddonGroups: {
          ...(addonGroupsToDelete.length > 0 && {
            deleteMany: {
              addon_group_id: { in: addonGroupsToDelete },
            },
          }),
          ...(addonGroupsToCreate.length > 0 && {
            create: addonGroupsToCreate.map((addonGroupId) => ({
              addon_group_id: addonGroupId,
            })),
          }),
        },
      },
      include: { variants: true },
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw new ResponseError(
        400,
        "Tidak bisa memproses permintaan karena sedang ada pesanan aktif.",
      );
    }
    throw error;
  }
};

const updateProductImage = async (userId, productId, file) => {
  if (!file)
    throw new ResponseError(400, "Tidak ada file gambar yang diupload");

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      is_delete: false,
      store: { user_id: userId, is_delete: false },
    },
  });
  if (!product) throw new ResponseError(404, "Produk tidak ditemukan");

  return await prisma.product.update({
    where: { id: productId },
    data: { image_url: `/uploads/${file.filename}` },
    select: { id: true, name: true, image_url: true },
  });
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
  const store = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
    select: { id: true, timezone: true, created_at: true },
  });

  if (!store) throw new ResponseError(404, "Toko tidak ditemukan");

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
    throw new ResponseError(400, "Parameter bulan/tahun tidak valid.");
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
    if (!previous) return 100;
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

  const skip = (page - 1) * limit;
  const history = await prisma.queue.findMany({
    where: {
      store_id: store.id,
      status: statusCondition,
      ...dateCondition,
    },
    orderBy: { created_at: "desc" },
    skip: skip,
    take: Number(limit),
    include: {
      queueDetails: {
        include: { product: true, variant: true },
      },
    },
  });

  let totalRows = totalPesananSelesai + totalBatal;
  if (status === "SELESAI") totalRows = totalPesananSelesai;
  if (status === "DIBATALKAN") totalRows = totalBatal;
  const totalPages = Math.ceil(totalRows / limit);

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
  const skipTop = (topPage - 1) * topLimit;
  const topSellingGroups = allTopSellingGroups.slice(
    skipTop,
    skipTop + topLimit,
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
      currentPage: Number(page),
      limit: Number(limit),
    },
    history,
    topSelling: {
      rankings: topSellingList,
      pagination: {
        totalRows: totalTopSellingRows,
        totalPages: Math.ceil(totalTopSellingRows / topLimit),
        currentPage: Number(topPage),
        limit: Number(topLimit),
      },
    },
    topAddons: topSellingAddons,
  };
};
const getOperationalHours = async (userId) => {
  const store = await prisma.store.findUnique({
    where: { user_id: userId, is_delete: false },
    select: { id: true },
  });

  if (!store) throw new ResponseError(404, "Toko tidak ditemukan.");

  const hours = await prisma.storeOperationalHour.findMany({
    where: { store_id: store.id },
    orderBy: { day: "asc" },
  });

  if (hours.length === 0) {
    return Array.from({ length: 7 }).map((_, i) => ({
      day: i,
      open_time: null,
      close_time: null,
      is_active: false,
    }));
  }

  return hours;
};

const updateOperationalHours = async (userId, request) => {
  const req = validate(updateOperationalHoursValidation, request);

  const store = await prisma.store.findUnique({
    where: { user_id: userId, is_delete: false },
    select: { id: true },
  });

  if (!store) throw new ResponseError(404, "Toko tidak ditemukan.");

  const updates = req.operational_hours.map((hour) => {
    return prisma.storeOperationalHour.upsert({
      where: {
        store_id_day: { store_id: store.id, day: hour.day },
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

export default {
  create,
  createProduct,
  createAddonGroup,
  getAddonGroups,
  openCloseStore,
  updateLogo,
  updateStoreProfile,
  updateProductImage,
  updateProductInfo,
  getStoreHistory,
  getOperationalHours,
  updateOperationalHours,
};
