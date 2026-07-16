import Joi from "joi";

const createStoreValidation = Joi.object({
  userId: Joi.number().required(),
  name: Joi.string().max(100).required(),
  description: Joi.string().optional(),
  address: Joi.string().max(100).required(),
  timezone: Joi.string().required(),
});
const openCloseStoreValidation = Joi.object({
  store_id: Joi.string().max(100).required(),
  userId: Joi.number().required(),
});
const updateStoreValidation = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().optional().allow(null, ""),
  address: Joi.string().optional().allow(null, ""),
  timezone: Joi.string().required(),
  payment_timeout: Joi.number().integer().positive().optional().allow(null, ""),
});

const updateOperationalHoursValidation = Joi.object({
  operational_hours: Joi.array()
    .items(
      Joi.object({
        day: Joi.number().integer().min(0).max(6).required(),
        open_time: Joi.string()
          .pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/)
          .allow(null, "")
          .optional(), // Format HH:mm
        close_time: Joi.string()
          .pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/)
          .allow(null, "")
          .optional(),
        is_active: Joi.boolean().default(false),
      }),
    )
    .min(1)
    .required(), // Minimal kirim 1 hari, maksimal 7
});
const getStoreValidation = Joi.number().integer().positive().required();

export {
  createStoreValidation,
  openCloseStoreValidation,
  updateStoreValidation,
  updateOperationalHoursValidation,
  getStoreValidation,
};
