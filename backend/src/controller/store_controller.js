import storeService from "../service/store_service.js";

const create = async (req, res, next) => {
  try {
    const result = await storeService.create(
      {
        userId: req.user.id,
        name: req.body.name,
        description: req.body.description,
        address: req.body.address,
        timezone: req.body.timezone,
      },
      req.file,
    );
    console.log(req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
const createProduct = async (req, res, next) => {
  try {
    const result = await storeService.createProduct(
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
const openCloseStore = async (req, res, next) => {
  try {
    const result = await storeService.openCloseStore({
      store_id: req.params.storeId,
      userId: req.user.id,
    });
    console.log(req.params.storeId, req.user.id);
    res.json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
const updateLogo = async (req, res, next) => {
  try {
    // req.user dapet dari authMiddleware, req.file dapet dari Multer
    const result = await storeService.updateLogo(req.user.id, req.file);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
const updateStoreProfile = async (req, res, next) => {
  try {
    const result = await storeService.updateStoreProfile(req.user.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const updateProductInfo = async (req, res, next) => {
  try {
    const result = await storeService.updateProductInfo(
      req.user.id,
      req.params.productId,
      req.body,
    );
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const updateProductImage = async (req, res, next) => {
  try {
    const result = await storeService.updateProductImage(
      req.user.id,
      req.params.productId,
      req.file,
    );
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const getAddonGroups = async (req, res, next) => {
  try {
    const result = await storeService.getAddonGroups(req.user.id);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const createAddonGroup = async (req, res, next) => {
  try {
    const result = await storeService.createAddonGroup({
      userId: req.user.id,
      ...req.body,
    });
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const getHistory = async (req, res, next) => {
  try {
    const month = req.query.month ? parseInt(req.query.month) : undefined;
    const year = req.query.year ? parseInt(req.query.year) : undefined;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const topPage = parseInt(req.query.topPage) || 1;
    const topLimit = parseInt(req.query.topLimit) || 10;

    // Status dari query URL (opsional, default ditangani di service)
    const status = req.query.status;

    const result = await storeService.getStoreHistory(
      req.user.id,
      month,
      year,
      page,
      limit,
      topPage,
      topLimit,
      status,
    );

    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const getOperationalHours = async (req, res, next) => {
  try {
    const result = await storeService.getOperationalHours(req.user.id);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const updateOperationalHours = async (req, res, next) => {
  try {
    // req.body isinya berupa json: { "operational_hours": [ { day: 0, open_time: "08:00", ... }, ... ] }
    const result = await storeService.updateOperationalHours(
      req.user.id,
      req.body,
    );
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
export default {
  create,
  createProduct,
  openCloseStore,
  updateLogo,
  updateStoreProfile,
  updateProductImage,
  getAddonGroups,
  createAddonGroup,
  updateProductInfo,
  getHistory,
  getOperationalHours,
  updateOperationalHours,
};
