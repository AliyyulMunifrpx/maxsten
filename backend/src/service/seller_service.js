import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import {
  editQueueStatusValidation,
  getAllQueueValidation,
} from "../validation/seller_validation.js";
import { validate } from "../validation/validation.js";

import { formatInTimeZone } from "date-fns-tz";

const getAllQueue = async (request) => {
  const req = validate(getAllQueueValidation, request);

  // 1. Cari toko berdasarkan public_id & pastikan milik user yang login
  const store = await prisma.store.findFirst({
    where: {
      public_id: req.store_id,
      user_id: req.userId,
      is_delete: false,
    },
    select: {
      id: true,
      timezone: true, // Ambil timezone untuk perhitungan waktu
    },
  });

  if (!store) {
    // Pake 404 dan bahasa Inggris
    throw new ResponseError(404, "Store not found or you don't have access");
  }

  // 2. Hitung awal hari (00:00:00) yang tepat berdasarkan timezone toko
  const now = new Date();
  const tz = store.timezone || "Asia/Jakarta";

  // Dapatkan format "YYYY-MM-DD" dan offset timezone (misal "+07:00")
  const todayStr = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const offsetStr = formatInTimeZone(now, tz, "XXX");

  // Parse jadi objek Date yang akurat di jam 00:00:00 untuk zona waktu tersebut
  const startOfDay = new Date(`${todayStr}T00:00:00.000${offsetStr}`);

  // 3. Tarik data antrean
  const queues = await prisma.queue.findMany({
    where: {
      store_id: store.id,
      status: {
        // Bebas filter gini, karena cron lu otomatis ngebersihin yg expired
        in: ["BELUM_BAYAR", "DIPROSES"],
      },
      created_at: {
        gte: startOfDay,
      },
    },
    orderBy: {
      // Urutkan dari yang paling lama antre ke yang terbaru (FIFO)
      created_at: "asc",
    },
    select: {
      id: true,
      queue_number: true,
      total_price: true,
      status: true,
      created_at: true,
      expired_at: true,
      note: true,
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
      ...(req.status === "SELESAI" ? { completed_at: new Date() } : {}),
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

export default {
  getAllQueue,
  editQueueStatus,
};
