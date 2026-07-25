import Joi from "joi";

const createStoreValidation = Joi.object({
  userId: Joi.string().uuid().required(),
  name: Joi.string().max(100).required(),
  description: Joi.string().optional(),
  timezone: Joi.string()
    .required()
    .custom((value, helpers) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return value;
      } catch {
        return helpers.error("any.invalid");
      }
    })
    .messages({
      "any.invalid": "Invalid timezone",
    }),
  street_address: Joi.string().optional(),
  village: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  city: Joi.string().max(100).optional(),
  province: Joi.string().max(100).optional(),
  postal_code: Joi.string().max(100).optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  operational_hours: Joi.array().items(
    Joi.object({
      day: Joi.number().min(0).max(6),
      open_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .allow(null, "")
        .optional(), // Format HH:mm
      close_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .allow(null, "")
        .optional(),
      is_active: Joi.boolean(),
    }),
  ),
});
const openCloseStoreValidation = Joi.object({
  store_id: Joi.string().max(100).required(),
  userId: Joi.string().uuid().required(),
  manual_status: Joi.string().valid("OPEN", "CLOSED").required().messages({
    "any.only": "The status can only be 'OPEN' or 'CLOSED'",
    "string.empty": "The status field cannot be left blank",
    "any.required": "Status must be filled in",
  }),
});
const updateStoreValidation = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().optional().allow(null, ""),
  street_address: Joi.string().optional(),
  village: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  city: Joi.string().max(100).optional(),
  province: Joi.string().max(100).optional(),
  postal_code: Joi.string().max(100).optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  timezone: Joi.string()
    .optional()
    .custom((value, helpers) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return value;
      } catch {
        return helpers.error("any.invalid");
      }
    })
    .messages({
      "any.invalid": "Invalid timezone",
    }),
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
const getStoreValidation = Joi.string().uuid().required();

export {
  createStoreValidation,
  openCloseStoreValidation,
  updateStoreValidation,
  updateOperationalHoursValidation,
  getStoreValidation,
};
