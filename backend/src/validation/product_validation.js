import Joi from "joi";
const getProductValidation = Joi.string().uuid().required();
const getAllProductValidation = Joi.string().required();
const deleteProduct = Joi.string().required();
export { getProductValidation, getAllProductValidation };
