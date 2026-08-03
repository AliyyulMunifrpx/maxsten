import { prisma } from "../application/database.js";
import { logger } from "../application/logging.js";

export function registerSellerEvents(socket) {
  socket.on("JOIN_STORE_ROOM", async () => {
    try {
      const store = await prisma.store.findFirst({
        where: {
          user_id: socket.user.id,
          is_delete: false,
        },
      });

      if (!store) {
        logger.warn(
          `Unauthorized room access attempt: Store room by user ${socket.user.email}`,
        );

        // Meniru error 404/401 dari middleware lu
        socket.emit("ROOM_ERROR", {
          errors: "Store not found or unauthorized access.",
        });
        return;
      }

      const room = `TOKO_${store.id}`;
      socket.join(room);
      logger.info(
        `Seller ${socket.user.email} successfully joined room: ${room}`,
      );
    } catch (error) {
      // Meniru error 500 dari middleware lu
      logger.error(
        `[Socket Error] Failed to join store room: ${error.message}`,
      );

      const isProduction = process.env.NODE_ENV === "production";
      socket.emit("ROOM_ERROR", {
        errors: isProduction ? "Internal server error." : error.message,
      });
    }
  });
}
