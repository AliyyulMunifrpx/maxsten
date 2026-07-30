import Joi from "joi";

const registerUserValidation = Joi.object({
  email: Joi.string().max(100).required().email(),
  password: Joi.string().min(8).max(100).required(),
  name: Joi.string().max(100).required(),
});

const loginUserValidation = Joi.object({
  email: Joi.string().max(100).required().email(),
  password: Joi.string().max(100).required(),
});
const updateUserProfileValidation = Joi.object({
  name: Joi.string().max(100).required(),
});

export {
  registerUserValidation,
  loginUserValidation,
  updateUserProfileValidation,
};
