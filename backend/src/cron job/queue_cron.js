import cron from "node-cron";
import { prisma } from "../application/database.js";

export const initQueueCron = (io) => {
  // Jalan setiap 1 menit
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // 1. Cari antrean yang kedaluwarsa
      const expiredQueues = await prisma.queue.findMany({
        where: {
          status: "BELUM_BAYAR",
          expired_at: { lt: now },
        },
        select: {
          id: true,
          store_id: true,
        },
      });

      if (expiredQueues.length > 0) {
        // 2. Update statusnya di database secara massal
        await prisma.queue.updateMany({
          where: {
            id: { in: expiredQueues.map((q) => q.id) },
          },
          data: {
            status: "DIBATALKAN",
            cancelled_by: "SYSTEM",
            cancellation_reason: "queue is expired",
          },
        });

        // 3. Broadcast ke masing-masing kamar Socket.io
        expiredQueues.forEach((queue) => {
          io.to(`ANTREAN_${queue.id}`).emit("STATUS_UPDATED", {
            id: queue.id,
            status: "DIBATALKAN",
            triggered_by: "system",
            reason: "queue is expired",
          });
        });

        expiredQueues.forEach((queue) => {
          io.to(`TOKO_${queue.store_id}`).emit("STATUS_UPDATED", {
            id: queue.id,
            status: "DIBATALKAN",
            triggered_by: "system",
            reason: "queue is expired",
          });
        });

        console.log(
          `[CRON] ${expiredQueues.length} expired queues were canceled and announced via Socket`,
        );
      }
    } catch (error) {
      console.error("[CRON] Failed to cancel expired queue:", error);
    }
  });
};
