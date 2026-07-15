import Joi from "joi";

const createCancelReasonValidation = Joi.object({
  reason: Joi.string().max(255).required(),
});
export { createCancelReasonValidation };
