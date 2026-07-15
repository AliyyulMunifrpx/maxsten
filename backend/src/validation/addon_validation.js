import Joi from "joi";
const getAddonGroupValidation = Joi.string().uuid().required();
const editAddonGroupsValidation = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().max(100).required(),
  addons: Joi.array().items(
    Joi.object({
      id: Joi.optional(),
      name: Joi.string().max(100).required(),
      price: Joi.number().min(0),
    }),
  ),
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

export {
  getAddonGroupValidation,
  editAddonGroupsValidation,
  createAddonGroupValidation,
  getAddonGroupsValidation,
};
