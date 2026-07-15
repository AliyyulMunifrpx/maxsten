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

const createProduct = async (req, res, next) => {
  try {
    const result = await productService.createProduct(
      {
        userId: req.user.id,
        ...req.body,
      },
      req.file,
    ); // Teruskan req.file ke service

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const updateProductInfo = async (req, res, next) => {
  try {
    const result = await productService.updateProductInfo(
      req.user.id,
      req.params.productId,
      req.body,
    );
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const updateProductAvailability = async (req, res, next) => {
  try {
    const result = await productService.updateProductAvailability(req.user.id, {
      productId: req.params.productId,
      is_available: req.body.is_available,
    });

    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const updateProductImage = async (req, res, next) => {
  try {
    const result = await productService.updateProductImage(
      req.user.id,
      req.params.productId,
      req.file,
    );
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

export default {
  updateProductImage,
  updateProductInfo,
  getProduct,
  getAllProducts,
  updateProductAvailability,
  createProduct,
};
