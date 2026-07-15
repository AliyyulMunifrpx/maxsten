import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import {
  createCancelReasonValidation,
  editQueueStatusValidation,
  getAllQueueValidation,
  getStoreValidation,
  updateAvailabilityValidation,
} from "../validation/seller_validation.js";
import { validate } from "../validation/validation.js";

const getAllQueue = async (request) => {
  const req = validate(getAllQueueValidation, request);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

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
      created_at: {
        gte: startOfDay,
      },
    },
    include: {
      queueDetails: {
        include: {
          product: true,
          variant: true,
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

  return prisma.queue.update({
    where: {
      id: req.id,
      
    },
    data: {
      status: req.status,
      cancellation_reason: req.reason,
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
      manual_status: true,
      manual_updated_at: true,
      operational_hours: true,
      // FIX: tambahin ini, biar EditStore.jsx bisa prefill nilai payment_timeout
      // yang lagi aktif. Sebelumnya field ini gak pernah keikut ke frontend.
      payment_timeout: true,

      products: {
        where: {
          is_delete: false,
        },
        select: {
          id: true,
          name: true,
          price: true,
          image_url: true,
          is_available: true,
          productAddonGroups: {
            where: {
              addon_group: {
                is_delete: false,
              },
            },
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
          variants: {
            where: {
              is_delete: false,
            },
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

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan");
  }

  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  return {
    ...store,
    is_open: isStoreOpen,
  };
};

const createCancelReason = async (userId, request) => {
  // 1. Validasi input
  const req = validate(createCancelReasonValidation, request);

  // 2. Cari toko milik user yang lagi login
  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan.");
  }

  // 3. Simpan ke database
  return await prisma.cancelReasonTemplate.create({
    data: {
      store_id: store.id,
      reason: req.reason,
      is_delete: false, // Memaksa false agar tidak langsung terhapus
    },
  });
};
const getCancelReasons = async (userId) => {
  const store = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan.");
  }

  return await prisma.cancelReasonTemplate.findMany({
    where: {
      store_id: store.id,
      is_delete: false,
    },
    orderBy: { created_at: "asc" }, // Biar urutannya konsisten
    select: {
      id: true,
      reason: true,
    },
  });
};
export default {
  getAllQueue,
  getCancelReasons,
  editQueueStatus,
  getStore,
  createCancelReason,
};
