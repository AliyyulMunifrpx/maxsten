import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import {
  createCancelReasonValidation,
  deleteReasonTemplateValidation,
  updateCancelReasonValidation,
} from "../validation/reason_validation.js";
import { validate } from "../validation/validation.js";

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
const updateCancelReason = async (userId, request) => {
  // 1. Validasi input
  const req = validate(updateCancelReasonValidation, request);

  // 2. Cari toko milik user yang lagi login
  const reason = await prisma.cancelReasonTemplate.updateMany({
    where: {
      id: req.id,
      store: {
        user_id: userId,
        is_delete: false,
      },
    },
    data: {
      reason: req.reason,
    },
  });
  if (reason.count === 0) {
    throw new ResponseError(404, "Alasan tidak ditemukan.");
  }
  return reason;
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
const deleteReasonTemplate = async (userId, request) => {
  const req = validate(deleteReasonTemplateValidation, request);
  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      id: true,
    },
  });
  if (!store) {
    throw new ResponseError(404, "toko tidak ditemukan");
  }
  const template = await prisma.cancelReasonTemplate.findFirst({
    where: {
      store_id: store.id,
      id: req,
      is_delete: false,
      store: {
        user_id: userId,
      },
    },
    select: {
      id: true,
    },
  });
  if (!template) {
    throw new ResponseError(404, "template alasan pembatalan tidak ditemukan");
  }

  await prisma.cancelReasonTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      is_delete: true,
    },
  });
};
export default {
  createCancelReason,
  getCancelReasons,
  updateCancelReason,
  deleteReasonTemplate,
};
