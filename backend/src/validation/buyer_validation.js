import Joi from "joi";

const createQueueValidation = Joi.object({
  public_id: Joi.string().uuid().required(),
  guest_id: Joi.string().uuid().required(),
  note: Joi.string().max(255).optional().allow(null, ""),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.string().required().uuid(),
        quantity: Joi.number().min(1).max(100).required(),
        variant_id: Joi.string().optional().allow(null, "").uuid(),
        selected_addons: Joi.array().items(Joi.string().uuid()).optional(),
      }),
    )
    .min(1)
    .required(),
});
const getAllProductDisplayValidation = Joi.object({
  public_id: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).default(1),
  keyword: Joi.string().allow("").optional(),
});

const getQueueValidation = Joi.object({
  queueId: Joi.number().positive().required(),
  public_id: Joi.string().uuid().required(),
  guest_id: Joi.string().uuid().required(),
});
const cancelQueueValidation = Joi.object({
  public_id: Joi.string().uuid().required(),
  queueId: Joi.number().required(),
  guest_id: Joi.string().uuid().required(), 
  reason: Joi.string().optional().max(100),
});
const getProductDetailsValidation = Joi.object({
  public_id: Joi.string().uuid().required(),
  product_id: Joi.string().uuid().required(),
});
export {
  createQueueValidation,
  cancelQueueValidation,
  getAllProductDisplayValidation,
  getQueueValidation,
  getProductDetailsValidation
};
