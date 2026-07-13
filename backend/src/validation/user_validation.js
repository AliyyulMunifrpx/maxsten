import Joi from "joi";

const registerUserValidation = Joi.object({
  username: Joi.string().max(100).required(),
  password: Joi.string().max(100).required(),
  name: Joi.string().max(100).required(),
});
const loginUserValidation = Joi.object({
  username: Joi.string().max(100).required(),
  password: Joi.string().max(100).required(),
});
const getUserValidation = Joi.number().integer().positive().required();
const updateUserValidation = Joi.object({
  username: Joi.string().max(100).required(),

  password: Joi.string().max(100).optional(),
  name: Joi.string().max(100).optional(),
});
const forgotPasswordValidation = Joi.object({
  username: Joi.string().max(100).required(),
});
const verifyOtpvalidation = Joi.object({
  username: Joi.string().max(100).required(),
  otp: Joi.string().length(6).required(),
});
export {
  registerUserValidation,
  loginUserValidation,
  getUserValidation,
  updateUserValidation,
  forgotPasswordValidation,
  verifyOtpvalidation,
};
