import express from "express";
import userController from "../controller/user_controller.js";
import buyerController from "../controller/buyer_controller.js";
import rateLimit from "express-rate-limit";

const publicRouter = express.Router();

const queueLimiter = rateLimit({
  windowMs: 0, // Waktu: 1 detik (development)
  max: 1, // Maksimal hit API: 1 kali per IP dalam 1 detik
  message: {
    errors: "taking too many actions",
  },
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
