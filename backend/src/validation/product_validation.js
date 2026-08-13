import Joi from "joi";
import { describe } from "node:test";
const getProductValidation = Joi.string().uuid().required();
const getAllProductValidation = Joi.object({
  publicId: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).default(1),
});
const createProductValidation = Joi.object({
  userId: Joi.string().uuid().required(),
  name: Joi.string().max(100).required(),
  price: Joi.number().required().positive(),
  description: Joi.string().optional(),
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

const updateProductValidation = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().allow('').optional(),
  price: Joi.number().optional().positive(),
  variants: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().optional(), // Tambahan: Boleh bawa ID lama
        name: Joi.string().max(100).optional(),
        additional_price: Joi.number().min(0).default(0),
      }),
    )
    .optional(),
  addon_group_ids: Joi.array().items(Joi.string().uuid()).optional(),
});
const updateAvailabilityValidation = Joi.object({
  productId: Joi.string().required(),
  is_available: Joi.boolean().required(),
});
const deleteProductValidation = Joi.string().uuid().required();
export {
  getProductValidation,
  updateAvailabilityValidation,
  getAllProductValidation,
  createProductValidation,
  updateProductValidation,
  deleteProductValidation,
};
