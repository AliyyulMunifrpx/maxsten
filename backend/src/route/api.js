import express from "express";
import userController from "../controller/user_controller.js";
import storeController from "../controller/store_controller.js";
import sellerController from "../controller/seller_controller.js";
import productController from "../controller/product_controller.js";
import { authMiddleware } from "../middleware/auth_middleware.js";
import { uploadLogo } from "../middleware/upload_middleware.js";
import addonController from "../controller/addon_controller.js";
import dashboardController from "../controller/dashboard_controller.js";
import reasonController from "../controller/reason_controller.js";

const userRouter = express.Router();

// Semua route di bawah ini wajib melewati Auth Middleware
userRouter.use(authMiddleware);

// ==========================================
// 👤 USER API
// ==========================================
userRouter.get("/api/users/me", userController.get);
userRouter.patch("/api/users/me", userController.update);
userRouter.delete("/api/users/logout", userController.logout);

// ==========================================
// 🏪 STORE API
// ==========================================
// Profile & Status
userRouter.get("/api/stores/me", sellerController.getStore);
userRouter.post(
  "/api/stores",
  uploadLogo.single("logo"),
  storeController.create,
);

userRouter.patch("/api/stores/me", storeController.updateStoreProfile);

userRouter.patch(
  "/api/stores/logo",
  uploadLogo.single("logo"),
  storeController.updateLogo,
);
userRouter.patch("/api/:storeId/status", storeController.openCloseStore); // Catatan: pertimbangkan ubah ke /api/stores/:storeId/status agar seragam
userRouter.get("/api/stores/history", storeController.getHistory);

// Operational Hours
userRouter.get(
  "/api/stores/operational-hours",
  storeController.getOperationalHours,
);
userRouter.put(
  "/api/stores/operational-hours",
  storeController.updateOperationalHours,
);

// ==========================================
// 📦 PRODUCT API
// ==========================================
userRouter.get("/api/product/:productId", productController.getProduct);
userRouter.post(
  "/api/stores/products",
  uploadLogo.single("image"),
  productController.createProduct,
);
userRouter.patch(
  "/api/stores/products/:productId",
  productController.updateProductInfo,
);
userRouter.patch(
  "/api/stores/products/:productId/image",
  uploadLogo.single("image"),
  productController.updateProductImage,
);
userRouter.patch(
  "/api/products/:productId/availability",
  productController.updateProductAvailability,
);
userRouter.get("/api/all-products/:publicId", productController.getAllProducts);
// ==========================================
// 🧩 ADDONS API
// ==========================================
userRouter.get("/api/stores/get-addon-groups", addonController.getAddonGroups);
userRouter.post("/api/stores/addon-groups", addonController.createAddonGroup);
userRouter.get("/api/addon-group/:addonGroupId", addonController.getAddonGroup);
userRouter.patch(
  "/api/addon-group/edit/:addonGroupId",
  addonController.editAddonGroup,
);

// ==========================================
// 📋 QUEUE
// ==========================================
userRouter.get("/api/stores/all-queues/:storeId", sellerController.getAllQueue);
userRouter.patch(
  "/api/stores/queues/:queueId",
  sellerController.editQueueStatus,
);

// ==========================================
// 📋 DASHBOARD
// ==========================================
userRouter.get("/api/dashboard", dashboardController.getDashboard);
// ==========================================
// 📋 REASON
// ==========================================
userRouter.post(
  "/api/seller/create-cancel-reasons",
  reasonController.createCancelReason,
);
userRouter.get("/api/seller/cancel-reasons", reasonController.getCancelReasons);
export { userRouter };
