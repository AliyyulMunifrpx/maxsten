import { supabase } from "../application/supabase.js";
import { prisma } from "../application/database.js";

export async function socketAuth(socket, next) {
  const cookieHeader = socket.handshake.headers.cookie;

  const token = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith("access_token="))
    ?.split("=")[1];

  const guestId = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith("guest_id="))
    ?.split("=")[1];

  if (!token) {
    
    if (!guestId) {
      return next(new Error("Unauthorized: Missing guest identity"));
    }

    socket.user = {
      id: guestId, 
      role: "buyer",
      name: "Guest",
    };

    return next();
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new Error("Invalid token"));
    }

    const prismaUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!prismaUser) {
      return next(new Error("User not found in database"));
    }

    socket.user = {
      ...prismaUser,
      role: "seller", 
    };

    next();
  } catch (err) {
    next(err);
  }
}
