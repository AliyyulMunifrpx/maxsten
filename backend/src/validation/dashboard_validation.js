import Joi from "joi";
const getDashboardValidation = Joi.string().required().uuid();
export { getDashboardValidation };
