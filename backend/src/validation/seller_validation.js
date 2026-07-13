import Joi from "joi";

const getAllQueueValidation = Joi.object({
  store_id: Joi.string().required(), // Ubah jadi string
  userId: Joi.number().required(), // PENTING: Tambahkan ini! (lihat poin 3)
});
const editQueueStatusValidation = Joi.object({
  id: Joi.number().required(),
  storeId: Joi.string().uuid(),
  status: Joi.string().required(),
});
const getStoreValidation = Joi.number().integer().positive().required();
const updateAvailabilityValidation = Joi.object({
  productId: Joi.string().required(),
  is_available: Joi.boolean().required(),
});

export {
  getAllQueueValidation,
  editQueueStatusValidation,
  getStoreValidation,
  updateAvailabilityValidation,

};
