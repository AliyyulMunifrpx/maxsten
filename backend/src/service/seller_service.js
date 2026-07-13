import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import {
  editQueueStatusValidation,
  getAllQueueValidation,
  getStoreValidation,
  updateAvailabilityValidation,
} from "../validation/seller_validation.js";
import { validate } from "../validation/validation.js";
const getAllQueue = async (request) => {
  const req = validate(getAllQueueValidation, request);

  // 1. Buat objek tanggal untuk awal hari ini (00:00:00)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Gunakan findUnique atau findFirst
  const store = await prisma.store.findFirst({
    where: {
      public_id: req.store_id,
      user_id: req.userId,
      is_delete: false,
    },
    select: {
      id: true,
    },
  });

  if (!store) {
    throw new ResponseError(
      400,
      "toko tidak ditemukan, pastikan anda berada di toko yang benar",
    );
  }

  const queues = await prisma.queue.findMany({
    where: {
      store_id: store.id,
      status: {
        in: ["BELUM_BAYAR", "DIPROSES"],
      },
      // 2. Tambahkan filter berdasarkan tanggal pembuatan
      created_at: {
        gte: startOfDay,
      },
    },

    include: {
      queueDetails: {
        include: {
          product: true,
          variant: {
            where: { is_delete: false },
          }, // <-- Tambahan biar di struk kelihatan nama variannya
        },
      },
    },
  });

  return queues;
};
const editQueueStatus = async (request) => {
  const req = validate(editQueueStatusValidation, request);
  const queue = await prisma.queue.findFirst({
    where: {
      id: req.id,
      store: {
        public_id: req.storeId,
        is_delete: false,
      },
    },
  });

  if (!queue) {
    throw new ResponseError(404, "Antrean tidak ditemukan");
  }

  const allowedTransitions = {
    BELUM_BAYAR: ["DIPROSES", "DIBATALKAN"],
    DIPROSES: ["SELESAI", "DIBATALKAN"],
    SELESAI: [],
    DIBATALKAN: [],
  };

  if (!(allowedTransitions[queue.status] ?? []).includes(req.status)) {
    throw new ResponseError(
      400,
      `Tidak bisa mengubah status dari ${queue.status} ke ${req.status}`,
    );
  }
  // UPDATE PAKE ID PRIMARY KEY
  return prisma.queue.update({
    where: {
      id: req.id,
    },
    data: {
      status: req.status,
      completed_at: req.status === "SELESAI" ? new Date() : undefined,
    },
    include: {
      queueDetails: {
        include: {
          product: true,
        },
      },
    },
  });
};
const getStore = async (request) => {
  // Biar penamaannya lebih jelas, request kita simpan di variabel userId
  const userId = validate(getStoreValidation, request);

  const store = await prisma.store.findUnique({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      public_id: true,
      name: true,
      description: true,
      address: true,
      logo_url: true,
      timezone: true,
      // ❌ is_open: true DIHAPUS

      // ✅ TAMBAHAN BARU: Tarik data yang dibutuhkan untuk kalkulasi
      manual_status: true,
      manual_updated_at: true,
      operational_hours: true,

      // Ambil produk sekaligus foto dan variannya
      products: {
        select: {
          id: true,
          name: true,
          price: true,
          image_url: true,
          is_available: true,
          productAddonGroups: {
            select: {
              addon_group: {
                select: {
                  id: true,
                  name: true,
                  addons: {
                    where: {
                      is_delete: false,
                    },
                    select: {
                      id: true,
                      name: true,
                      price: true,
                    },
                  },
                },
              },
            },
          },

          // Nested select lagi buat ngambil varian dari produk tersebut
          variants: {
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

  // Validasi tambahan: Jaga-jaga kalau user belum bikin toko sama sekali
  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan");
  }

  // 🔥 KALKULASI ON-THE-FLY 🔥
  // Hitung status toko detik ini juga pakai helper
  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  // Return datanya, kita sisipin property 'is_open' buatan sendiri
  // Biar frontend React lu ga ada yang error / ga perlu diubah kodenya
  return {
    ...store,
    is_open: isStoreOpen,
  };
};
const updateProductAvailability = async (userId, request) => {
  const req = validate(updateAvailabilityValidation, request);

  // 1. Pastikan produk yang mau diubah itu beneran milik toko si user yang login
  const product = await prisma.product.findFirst({
    where: {
      id: req.productId,
      store: { user_id: userId, is_delete: false },
    },
  });

  if (!product) {
    throw new ResponseError(
      404,
      "Produk tidak ditemukan atau bukan milik tokomu.",
    );
  }

  // 2. Update status ketersediaannya
  return await prisma.product.update({
    where: { id: req.productId },
    data: { is_available: req.is_available },
  });
};
export default {
  getAllQueue,
  editQueueStatus,
  getStore,
  updateProductAvailability,
};
