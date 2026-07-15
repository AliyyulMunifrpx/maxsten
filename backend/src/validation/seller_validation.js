import Joi from "joi";

const getAllQueueValidation = Joi.object({
  store_id: Joi.string().required(), // Ubah jadi string
  userId: Joi.number().required(), // PENTING: Tambahkan ini! (lihat poin 3)
});
const editQueueStatusValidation = Joi.object({
  id: Joi.number().required(),
  storeId: Joi.string().uuid(),
  status: Joi.string().required(),
  reason: Joi.string().optional().max(100),
});
const getStoreValidation = Joi.number().integer().positive().required();
const updateAvailabilityValidation = Joi.object({
  productId: Joi.string().required(),
  is_available: Joi.boolean().required(),
});
const createCancelReasonValidation = Joi.object({
  reason: Joi.string().max(255).required().messages({
    "string.empty": "Alasan pembatalan tidak boleh kosong.",
    "string.max": "Alasan pembatalan maksimal 255 karakter.",
    "any.required": "Alasan pembatalan wajib diisi.",
  }),
});
export {
  getAllQueueValidation,
  createCancelReasonValidation,
  editQueueStatusValidation,
  getStoreValidation,
  updateAvailabilityValidation,
};
