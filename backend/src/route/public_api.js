import express from "express";
import userController from "../controller/user_controller.js";
import buyerController from "../controller/buyer_controller.js";
import rateLimit from "express-rate-limit";
const publicRouter = express.Router();
const queueLimiter = rateLimit({
  windowMs: 1000, // Waktu: 1 detik(development)
  max: 1, // Maksimal hit API: 1 kali per IP dalam 5 menit
  message: {
    errors: "ERR_TOO_MANY_REQUESTS",
  },
});
publicRouter.post(`/api/users`, userController.register);
publicRouter.post(`/api/users/login`, userController.login);
publicRouter.post("/api/users/email", userController.syncEmailWebhook);
publicRouter.post(
  "/api/stores/queues",
  queueLimiter,
  buyerController.createQueue,
);
publicRouter.get(
  "/api/:storeId/products",
  buyerController.getAllProductDisplay,
);
publicRouter.get("/api/:publicId/queues/:queueId", buyerController.getQueue);
publicRouter.patch(
  "/api/:publicId/queues/:queueId/cancel",
  buyerController.cancelQueue,
);
export { publicRouter };
