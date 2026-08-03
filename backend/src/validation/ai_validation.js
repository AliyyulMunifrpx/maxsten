import Joi from "joi";

const descriptionGeneratorValidation = Joi.object({
  user_id: Joi.string().uuid().required(),
  product_name: Joi.string().min(1).max(100).required(),
});
export { descriptionGeneratorValidation };