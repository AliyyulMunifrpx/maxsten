export function registerBuyerEvents(socket) {
  // 1. Tangkap ID antrean aja (langsung nilai angkanya)
  socket.on("JOIN_QUEUE_ROOM", (queueId) => {
    const room = `ANTREAN_${queueId}`;
    socket.join(room);
    console.log(`Buyer join room: ${room}`);
  });

  // 2. Wajib ditambahin biar nggak memory leak!
  socket.on("LEAVE_QUEUE_ROOM", (queueId) => {
    const room = `ANTREAN_${queueId}`;
    socket.leave(room);
    console.log(`Buyer leave room: ${room}`);
  });
}
