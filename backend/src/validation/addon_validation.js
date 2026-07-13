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
export { getAddonGroupValidation, editAddonGroupsValidation };
