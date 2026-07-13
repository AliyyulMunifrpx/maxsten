import { useEffect } from "react";
import { connectToSocket } from "../../lib/socket/socket.js";

export default function SocketManager() {
  useEffect(() => {
    connectToSocket();
  }, []); // Jalan 1x saat web pertama kali diload
  
  return null; // Tidak menampilkan apa-apa di layar
}