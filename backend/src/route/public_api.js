import express from "express";
import userController from "../controller/user_controller.js";
import buyerController from "../controller/buyer_controller.js";
import rateLimit from "express-rate-limit";

const publicRouter = express.Router();
const queueLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit (600.000 ms)
  max: 2, // Maksimal 2 request per IP dalam 10 menit
  message: {
    errors: "Too many requests. Please try again in 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// ==========================================
// 👤 USER & AUTH API
// ==========================================
publicRouter.post("/api/users", userController.register);
publicRouter.post("/api/users/login", userController.login);
publicRouter.post("/api/webhooks/email", userController.syncEmailWebhook); // Diubah agar lebih semantik untuk webhook

// ==========================================
// 🏪 BUYER / STORE INTERACTION API (Tanpa Login)
// ==========================================
// Katalog Produk
publicRouter.get(
  "/api/stores/:storeId/products",
  buyerController.getAllProductDisplay,
);
publicRouter.get(
  "/api/stores/:storeId/products/:productId",
  buyerController.getProductDetails,
); // Hilangkan /details

// ==========================================
// 📋 QUEUE (ANTREAN PEMBELI) API
// ==========================================
// Buat Antrean
publicRouter.post(
  "/api/stores/:storeId/queues",
  queueLimiter,
  buyerController.createQueue,
);

// Cek Status Antrean
publicRouter.get(
  "/api/stores/:storeId/queues/:queueId",
  buyerController.getQueue,
); // Gunakan queues (jamak)

// Batalkan Antrean
publicRouter.patch(
  "/api/stores/:storeId/queues/:queueId/cancel",
  buyerController.cancelQueue,
);

export { publicRouter };
