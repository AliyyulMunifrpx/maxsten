import Joi from "joi";

const createCancelReasonValidation = Joi.object({
  reason: Joi.string().max(255).required(),
});
const updateCancelReasonValidation = Joi.object({
  reason: Joi.string().max(255).required(),
  id: Joi.string().uuid(),
});
const deleteReasonTemplateValidation = Joi.string().uuid().required();
export {
  createCancelReasonValidation,
  updateCancelReasonValidation,
  deleteReasonTemplateValidation,
};
