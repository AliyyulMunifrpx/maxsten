import express from "express";
import userController from "../controller/user_controller.js";
import storeController from "../controller/store_controller.js";
import sellerController from "../controller/seller_controller.js";
import productController from "../controller/product_controller.js";
import { authMiddleware } from "../middleware/auth_middleware.js";
import { uploadLogo } from "../middleware/upload_middleware.js";
import addonController from "../controller/addon_controller.js";
import dashboardController from "../controller/dashboard_controller.js";

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
userRouter.post(
  "/api/seller/create-cancel-reasons",
  sellerController.createCancelReason,
);
userRouter.patch("/api/stores/me", storeController.updateStoreProfile);
userRouter.get("/api/seller/cancel-reasons", sellerController.getCancelReasons);
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
  storeController.createProduct,
);
userRouter.patch(
  "/api/stores/products/:productId",
  storeController.updateProductInfo,
);
userRouter.patch(
  "/api/stores/products/:productId/image",
  uploadLogo.single("image"),
  storeController.updateProductImage,
);
userRouter.patch(
  "/api/products/:productId/availability",
  sellerController.updateAvailability,
);
userRouter.get("/api/all-products/:publicId", productController.getAllProducts);
// ==========================================
// 🧩 ADDONS API
// ==========================================
userRouter.get("/api/stores/get-addon-groups", storeController.getAddonGroups);
userRouter.post("/api/stores/addon-groups", storeController.createAddonGroup);
userRouter.get("/api/addon-group/:addonGroupId", addonController.getAddonGroup);
userRouter.patch(
  "/api/addon-group/edit/:addonGroupId",
  addonController.editAddonGroup,
);

// ==========================================
// 📋 QUEUE / SELLER API
// ==========================================
userRouter.get("/api/stores/all-queues/:storeId", sellerController.getAllQueue);
userRouter.patch(
  "/api/stores/queues/:queueId",
  sellerController.editQueueStatus,
);

// ==========================================
// 📋 DASHBOARD / SELLER API
// ==========================================
userRouter.get("/api/dashboard", dashboardController.getDashboard);
export { userRouter };
