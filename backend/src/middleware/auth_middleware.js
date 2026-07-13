import { prisma } from "../application/database.js";
import crypto from "crypto";
import { redisClient } from "../application/redis.js";
// Di file auth_middleware.js
export const authMiddleware = async (req, res, next) => {
  const rawToken = req.cookies.token;

  if (!rawToken) return res.status(401).json({ errors: "Unauthorized" }).end();
  const hashToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  // 1. Langsung cari Key (token) di Redis
  const cachedUser = await redisClient.get(hashToken);

  // 2. Kalau Key tidak ditemukan, berarti token salah atau sudah kadaluarsa
  if (!cachedUser) {
    return res.status(401).json({ errors: "Unauthorized" }).end();
  }

  // 3. Jika ketemu, ubah kembali string JSON dari Redis menjadi Object JavaScript
  req.user = JSON.parse(cachedUser);

  next();
};
