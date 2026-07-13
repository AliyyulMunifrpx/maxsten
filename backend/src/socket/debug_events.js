export function registerDebugEvents(socket) {
  socket.on("bismillah", (data) => {
    console.log(data);
  });
}