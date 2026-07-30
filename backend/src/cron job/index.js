import { initQueueCron } from "./queue_cron.js";
import { initUserCleanupCron } from "./user_cron.js";

export const startCronJobs = (io) => {
  console.log("Running all background cron jobs...");

  // Daftarkan semua cron di sini
  initQueueCron(io);
  initUserCleanupCron();
};
