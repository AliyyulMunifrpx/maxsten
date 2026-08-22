import { logger } from "./application/logging.js";
import { web } from "./application/web.js";
import { prisma } from "./application/database.js";
// 1. Import modul HTTP bawaan Node dan Socket.io
import { createServer } from "http";
import { Server } from "socket.io";
import { socketAuth } from "./middleware/socket_auth.js";
import { registerSellerEvents } from "./socket/seller_events.js";
import { registerBuyerEvents } from "./socket/buyer_events.js";
import { registerDebugEvents } from "./socket/debug_events.js";
import { startCronJobs } from "./cron job/index.js";
// 2. Bungkus Express 'web' lu pakai HTTP Server
const httpServer = createServer(web);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL, // Biar frontend bisa connect tanpa error CORS, ketika production, ini harus diganti alamat frontend biar cuma frontend kita yang bisa make ini
    credentials: true, // Biar Cookie bisa dikirim ke backend
  },
});

io.use(socketAuth);

// Simpan 'io' ke dalam Express (variabel web), biar nanti Controller lu bisa manggil req.app.get('socketio')
web.set("socketio", io);
io.on("connection", (socket) => {
  logger.info(`${socket.user.name} connected`);

  // Jika token sempat di-refresh oleh middleware socketAuth,
  // kirim token baru tersebut ke klien agar mereka bisa meng-update localStorage / Cookie
  if (socket.newTokens) {
    socket.emit("token_refreshed", socket.newTokens);
  }

  registerSellerEvents(socket);
  registerBuyerEvents(socket);

  socket.on("disconnect", () => {
    logger.info(`${socket.user.name} disconnect`);
  });
});
startCronJobs(io);

httpServer.listen(3000, () => {
  logger.info("App & WebSocket API started on port 3000");
});
