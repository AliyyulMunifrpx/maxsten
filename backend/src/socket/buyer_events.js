import { prisma } from "../application/database.js";
import { logger } from "../application/logging.js"; // Gunakan logger biar seragam dengan server lu

export function registerBuyerEvents(socket) {
  // 1. Tangkap ID antrean
  socket.on("JOIN_QUEUE_ROOM", async (queueId) => {
    try {
      const queue = await prisma.queue.findFirst({
        where: {
          id: queueId,
          guest_id: socket.user.id,
        },
      });

      if (!queue) {
        logger.warn(
          `Unauthorized room access attempt: Queue ${queueId} by guest ${socket.user.id}`,
        );

        // Meniru error 404/401 dari middleware lu
        socket.emit("ROOM_ERROR", {
          errors: "Queue not found or unauthorized access.",
        });
        return;
      }

      const room = `ANTREAN_${queueId}`;
      socket.join(room);
      logger.info(`Buyer successfully joined room: ${room}`);
    } catch (error) {
      // Meniru error 500 dari middleware lu
      logger.error(
        `[Socket Error] Failed to join queue room: ${error.message}`,
      );

      const isProduction = process.env.NODE_ENV === "production";
      socket.emit("ROOM_ERROR", {
        errors: isProduction ? "Internal server error." : error.message,
      });
    }
  });

  // 2. Wajib ditambahin biar nggak memory leak
  socket.on("LEAVE_QUEUE_ROOM", (queueId) => {
    try {
      const room = `ANTREAN_${queueId}`;
      socket.leave(room);
      logger.info(`Buyer left room: ${room}`);
    } catch (error) {
      logger.error(
        `[Socket Error] Failed to leave queue room: ${error.message}`,
      );
    }
  });
}
