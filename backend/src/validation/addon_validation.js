import Joi from "joi";
const getAddonGroupValidation = Joi.object({
  user_id: Joi.string().uuid().required(),
  addon_group_id: Joi.string().uuid().required(),
});

const createAddonGroupValidation = Joi.object({
  userId: Joi.string().uuid().required(),
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
const editAddonGroupsValidation = Joi.object({
  user_id: Joi.string().uuid().required(),
  id: Joi.string().uuid().required(),
  name: Joi.string().max(100).required(),
  addons: Joi.array()
    .items(
      Joi.object({
        id: Joi.optional(),
        name: Joi.string().max(100).required(),
        price: Joi.number().min(0).required(),
      }),
    )
    .min(1)
    .required(),
});

const getAddonGroupsValidation = Joi.string().uuid().required();
const deleteAddonGroupValidation = Joi.object({
  user_id: Joi.string().uuid().required(),
  id: Joi.string().uuid().required(),
});
export {
  deleteAddonGroupValidation,
  getAddonGroupValidation,
  editAddonGroupsValidation,
  createAddonGroupValidation,
  getAddonGroupsValidation,
};
