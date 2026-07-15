import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { createCancelReasonValidation } from "../validation/reason_validation.js";

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
export default { createCancelReason, getCancelReasons };
