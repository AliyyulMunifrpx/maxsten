import productService from "../service/product_service.js";

const getProduct = async (req, res, next) => {
  try {
    const result = await productService.getProduct(
      req.user.id,
      req.params.productId,
    );
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(
      req.user.id,
      req.params.publicId,
    );
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
export default {
  getProduct,
  getAllProducts,
};
