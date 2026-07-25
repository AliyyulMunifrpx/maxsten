import { redisClient } from "../application/redis.js";
import crypto from "crypto";
import { supabase } from "../application/supabase.js";
import { prisma } from "../application/database.js";

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

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!user) {
      return next(new Error("Invalid token"));
    }
    const prismaUser = await prisma.user.findUnique({
      where: {
        email: user.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    socket.user = {
      ...prismaUser,
      role: "seller",
    };

    next();
  } catch (err) {
    next(err);
  }
}
