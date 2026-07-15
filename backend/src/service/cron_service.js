import cron from "node-cron";
import { prisma } from "../application/database.js";

export const startCronJobs = (io) => {
  cron.schedule("*/1 * * * * *", async () => {
    try {
      const now = new Date();

      // 1. Cari dulu antrean mana saja yang mau dibatalkan berdasarkan expired_at
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
        // 2. Update statusnya di database
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

        // 3. Umumkan ke masing-masing kamar Socket.io
        expiredQueues.forEach((queue) => {
          io.to(`ANTREAN_${queue.id}`).emit("STATUS_UPDATED", {
            id: queue.id,
            status: "DIBATALKAN",
          });
        });
        expiredQueues.forEach((queue) => {
          io.to(`TOKO_${queue.store_id}`).emit("STATUS_UPDATED", {
            id: queue.id,
            status: "DIBATALKAN",
          });
        });

        console.log(
          `${expiredQueues.length} antrean kedaluwarsa dibatalkan dan diumumkan via Socket.`,
        );
      }
    } catch (error) {
      console.error("Gagal menjalankan cron:", error);
    }
  });
};
