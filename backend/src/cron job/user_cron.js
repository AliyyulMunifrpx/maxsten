import cron from "node-cron";
import { prisma } from "../application/database.js";
import { supabase } from "../application/supabase.js"; // Sesuaikan path import supabase lu

export const initUserCleanupCron = () => {
  // Jalan setiap 1 jam sekali (0 * * * *) agar tidak boros resource/limit API
  cron.schedule("0 * * * *", async () => {
    console.log(
      "[CRON] Starting the cleanup of orphaned Supabase accounts (Pending Cleanup)...",
    );
    try {
      // Cicil 50 data per eksekusi untuk mencegah RAM bengkak
      const pending = await prisma.pendingSupabaseCleanup.findMany({
        where: {
          needs_manual_review: false, // Cuma narik yang masih mau dicoba
        },
        take: 50,
      });

      if (pending.length === 0) return;
      for (const item of pending) {
        const { error } = await supabase.auth.admin.deleteUser(
          item.supabase_id,
        );

        if (
          !error ||
          error.status === 404 ||
          error.message?.includes("User not found")
        ) {
          await prisma.pendingSupabaseCleanup.delete({
            where: { id: item.id },
          });
          console.log(
            `[CLEANUP] Successfully cleaned up Supabase ID: ${item.supabase_id}`,
          );
        } else if (item.attempt_count >= 24) {
          console.error(
            `[CLEANUP] Giving up on ${item.supabase_id} after 24 attempts, needs manual review:`,
            error.message,
          );
          // biarkan di tabel (jangan dihapus), tapi jangan diproses ulang otomatis lagi
          await prisma.pendingSupabaseCleanup.update({
            where: { id: item.id },
            data: {
              attempt_count: { increment: 1 },
              needs_manual_review: true,
            },
          });
        } else {
          await prisma.pendingSupabaseCleanup.update({
            where: { id: item.id },
            data: { attempt_count: { increment: 1 } },
          });
          console.error(
            `[CLEANUP ERROR] Gagal menghapus ID ${item.supabase_id}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      console.error("[CRON] Failed to run user cleanup:", error);
    }
  });
};
