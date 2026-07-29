import Joi from "joi";

const getAllQueueValidation = Joi.object({
  store_id: Joi.string().required().uuid(),
  userId: Joi.string().uuid().required(),
  page: Joi.number().min(1).default(1),
});
const editQueueStatusValidation = Joi.object({
  id: Joi.number().required(),
  storeId: Joi.string().uuid().required(),
  status: Joi.string().valid("DIPROSES", "SELESAI", "DIBATALKAN").required(),
  reason: Joi.string().optional().max(100),
  userId: Joi.string().uuid().required(),
});

export { getAllQueueValidation, editQueueStatusValidation };
