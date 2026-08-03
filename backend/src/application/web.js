import express from "express";
import { publicRouter } from "../route/public_api.js";
import { errorMiddleware } from "../middleware/error_middleware.js";
import { userRouter } from "../route/api.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { setupSwagger } from "../docs/swagger_setup.js";

export const web = express();
web.use(
  cors({
    origin: process.env.FRONTEND_URL, // Alamat frontend Vite lu
    credentials: true, // INI WAJIB TRUE biar cookie token lu bisa lewat
  }),
);
setupSwagger(web);
web.use(express.json());
web.use(cookieParser()); // 2. Pasang di sini, SEBELUM router lu
web.use(publicRouter);
web.use(userRouter);
web.use(errorMiddleware);
// Buka akses folder statis biar foto bisa diload dari URL (contoh: http://localhost:3000/uploads/foto123.jpg)
web.use("/uploads", express.static("public/uploads"));
