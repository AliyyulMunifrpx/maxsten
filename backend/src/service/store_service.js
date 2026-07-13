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

const create = async (requestBody, file) => {
  // 1. Validasi teks (nama toko) dari requestBody menggunakan Joi lu

  const req = validate(createStoreValidation, requestBody);

  // 2. Cek apakah user ini udah punya toko belum (One-to-One)
  const existingStore = await prisma.store.count({
    where: { user_id: req.userId },
  });
  if (existingStore > 0) {
    throw new ResponseError(400, "Kamu sudah memiliki toko.");
  }

  // 3. Cek apakah ada file logo yang diupload. Kalau gak ada, set null.
  const logoPath = file ? `/uploads/${file.filename}` : null;

  // 4. Simpan ke database sekaligus
  return await prisma.store.create({
    data: {
      name: req.name,
      description: req.description,
      address: req.address,
      user_id: req.userId,
      logo_url: logoPath,
      timezone: req.timezone, // Langsung masuk nilainya di sini
    },
    select: {
      id: true,
      public_id: true,
      name: true,
      logo_url: true,
    },
  });
}; // Tambahkan parameter 'file' di fungsinya
const createProduct = async (request, file) => {
  // 1. TANGKAP DAN CAIRKAN STRING JADI ARRAY DULU (SEBELUM VALIDASI)
  if (typeof request.variants === "string") {
    try {
      request.variants = JSON.parse(request.variants);
    } catch (e) {
      // Kalau ternyata string-nya rusak/bukan JSON, kosongin aja biar gak crash
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

  // Joi juga butuh angka murni buat price, bukan string "15000" dari FormData
  if (typeof request.price === "string") {
    request.price = Number(request.price);
  }

  // 2. SETELAH JADI ARRAY & ANGKA ASLI, BARU KASIH KE SATPAM JOI
  const req = validate(createProductValidation, request);

  // ... (Sisa kode ke bawahnya sama persis kayak sebelumnya)
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

  // 2. Validasi: Cek apakah nama produk INI sudah ada di toko INI
  const existingProduct = await prisma.product.count({
    where: {
      store_id: store.id,
      name: req.name,
    },
  });

  if (existingProduct > 0) {
    throw new ResponseError(
      400,
      `Produk dengan nama '${req.name}' sudah ada di toko ini.`,
    );
  }

  // Ambil path foto produk jika diupload
  const productImagePath = file ? `/uploads/${file.filename}` : null;

  // Jika data variants dikirim sebagai string JSON dari FormData, kita parse dulu di sini
  let parsedVariants = req.variants;
  if (typeof req.variants === "string") {
    try {
      parsedVariants = JSON.parse(req.variants);
    } catch (e) {
      parsedVariants = [];
    }
  }

  // Jika data addon_group_ids dikirim sebagai string JSON dari FormData, kita parse dulu di sini
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
      },
    });
    if (validAddonGroups !== parsedAddonGroupIds.length) {
      throw new ResponseError(
        400,
        "Beberapa grup add-on tidak valid untuk toko ini.",
      );
    }
  }

  // 3. Buat Produk Sekaligus Variannya (Nested Write) dan relasi AddonGroup bila ada
  return await prisma.product.create({
    data: {
      name: req.name,
      price: Number(req.price), // Pastikan jadi angka murni
      image_url: productImagePath, // Simpan path foto produk
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
  // Anggap userId didapat dari middleware auth
  const req = validate(openCloseStoreValidation, request);

  // 1. Cari toko berdasarkan public_id DAN pastikan ini milik user yang login
  const store = await prisma.store.findFirst({
    where: {
      public_id: req.store_id,
      user_id: req.userId,
      is_delete: false,
    },
    include: {
      operational_hours: true, // Wajib tarik jadwal untuk dihitung
    },
  });

  // 2. Handling jika tidak ketemu
  if (!store) {
    throw new ResponseError(
      404,
      "toko tidak ditemukan, atau anda tidak memiliki akses",
    );
  }

  // 3. Kalkulasi status toko SAAT INI (True = Buka, False = Tutup)
  const isCurrentlyOpen = calculateStoreStatus(store, store.operational_hours);

  // 4. Tentukan status baru (kebalikannya)
  const newManualStatus = isCurrentlyOpen ? "CLOSED" : "OPEN";

  // 5. Update menggunakan kolom baru (manual_status & manual_updated_at)
  await prisma.store.update({
    where: {
      id: store.id,
    },
    data: {
      manual_status: newManualStatus,
      manual_updated_at: new Date(), // Catat waktu ditekan
    },
  });

  return {
    message:
      newManualStatus === "OPEN"
        ? "berhasil membuka toko"
        : "berhasil menutup toko",
    is_open: newManualStatus === "OPEN", // Balikin buat di-consume frontend
  };
};
const updateLogo = async (userId, file) => {
  if (!file) throw new ResponseError(400, "Tidak ada file yang diupload");

  const store = await prisma.store.findUnique({ where: { user_id: userId } });
  if (!store) throw new ResponseError(404, "Toko tidak ditemukan");

  // Simpan path gambarnya aja ke database
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
    },
    select: { id: true, name: true, description: true, address: true },
  });
};
// 1. UPDATE TEKS & VARIAN (JSON)
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
    where: { store_id: store.id },
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
  console.log(req);
  // Cek apakah produk ini beneran punya toko si user
  // (Pastikan toko juga is_deleted: false sesuai kesepakatan kita sebelumnya)
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      store: { user_id: userId, is_delete: false },
    },
    include: { variants: true },
  });

  if (!product)
    throw new ResponseError(404, "Produk tidak ditemukan atau bukan milikmu");

  // --- LOGIKA VARIAN SAKTI ---
  const reqVariants = req.variants || [];
  const existingVariantsToUpdate = reqVariants.filter((v) => v.id);
  const newVariantsToCreate = reqVariants.filter((v) => !v.id);

  const selectedAddonGroupIds = Array.isArray(req.addon_group_ids)
    ? req.addon_group_ids
    : [];

  // Ambil semua grup add-on yang valid untuk toko si user
  if (selectedAddonGroupIds.length > 0) {
    const validAddonGroups = await prisma.addonGroup.count({
      where: {
        id: { in: selectedAddonGroupIds },
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

  // Ambil kumpulan ID varian yang dipertahankan user
  const retainedVariantIds = existingVariantsToUpdate.map((v) => v.id);
  console.log(retainedVariantIds);
  try {
    return await prisma.product.update({
      where: { id: productId },
      data: {
        name: req.name,
        price: req.price,

        variants: {
          // A. SOFT DELETE: Ubah is_deleted jadi true buat varian yang ID-nya gak dikirim dari frontend
          updateMany: {
            where: { id: { notIn: retainedVariantIds } },
            data: { is_delete: true },
          },
          // B. UPDATE varian lama yang ID-nya masih dipertahankan
          update: existingVariantsToUpdate.map((v) => ({
            where: { id: v.id },
            data: { name: v.name, additional_price: v.additional_price },
          })),
          // C. CREATE varian baru yang belum punya ID
          create: newVariantsToCreate.map((v) => ({
            name: v.name,
            additional_price: v.additional_price,
            // is_deleted otomatis false dari default schema Prisma
          })),
        },

        // Relasi Addon: Aman pakai deleteMany (Hard Delete) karena ini cuma tabel penghubung (Pivot)
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
    // Karena kita pakai Soft Delete, error P2003 (Foreign Key Constraint)
    // pada Varian hampir mustahil terjadi, tapi biarin aja blok catch ini buat jaga-jaga
    if (error.code === "P2003") {
      throw new ResponseError(
        400,
        "Tidak bisa memproses permintaan karena sedang ada pesanan aktif.",
      );
    }
    throw error;
  }
};
// 2. UPDATE FOTO PRODUK (FormData)
const updateProductImage = async (userId, productId, file) => {
  if (!file)
    throw new ResponseError(400, "Tidak ada file gambar yang diupload");

  const product = await prisma.product.findFirst({
    where: { id: productId, store: { user_id: userId, is_delete: false } },
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
  filter = "all",
  page = 1,
  limit = 10,
  topPage = 1,
  topLimit = 10,
  status = "ALL", // Default parameter status
) => {
  // 1. Validasi Toko
  const store = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
    select: { id: true }, // Best practice: Hanya ambil ID untuk efisiensi
  });

  if (!store) throw new ResponseError(404, "Toko tidak ditemukan");

  // ==========================================
  // LOGIKA FILTER TANGGAL
  // ==========================================
  let dateCondition = {};
  const now = new Date();

  if (filter !== "all") {
    const startDate = new Date();
    if (filter === "day") startDate.setHours(0, 0, 0, 0);
    else if (filter === "week") startDate.setDate(now.getDate() - 7);
    else if (filter === "month") startDate.setMonth(now.getMonth() - 1);
    else if (filter === "year") startDate.setFullYear(now.getFullYear() - 1);

    dateCondition = { created_at: { gte: startDate } };
  }

  // ==========================================
  // HELPER FORMAT CHART LABEL
  // ==========================================
  const buildLabelOrder = (earliestDate) => {
    const labels = [];
    if (filter === "day") {
      for (let hour = 0; hour < 24; hour++) {
        labels.push(`${hour.toString().padStart(2, "0")}:00`);
      }
    } else if (filter === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(
          d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        );
      }
    } else if (filter === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(
          d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        );
      }
    } else if (filter === "year") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(
          `${d.toLocaleString("id-ID", { month: "short" })} ${d.getFullYear().toString().slice(-2)}`,
        );
      }
    } else {
      const start = earliestDate
        ? new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const cursor = new Date(start);
      while (cursor <= now) {
        labels.push(
          `${cursor.toLocaleString("id-ID", { month: "short" })} ${cursor.getFullYear().toString().slice(-2)}`,
        );
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    return labels;
  };

  const getRowLabel = (date) => {
    if (filter === "day")
      return `${date.getHours().toString().padStart(2, "0")}:00`;
    if (filter === "year" || filter === "all")
      return `${date.toLocaleString("id-ID", { month: "short" })} ${date.getFullYear().toString().slice(-2)}`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  // ==========================================
  // 1. RINGKASAN METRIK TRANSAKSI (AGREGASI)
  // ==========================================
  const aggSelesai = await prisma.queue.aggregate({
    where: { store_id: store.id, status: "SELESAI", ...dateCondition },
    _sum: { total_price: true },
    _count: true,
  });

  const aggBatal = await prisma.queue.aggregate({
    where: { store_id: store.id, status: "DIBATALKAN", ...dateCondition },
    _count: true,
  });

  // ==========================================
  // 2. TABEL RIWAYAT (PAGINATION & FILTER STATUS)
  // ==========================================
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

  // Hitung total data untuk pagination tabel riwayat
  let totalRows = aggSelesai._count + aggBatal._count;
  if (status === "SELESAI") totalRows = aggSelesai._count;
  if (status === "DIBATALKAN") totalRows = aggBatal._count;
  const totalPages = Math.ceil(totalRows / limit);

  // ==========================================
  // 3. GRAFIK TREN OMZET KESELURUHAN
  // ==========================================
  let earliestQueueDate = null;
  if (filter === "all") {
    const earliestQueue = await prisma.queue.findFirst({
      where: { store_id: store.id, status: "SELESAI" },
      orderBy: { created_at: "asc" },
      select: { created_at: true },
    });
    earliestQueueDate = earliestQueue?.created_at || null;
  }

  const labelOrder = buildLabelOrder(earliestQueueDate);

  const revenueRows = await prisma.queue.findMany({
    where: { store_id: store.id, status: "SELESAI", ...dateCondition },
    select: { created_at: true, total_price: true },
    orderBy: { created_at: "asc" },
  });

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

  const revenueChartMap = {};
  labelOrder.forEach((label) => {
    revenueChartMap[label] = { label, omzet: 0 };
  });

  revenueRows.forEach((row) => {
    const label = getRowLabel(new Date(row.created_at));
    if (revenueChartMap[label]) revenueChartMap[label].omzet += row.total_price;
  });
  const chartData = labelOrder.map((label) => revenueChartMap[label]);

  // ==========================================
  // 4. TOP SELLING PRODUCTS
  // ==========================================
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

  // Ambil Top 5 untuk grafik
  const top5Groups = allTopSellingGroups.slice(0, 5);
  const top5ProductIds = top5Groups.map((row) => row.product_id);

  // Ambil nama produk dari database
  const productIdsForNames = Array.from(
    new Set([...topSellingGroups.map((r) => r.product_id), ...top5ProductIds]),
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

  const top5ProductsMeta = top5ProductIds.map((productId, index) => ({
    product_id: productId,
    name: productNameMap.get(productId) || "Produk Tidak Diketahui",
    color:
      ["#169446", "#C98A1F", "#4F46E5", "#DB2777", "#2563EB"][index] ||
      "#1C2321",
    key: `product_${productId}`,
  }));

  const top5SeriesKeys = top5ProductsMeta.map((p) => p.key);
  const top5DetailRows = await prisma.queueDetail.findMany({
    where: {
      queue: { store_id: store.id, status: "SELESAI", ...dateCondition },
      product_id: { in: top5ProductIds },
    },
    select: {
      product_id: true,
      quantity: true,
      queue: { select: { created_at: true } },
    },
  });

  const chartDataMap = {};
  labelOrder.forEach((label) => {
    chartDataMap[label] = { label };
    top5SeriesKeys.forEach((key) => {
      chartDataMap[label][key] = 0;
    });
  });

  top5DetailRows.forEach((row) => {
    const label = getRowLabel(new Date(row.queue.created_at));
    if (chartDataMap[label]) {
      const key = `product_${row.product_id}`;
      chartDataMap[label][key] += row.quantity;
    }
  });
  const topSellingChartData = labelOrder.map((label) => chartDataMap[label]);

  // ==========================================
  // 5. TOP SELLING ADDONS (Perhitungan dari JSON)
  // ==========================================
  // Mengambil hanya kolom yang dibutuhkan untuk menghemat RAM Server
  const allCompletedDetails = await prisma.queueDetail.findMany({
    where: {
      queue: { store_id: store.id, status: "SELESAI", ...dateCondition },
      selected_addons: { not: null },
    },
    select: { selected_addons: true, quantity: true },
  });

  const addonSalesMap = {};

  allCompletedDetails.forEach((detail) => {
    // Defensive parsing: Prisma biasanya return JSON sebagai object/array,
    // tapi kalau tersimpan sebagai string literal, kita parse.
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
          // Jika pesan 2 cup minuman, dan masing-masing pakai boba, berarti total boba terjual = 2
          addonSalesMap[addonName].totalQuantity += detail.quantity;
        }
      });
    }
  });

  // Konversi objek ke array, urutkan dari terbanyak, lalu ambil Top 10
  const topSellingAddons = Object.values(addonSalesMap)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10);

  // ==========================================
  // RETURN DATA REPORT
  // ==========================================
  return {
    summary: {
      totalOmzet: aggSelesai._sum.total_price || 0,
      totalPesanan: aggSelesai._count,
      totalBatal: aggBatal._count,
    },
    pagination: {
      totalRows,
      totalPages,
      currentPage: Number(page),
      limit: Number(limit),
    },
    history,
    chartData,
    summary: {
      averageWaitTimeMinutes,
    },
    topSelling: {
      chartData: topSellingChartData,
      products: top5ProductsMeta,
      rankings: topSellingList,
      pagination: {
        totalRows: totalTopSellingRows,
        totalPages: Math.ceil(totalTopSellingRows / topLimit),
        currentPage: Number(topPage),
        limit: Number(topLimit),
      },
    },
    topAddons: topSellingAddons, // <- Hasil Top Addons yang baru dibuat
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

  // Jika belum ada jadwal sama sekali, balikin default tutup semua (0-6)
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

  // Pakai fitur transaksi Prisma biar kalau ada yang gagal satu, gagal semua (aman)
  // Upsert = Kalau data hari itu udah ada, di-update. Kalau belum, di-create.
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

  // Kembalikan data jadwal terbaru setelah di-update
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
