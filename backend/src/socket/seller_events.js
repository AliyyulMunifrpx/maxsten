import { prisma } from "../application/database.js";
import { logger } from "../application/logging.js";

export function registerSellerEvents(socket) {
  socket.on("JOIN_STORE_ROOM", async () => {
    const store = await prisma.store.findFirst({
      where: {
        user_id: socket.user.id,
      },
    });
    if (!store) return;

    const room = `TOKO_${store.id}`;

    socket.join(room);

    console.log(`${socket.user.username} join ${room}`);
  });
}