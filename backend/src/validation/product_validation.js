import Joi from "joi";
const getProductValidation = Joi.string().uuid().required();
const getAllProductValidation = Joi.string().required();
const deleteProduct = Joi.string().required();

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
export {
  getProductValidation,
  getAllProductValidation,
  createProductValidation,
  updateProductValidation
};
