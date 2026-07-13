import Joi from "joi";
const getDashboardValidation = Joi.number().required();

export { getDashboardValidation };
