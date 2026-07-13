import { redisClient } from "../application/redis.js";
import crypto from "crypto";

export async function socketAuth(socket, next) {
  const cookie = socket.handshake.headers.cookie;
  const token = cookie

    ?.split(";")
    .find((c) => c.trim().startsWith("token="))
    ?.split("=")[1];
  // Buyer
  if (!token) {
    socket.user = {
      role: "buyer",
      username: "Guest",
    };

    return next();
  }
  const hashToken = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const cachedUser = await redisClient.get(hashToken);
    if (!cachedUser) {
      return next(new Error("Token tidak valid"));
    }
    socket.user = JSON.parse(cachedUser);
    socket.user.role = "seller";

    next();
  } catch (err) {
    next(err);
  }
}
