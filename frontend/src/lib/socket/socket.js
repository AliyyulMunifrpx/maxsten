import { io } from "socket.io-client";

// Bikin variabel global atau state untuk nyimpen instance socket-nya
export let socket;

export function connectToSocket() {
  // 1. Cek apakah ada token di cookie

  // 2. Putuskan koneksi yang lama kalau sebelumnya udah pernah konek
  // Ini penting biar nggak ada koneksi ganda (double connection) pas pindah role
  if (socket) {
    socket.disconnect();
  }

  // Socket.IO otomatis membawa Cookie yang ada di browser ke backend
  socket = io("http://192.168.1.5:3000", {
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("Socket terhubung dengan ID:", socket.id);
  });
  socket.on("connect_error", (error) => {
    console.error("Gagal terhubung:", error.message);
  });
}
