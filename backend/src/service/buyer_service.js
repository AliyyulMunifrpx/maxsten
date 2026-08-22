import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import {
  cancelQueueValidation,
  createQueueValidation,
  getAllProductDisplayValidation,
  getProductDetailsValidation,
  getQueueValidation,
} from "../validation/buyer_validation.js";
import { validate } from "../validation/validation.js";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import Fuse from "fuse.js";

const DEFAULT_PAYMENT_TIMEOUT_MINUTES = 30;

const resolvePaymentTimeout = (paymentTimeout) => {
  if (typeof paymentTimeout !== "number" || !Number.isFinite(paymentTimeout)) {
    return DEFAULT_PAYMENT_TIMEOUT_MINUTES;
  }

  if (paymentTimeout <= 0) {
    return DEFAULT_PAYMENT_TIMEOUT_MINUTES;
  }

  return Math.floor(paymentTimeout);
};

const createQueue = async (request) => {
  const req = validate(createQueueValidation, request);

  // 1. Tarik data toko sekalian sama jadwal operasionalnya
const store = await prisma.store.findFirst({
  where: { public_id: req.public_id, is_delete: false },
  select: {
    id: true,
    operational_hours: true,
    payment_timeout: true,
    timezone: true,
    manual_status: true,      // ➕ tambah
    manual_updated_at: true,  // ➕ tambah
  },
});

  if (!store) throw new ResponseError(404, "Store not found");

  // 2. Kalkulasi apakah detik ini toko beneran buka?
  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);
  if (!isStoreOpen) {
    throw new ResponseError(400, "Sorry, the store is currently closed");
  }

  // 3. Pastikan Guest ID tersimpan di database (di luar transaksi biar cepet)
  await prisma.guest.upsert({
    where: { id: req.guest_id },
    update: {},
    create: { id: req.guest_id },
  });

  // 4. Tarik data produk beserta relasi (Varian & Addon) HANYA SEKALI
  const requestedProductIds = [
    ...new Set(req.items.map((item) => item.product_id)),
  ];
  const existingProducts = await prisma.product.findMany({
    where: {
      id: { in: requestedProductIds },
      store_id: store.id,
      is_delete: false,
    },
    include: {
      variants: { where: { is_delete: false } },
      productAddonGroups: {
        where: { addon_group: { is_delete: false } },
        include: {
          addon_group: {
            include: { addons: { where: { is_delete: false } } },
          },
        },
      },
    },
  });

  if (existingProducts.length !== requestedProductIds.length) {
    throw new ResponseError(404, "Some products were not found");
  }

  // 5. Kalkulasi Harga dan Validasi Stok (Satpam)
  let totalPrice = 0;
  const productMap = new Map(existingProducts.map((p) => [p.id, p]));

  const queueDetailsData = req.items.map((item) => {
    // a. Cegah hacker nyolong harga pakai quantity minus (Meski udah ada di validasi Joi/Zod)
    if (item.quantity <= 0) {
      throw new ResponseError(
        400,
        "The quantity of items in the order is invalid",
      );
    }

    const product = productMap.get(item.product_id);

    // b. Cek ketersediaan produk on-the-fly
    if (!product.is_available) {
      throw new ResponseError(
        400,
        `Sorry, the product ${product.name} is currently unavailable or out of stock`,
      );
    }

    let variantPrice = 0;
    let validVariantId = null;

    // c. Validasi Varian
    if (item.variant_id) {
      const selectedVariant = product.variants.find(
        (v) => v.id === item.variant_id,
      );
      if (selectedVariant) {
        variantPrice = selectedVariant.additional_price;
        validVariantId = selectedVariant.id;
      } else {
        throw new ResponseError(
          400,
          `Invalid variant for product ${product.name}`,
        );
      }
    }

    // d. Validasi Addons
    const availableAddons = product.productAddonGroups.flatMap(
      (pag) => pag.addon_group.addons,
    );
    const addonMap = new Map(availableAddons.map((addon) => [addon.id, addon]));
    const selectedAddonIds = Array.isArray(item.selected_addons)
      ? [...new Set(item.selected_addons)]
      : [];

    const selectedAddonDetails = selectedAddonIds.map((addonId) => {
      const addon = addonMap.get(addonId);
      if (!addon)
        throw new ResponseError(
          400,
          `The add-on selection is not valid for the product ${product.name}`,
        );
      return { id: addon.id, name: addon.name, price: addon.price };
    });

    const addonPrice = selectedAddonDetails.reduce(
      (sum, addon) => sum + addon.price,
      0,
    );

    // e. Tambah ke total harga keseluruhan
    totalPrice += (product.price + variantPrice + addonPrice) * item.quantity;

    return {
      product_id: item.product_id,
      variant_id: validVariantId,
      quantity: item.quantity,
      selected_addons: selectedAddonDetails,
    };
  });
  const tz = store.timezone || "Asia/Jakarta";
  const nowUtc = new Date();

  // AMAN DARI SERVER OS: Dapatkan "jam" saat ini secara akurat sebagai angka
  const currentHourZoned = parseInt(formatInTimeZone(nowUtc, tz, "HH"), 10);

  // Dapatkan tanggal, bulan, tahun dalam bentuk format aman
  let businessDateString = formatInTimeZone(nowUtc, tz, "yyyy-MM-dd");

  if (currentHourZoned < 6) {
    // Jika masih di bawah jam 6 pagi, kurangi 24 jam dari sekarang, lalu ambil tanggalnya
    const yesterdayUtc = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000);
    businessDateString = formatInTimeZone(yesterdayUtc, tz, "yyyy-MM-dd");
  }

  // Gabungkan tanggal bisnis yang sudah fix dengan jam 06:00:00
  const startOfBusinessDayString = `${businessDateString} 06:00:00`;

  // Kembalikan ke UTC untuk Prisma
  const startOfBusinessDayUtc = fromZonedTime(startOfBusinessDayString, tz);

  // ✅ PERBAIKAN LOGIKA PAYMENT TIMEOUT
  // Gunakan fungsi resolvePaymentTimeout yang sudah kamu buat di atas
  // Fungsi ini akan mengecek apakah datanya valid, angka, dan lebih dari 0.
  const paymentTimeoutMinutes = resolvePaymentTimeout(store.payment_timeout);

  const expiredAt = new Date(
    nowUtc.getTime() + paymentTimeoutMinutes * 60 * 1000,
  );
  // 🔥 7. TRANSACTION & LOCKING (Anti-Race Condition) 🔥
  const newQueue = await prisma.$transaction(async (tx) => {
    // a. Lock baris Guest dan Store biar request dobel/barengan disuruh ngantre antrean server
    await tx.$executeRaw`SELECT id FROM "Guest" WHERE id = ${req.guest_id} FOR UPDATE`;
    await tx.$executeRaw`SELECT id FROM stores WHERE id = ${store.id} FOR UPDATE`;

    // b. Cek Antrean Hantu: Jangan blokir kalau antreannya udah kelewat waktu (basi)
    const activeQueue = await tx.queue.findFirst({
      where: {
        guest_id: req.guest_id,
        store_id: store.id,
        OR: [
          { status: "DIPROSES" },
          {
            status: "BELUM_BAYAR",
            expired_at: { gt: nowUtc }, // <-- Ini yang bikin "Antrean Hantu" gak terjadi lagi
          },
        ],
      },
    });

    if (activeQueue) {
      throw new ResponseError(400, "Please finish the previous queue first.");
    }

    // c. Ambil antrean terakhir sejak jam 6 Pagi hari bisnis ini
    const lastQueue = await tx.queue.findFirst({
      where: { store_id: store.id, created_at: { gte: startOfBusinessDayUtc } },
      orderBy: { queue_number: "desc" },
    });

    const queueNumber = lastQueue ? lastQueue.queue_number + 1 : 1;

    // d. Eksekusi Create Antrean
    return await tx.queue.create({
      data: {
        store_id: store.id,
        queue_number: queueNumber,
        guest_id: req.guest_id,
        note: req.note,
        total_price: totalPrice,
        expired_at: expiredAt,
        queueDetails: {
          create: queueDetailsData,
        },
      },
      select: {
        id: true,
        queue_number: true,
        total_price: true,
        status: true,
        created_at: true,
        completed_at: true,
        note: true,
        expired_at: true,
        guest_id: true,
        cancelled_by: true,
        cancellation_reason: true,

        // Hanya buat Socket.IO, nanti dibuang di controller
        store: {
          select: {
            id: true,
          },
        },

        queueDetails: {
          select: {
            id: true,
            quantity: true,
            selected_addons: true,

            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image_url: true,
                description: true,
                is_available: true,
              },
            },

            variant: {
              select: {
                id: true,
                name: true,
                additional_price: true,
              },
            },
          },
        },
      },
    });
  });

  // 8. Kembalikan response
  return {
    ...newQueue,
    server_now: nowUtc.toISOString(),
  };
};
const getAllProductDisplay = async (request) => {
  const req = validate(getAllProductDisplayValidation, request);
  const pageNum = req.page || 1;
  const keyword = req.keyword || "";

  const store = await prisma.store.findFirst({
    where: {
      public_id: req.public_id,
      is_delete: false,
    },
    select: {
      id: true,
      name: true,
      street_address: true,
      village: true,
      district: true,
      city: true,
      province: true,
      postal_code: true,
      latitude: true,
      longitude: true,
      description: true,
      logo_url: true,
      timezone: true,
      operational_hours: true,
          manual_status: true,      // ➕ tambah
    manual_updated_at: true,  // ➕ tambah
    },
  });

  if (!store) {
    throw new ResponseError(404, "Store not found");
  }

  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  const limit = 20;
  const skipCurrent = (pageNum - 1) * limit;
  const skipNext = pageNum * limit;

  const productWhere = {
    store_id: store.id,
    is_delete: false,
  };

  const productSelect = {
    id: true,
    name: true,
    description: true,
    price: true,
    image_url: true,
    is_available: true,
  };

  let currentPageProducts = [];
  let nextPageProducts = [];
  let totalRows = 0;

  if (keyword) {
    // Fuzzy text search (toleran typo) - bukan lagi semantic/vector search.
    const allProducts = await prisma.product.findMany({
      where: productWhere,
      select: productSelect,
      orderBy: { created_at: "desc" },
    });

    const fuse = new Fuse(allProducts, {
      keys: ["name"],
      threshold: 0.4,
    });

    const searchResults = fuse.search(keyword).map((result) => result.item);

    totalRows = searchResults.length;
    currentPageProducts = searchResults.slice(skipCurrent, skipCurrent + limit);
    nextPageProducts = searchResults.slice(skipNext, skipNext + limit);
  } else {
    const [current, next, total] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        select: productSelect,
        orderBy: { created_at: "desc" },
        skip: skipCurrent,
        take: limit,
      }),
      prisma.product.findMany({
        where: productWhere,
        select: productSelect,
        orderBy: { created_at: "desc" },
        skip: skipNext,
        take: limit,
      }),
      prisma.product.count({
        where: productWhere,
      }),
    ]);

    currentPageProducts = current;
    nextPageProducts = next;
    totalRows = total;
  }

  const allProductIds = [...currentPageProducts, ...nextPageProducts].map(
    (p) => p.id,
  );

  const soldAggregates = allProductIds.length
    ? await prisma.queueDetail.groupBy({
        by: ["product_id"],
        where: {
          product_id: { in: allProductIds },
          queue: { status: "SELESAI" },
        },
        _sum: { quantity: true },
      })
    : [];

  const soldMap = new Map(
    soldAggregates.map((row) => [row.product_id, row._sum.quantity || 0]),
  );

  const attachSold = (products) =>
    products.map((p) => ({ ...p, total_sold: soldMap.get(p.id) || 0 }));

  return {
    store: {
      name: store.name,
      description: store.description,
      logo_url: store.logo_url,
      is_open: isStoreOpen,
      street_address: store.street_address,
      village: store.village,
      district: store.district,
      city: store.city,
      province: store.province,
      postal_code: store.postal_code,
      latitude: store.latitude,
      longitude: store.longitude,
    },
    currentPage: attachSold(currentPageProducts),
    nextPage: attachSold(nextPageProducts),
    pagination: {
      currentPage: pageNum,
      limit: 20,
      totalRows,
      totalPages: Math.ceil(totalRows / 20),
    },
  };
};
const getQueue = async (request) => {
  const req = validate(getQueueValidation, request);
  const queue = await prisma.queue.findFirst({
    where: {
      id: req.queueId,
      guest_id: req.guest_id,
      store: {
        public_id: req.public_id,
      },
    },
    select: {
      id: true,
      queue_number: true,
      total_price: true,
      status: true,
      created_at: true,
      completed_at: true,
      note: true,
      expired_at: true,
      guest_id: true,
      cancelled_by: true,
      cancellation_reason: true,

      queueDetails: {
        select: {
          id: true,
          quantity: true,
          selected_addons: true,

          product: {
            select: {
              id: true,
              name: true,
              price: true,
              is_available: true,
              image_url: true,
              description: true,
            },
          },

          variant: {
            select: {
              id: true,
              name: true,
              additional_price: true,
              is_delete: true,
            },
          },
        },
      },
    },
  });
  if (!queue) {
    throw new ResponseError(404, "No queue found");
  }

  return {
    ...queue,
    server_now: new Date().toISOString(),
  };
};
const cancelQueue = async (request) => {
  const req = validate(cancelQueueValidation, request);

  // 1. Cari antrean untuk divalidasi kepemilikannya
  const queue = await prisma.queue.findFirst({
    where: {
      id: req.queueId,
      guest_id: req.guest_id,
      store: {
        public_id: req.public_id,
        // ✅ FIX: is_delete: false DIHAPUS. Pembeli berhak batalin pesanan
        // walau tokonya udah tutup/dihapus sistem.
      },
    },
    select: {
      id: true,
      status: true,
      store_id: true,
    },
  });

  if (!queue) {
    throw new ResponseError(
      404,
      "The order was not found or does not belong to you",
    );
  }

  // 2. Guard Clause Awal
  if (queue.status !== "BELUM_BAYAR") {
    throw new ResponseError(
      400,
      "The order has been processed and cannot be canceled",
    );
  }

  // 🔥 3. ATOMIC UPDATE (OBAT RACE CONDITION) 🔥
  const updateResult = await prisma.queue.updateMany({
    where: {
      id: queue.id,
      status: "BELUM_BAYAR",
    },
    data: {
      status: "DIBATALKAN",
      cancelled_by: "BUYER",
      cancellation_reason: req.reason,
    },
  });

  if (updateResult.count === 0) {
    throw new ResponseError(
      400,
      "Oh, someone beat you to it! Your order has just started being processed by the store",
    );
  }

  // 4. Return Data Minimal (untuk Socket)
  return {
    id: queue.id,
    status: "DIBATALKAN",
    store_id: queue.store_id,
    reason: req.reason || null,
  };
};
const getProductDetails = async (request) => {
  const req = validate(getProductDetailsValidation, request);

  // 1. Tarik Data Utama Produk & Relasinya
  const product = await prisma.product.findFirst({
    where: {
      id: req.product_id,
      is_delete: false,
      store: {
        public_id: req.public_id,
        is_delete: false,
      },
    },
    include: {
      variants: {
        where: { is_delete: false },
      },
      productAddonGroups: {
        where: {
          addon_group: { is_delete: false },
        },
        include: {
          addon_group: {
            include: {
              addons: {
                where: { is_delete: false },
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new ResponseError(404, "Product not found");
  }

  // 2. Kalkulasi Jumlah Terjual (Hanya hitung antrean SELESAI)
  const soldAggregate = await prisma.queueDetail.aggregate({
    _sum: {
      quantity: true,
    },
    where: {
      product_id: product.id,
      queue: {
        status: "SELESAI",
      },
    },
  });

  const totalSold = soldAggregate._sum.quantity || 0;

  // 3. Return Data Bersih ke Controller
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    variants: product.variants,
    is_available: product.is_available,
    total_sold: totalSold,
    description: product.description,
    image_url: product.image_url,
    addon_groups: product.productAddonGroups.map((item) => item.addon_group),
  };
};
export default {
  createQueue,
  getAllProductDisplay,
  getQueue,
  cancelQueue,
  getProductDetails,
};
