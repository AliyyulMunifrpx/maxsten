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
import aiController from "../controller/ai_controller.js";

const userRouter = express.Router();

// Semua route di bawah ini wajib melewati Auth Middleware
userRouter.use(authMiddleware);

// ==========================================
// 👤 USER API
// ==========================================
userRouter.get("/api/users/me", userController.getUser);
userRouter.patch("/api/users/me", userController.updateUser); // Hapus /update
userRouter.delete("/api/users/logout", userController.logout); // Hapus authMiddleware redudan
userRouter.delete("/api/users/me", userController.deleteUser); // Hapus /delete & authMiddleware

// ==========================================
// 🏪 STORE API
// ==========================================
// Profile & Status
userRouter.get("/api/stores/me", storeController.getStore);
userRouter.post(
  "/api/stores",
  uploadLogo.single("logo"),
  storeController.create,
);
userRouter.patch("/api/stores/me", storeController.updateStoreProfile);
userRouter.delete("/api/stores/me", storeController.deleteStore); // Ubah PATCH /delete-store jadi DELETE

userRouter.patch(
  "/api/stores/me/logo",
  uploadLogo.single("logo"),
  storeController.updateLogo,
);
userRouter.patch("/api/stores/:storeId/status", storeController.openCloseStore);
userRouter.get("/api/stores/me/history", storeController.getHistory); // Tambahkan /me/

// Operational Hours
userRouter.patch(
  "/api/stores/me/operational-hours",
  storeController.updateOperationalHours,
);
userRouter.get("/api/stores/postal-codes", storeController.postalCode); // Masukkan ke dalam stores

// ==========================================
// 📦 PRODUCT API
// ==========================================
userRouter.post(
  "/api/stores/products",
  uploadLogo.single("image"),
  productController.createProduct,
);
userRouter.get("/api/stores/products/:productId", productController.getProduct); // product jadi products
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
  "/api/stores/products/:productId/availability",
  productController.updateProductAvailability,
);
userRouter.delete(
  "/api/stores/products/:productId",
  productController.deleteProduct,
); // Gunakan DELETE, hilangkan /delete/

// Akses publik/koleksi (bisa dipisah routernya kalau tidak butuh auth, tapi sementara tetap di sini)
userRouter.get(
  "/api/stores/me/:publicId/products",
  productController.getAllProducts,
); // Lebih bersih dari /all-products/

// ==========================================
// 🧩 ADDONS API
// ==========================================
userRouter.post("/api/stores/addon-groups", addonController.createAddonGroup);

userRouter.patch(
  "/api/stores/addon-groups/:addonGroupId",
  addonController.editAddonGroup,
);
userRouter.get("/api/stores/addon-groups", addonController.getAddonGroups);
userRouter.get(
  "/api/stores/addon-groups/:addonGroupId",
  addonController.getAddonGroup,
);
userRouter.delete(
  "/api/stores/addon-groups/:addonGroupId",
  addonController.deleteAddonGroup,
);

// ==========================================
// 📋 SELLER / QUEUES
// ==========================================
userRouter.get("/api/stores/:storeId/queues", sellerController.getAllQueue); // Rapikan urutan param
userRouter.patch(
  "/api/stores/queues/:queueId",
  sellerController.editQueueStatus,
);

// ==========================================
// 📋 DASHBOARD
// ==========================================
userRouter.get("/api/stores/dashboard", dashboardController.getDashboard); // (Sudah sempurna sesuai spesifikasi)

// ==========================================
// 📋 REASON
// ==========================================
userRouter.post(
  "/api/seller/cancel-reasons",
  reasonController.createCancelReason,
);
userRouter.get("/api/seller/cancel-reasons", reasonController.getCancelReasons);
userRouter.patch(
  "/api/seller/cancel-reasons/:reasonId",
  reasonController.updateCancelReason,
);
userRouter.delete(
  "/api/seller/cancel-reasons/:reasonId",
  reasonController.deleteReasonTemplate,
);

// ==========================================
// 🤖 AI
// ==========================================
userRouter.post("/api/ai/reports", aiController.reportGenerator); // Jadikan kata benda jamak
export { userRouter };
