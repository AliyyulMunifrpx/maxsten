import Joi from "joi";

const createCancelReasonValidation = Joi.object({
  user_id: Joi.string().uuid().required(),
  reason: Joi.string().max(255).required(),
});
const updateCancelReasonValidation = Joi.object({
  user_id: Joi.string().uuid().required(),

  reason: Joi.string().max(255).required(),
  id: Joi.string().uuid().required(),
});
const deleteReasonTemplateValidation = Joi.object({
  user_id: Joi.string().uuid().required(),
  id: Joi.string().uuid().required(),
});
const getReasonTemplateValidation = Joi.string().uuid().required();
export {
  createCancelReasonValidation,
  updateCancelReasonValidation,
  deleteReasonTemplateValidation,
  getReasonTemplateValidation,
};
