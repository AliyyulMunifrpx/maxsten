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
  const pageNum = req.page || 1;

  // 1. Cari toko beserta jadwal operasionalnya (WAJIB pakai include agar helper jalan)
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
    throw new ResponseError(404, "Store not found or you don't have access");
  }

  // 2. Panggil helper untuk dapetin status buka/tutup toko saat ini
  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);
  const tz = store.timezone || "Asia/Jakarta";

  // 3. Setup Pagination Offsets
  const skipCurrent = (pageNum - 1) * 20;
  const skipNext = pageNum * 20;

  // 4. Query constraint - TIDAK ADA filter tanggal/created_at.
  // Antrean yang sudah kadaluarsa/basi dibersihkan oleh cron job terpisah
  // (BELUM_BAYAR yang lewat expired_at -> otomatis di-flip ke DIBATALKAN),
  // bukan disembunyikan lewat query di sini. Kalau statusnya masih
  // BELUM_BAYAR/DIPROSES, artinya cron job belum menganggapnya basi,
  // jadi harus tetap tampil - termasuk antrean sesi malam yang dibuat
  // sebelum tengah malam dan masih berlangsung setelah lewat jam 00:00.
  const queueWhere = {
    store_id: store.id,
    status: {
      in: ["BELUM_BAYAR", "DIPROSES"],
    },
  };

  const queueSelect = {
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
  };

  // 5. Jalankan 3 query secara paralel
  const [currentPageQueues, nextPageQueues, totalRows] = await Promise.all([
    prisma.queue.findMany({
      where: queueWhere,
      orderBy: { created_at: "asc" }, // FIFO
      skip: skipCurrent,
      take: 20,
      select: queueSelect,
    }),
    prisma.queue.findMany({
      where: queueWhere,
      orderBy: { created_at: "asc" },
      skip: skipNext,
      take: 20,
      select: queueSelect,
    }),
    prisma.queue.count({
      where: queueWhere,
    }),
  ]);

  // 6. Return response lengkap dengan status toko
  return {
    storeStatus: {
      is_open: isStoreOpen,
      timezone: tz,
    },
    currentPage: currentPageQueues,
    nextPage: nextPageQueues,
    pagination: {
      currentPage: pageNum,
      limit: 20,
      totalRows,
      totalPages: Math.ceil(totalRows / 20),
    },
  };
};
const editQueueStatus = async (request) => {
  // Asumsi di request object ini lu nyelipin userId dari token
  const req = validate(editQueueStatusValidation, request);

  // 1. CARI & CEK OTORISASI (Tambahkan userId di where clause)
  const queue = await prisma.queue.findFirst({
    where: {
      id: req.id,
      store: {
        public_id: req.storeId,
        user_id: req.userId, // <--- FIX 1: Wajib! Pastikan ini toko milik dia
        is_delete: false,
      },
    },
    select: { id: true, status: true },
  });

  if (!queue) {
    throw new ResponseError(404, "Queue not found");
  }

  // 2. CEK TRANSISI STATUS
  const allowedTransitions = {
    BELUM_BAYAR: ["DIPROSES", "DIBATALKAN"],
    DIPROSES: ["SELESAI", "DIBATALKAN"],
    SELESAI: [],
    DIBATALKAN: [],
  };

  if (!(allowedTransitions[queue.status] ?? []).includes(req.status)) {
    throw new ResponseError(
      400,
      `Cannot change the status from ${queue.status} to ${req.status}`,
    );
  }

  // 3. SIAPKAN PAYLOAD UPDATE SESUAI STATUS BARU
  let updateData = { status: req.status };

  // 👇 INI PERUBAHANNYA: Isi processed_at kalau statusnya DIPROSES
  if (req.status === "DIPROSES") {
    updateData.processed_at = new Date();
  } else if (req.status === "SELESAI") {
    updateData.completed_at = new Date();
  } else if (req.status === "DIBATALKAN") {
    updateData.cancellation_reason = req.reason || null;
    updateData.cancelled_by = "SELLER"; // <--- FIX 2: Catat siapa yang batalin
  }

  // 4. UPDATE DENGAN OPTIMISTIC CONCURRENCY CONTROL (OCC)
  try {
    const updatedQueue = await prisma.queue.update({
      where: {
        id: queue.id,
        status: queue.status, // <--- FIX 4: Pastikan status belum berubah sejak `findFirst` buat cegah race condition
      },
      data: updateData,
      select: {
        id: true,
        queue_number: true,
        status: true,
        processed_at: true, // 👇 TAMBAHAN DI SINI BIAR DATANYA KEKIRIM KE FRONTEND
        completed_at: true,
        cancellation_reason: true,
        cancelled_by: true,
        store_id: true,
        queueDetails: {
          select: {
            id: true,
            quantity: true,
            product: {
              select: { id: true, name: true, price: true, image_url: true }, // <--- FIX 3: Hindari overfetching
            },
          },
        },
      },
    });

    return updatedQueue;
  } catch (error) {
    // Jika `update` gagal karena `status` sudah beda (where clause ga match),
    // artinya antrean udah diubah hitungan milidetik sebelumnya oleh kasir lain / sistem.
    if (error.code === "P2025") {
      throw new ResponseError(409, "The queue status has changed");
    }
    throw error;
  }
};
export default {
  getAllQueue,
  editQueueStatus,
};
