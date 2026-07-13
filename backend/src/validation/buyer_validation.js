import Joi from "joi";

const createQueueValidation = Joi.object({
  public_id: Joi.string().required(),
  guest_id: Joi.string().required(),
  note: Joi.string().max(255).optional().allow(null, ""),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        variant_id: Joi.string().optional().allow(null, ""),
        selected_addons: Joi.array().items(Joi.string().uuid()).optional(),
      }),
    )
    .min(1)
    .required(),
});
const getAllProductDisplayValidation = Joi.string().uuid().required();

const getQueueValidation = Joi.object({
  queueId: Joi.number().positive().required(),
  public_id: Joi.string().uuid().required(),
});
 const cancelQueueValidation = Joi.object({
  public_id: Joi.string().required(),
  queueId: Joi.number().required(), // Pakai .string() kalau UUID, atau .number() kalau Int
  guest_id: Joi.string().required(),
});
export {
  createQueueValidation,
  cancelQueueValidation,
  getAllProductDisplayValidation,
  getQueueValidation,
};
