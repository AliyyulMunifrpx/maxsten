import { logger } from "./application/logging.js";
import { web } from "./application/web.js";
import { prisma } from "./application/database.js";
import { redisClient } from "./application/redis.js";
// 1. Import modul HTTP bawaan Node dan Socket.io
import { createServer } from "http";
import { Server } from "socket.io";
import { startCronJobs } from "./service/cron_service.js";
import { socketAuth } from "./middleware/socket_auth.js";
import { registerSellerEvents } from "./socket/seller_events.js";
import { registerBuyerEvents } from "./socket/buyer_events.js";
import { registerDebugEvents } from "./socket/debug_events.js";

// 2. Bungkus Express 'web' lu pakai HTTP Server
const httpServer = createServer(web);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://192.168.1.5:5173"], // Biar frontend bisa connect tanpa error CORS, ketika production, ini harus diganti alamat frontend biar cuma frontend kita yang bisa make ini
    credentials: true, // Biar Cookie bisa dikirim ke backend
  },
});

io.use(socketAuth);

// Simpan 'io' ke dalam Express (variabel web), biar nanti Controller lu bisa manggil req.app.get('socketio')
web.set("socketio", io);

io.on("connection", (socket) => {
  logger.info(`${socket.user.username} connected`);

  registerSellerEvents(socket);

  registerBuyerEvents(socket);

  socket.on("disconnect", () => {
    logger.info(`${socket.user.username} disconnect`);
  });
});
startCronJobs(io);
// UBAH DARI web.listen JADI httpServer.listen
// (Btw, gw ganti port-nya jadi 3000 ya, tadi di kode lu cuma 300 kayaknya typo)
httpServer.listen(3000, () => {
  logger.info("App & WebSocket API started on port 3000");
});
