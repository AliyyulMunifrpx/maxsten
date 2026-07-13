import cron from "node-cron";
import { prisma } from "../application/database.js";

export const startCronJobs = (io) => {
  cron.schedule("* * * * *", async () => {
    try {
      const waktuBatas = new Date(Date.now() - 30 * 60 * 1000);

      // 1. Cari dulu antrean mana saja yang mau dibatalkan
      const expiredQueues = await prisma.queue.findMany({
        where: {
          status: "BELUM_BAYAR",
          created_at: { lt: waktuBatas },
        },
        select: { id: true },
      });

      if (expiredQueues.length > 0) {
        // 2. Update statusnya di database
        await prisma.queue.updateMany({
          where: {
            id: { in: expiredQueues.map((q) => q.id) },
          },
          data: { status: "DIBATALKAN" },
        });

        // 3. Umumkan ke masing-masing kamar Socket.io
        expiredQueues.forEach((queue) => {
          io.to(`ANTREAN_${queue.id}`).emit("STATUS_UPDATED", {
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
