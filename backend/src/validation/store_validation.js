import Joi from "joi";

const createStoreValidation = Joi.object({
  userId: Joi.number().required(),
  name: Joi.string().max(100).required(),
  description: Joi.string().optional(),
  address: Joi.string().max(100).required(),
  timezone: Joi.string().required(),
});
const createProductValidation = Joi.object({
  userId: Joi.number().required().integer().positive(),
  name: Joi.string().max(100).required(),
  price: Joi.number().required().positive(),
  variants: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().max(100).required(),
        additional_price: Joi.number().min(0).default(0), // Default gratis (0) kalau nggak diisi
      }),
    )
    .optional(),
  addon_group_ids: Joi.array().items(Joi.string().uuid()).optional(),
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
const createAddonGroupValidation = Joi.object({
  userId: Joi.number().required().integer().positive(),
  name: Joi.string().max(100).required(),
  addons: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().max(100).required(),
        price: Joi.number().min(0).required(),
      }),
    )
    .min(1)
    .required(),
});

const getAddonGroupsValidation = Joi.number().required().integer().positive();

const updateProductValidation = Joi.object({
  name: Joi.string().max(100).required(),
  price: Joi.number().required().positive(),
  variants: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().optional(), // Tambahan: Boleh bawa ID lama
        name: Joi.string().max(100).required(),
        additional_price: Joi.number().min(0).default(0),
      }),
    )
    .optional(),
  addon_group_ids: Joi.array().items(Joi.string().uuid()).optional(),
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
export {
  createStoreValidation,
  createProductValidation,
  createAddonGroupValidation,
  getAddonGroupsValidation,
  openCloseStoreValidation,
  updateStoreValidation,
  updateProductValidation,
  updateOperationalHoursValidation,
};
