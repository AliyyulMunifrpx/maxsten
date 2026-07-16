import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import {
  editQueueStatusValidation,
  getAllQueueValidation,
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

export default {
  getAllQueue,
  editQueueStatus,
};
