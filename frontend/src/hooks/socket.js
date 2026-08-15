import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Ganti sesuai URL backend kamu (kalau prod bisa pakai variabel env)
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL
export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // 1. Ambil token dari tempat kamu menyimpannya (localStorage / cookies / zustand)
    const accessToken = localStorage.getItem("access_token") || "";
    const refreshToken = localStorage.getItem("refresh_token") || "";
    const guestId = localStorage.getItem("maxsten_guest_id") || ""; // Sesuaikan logikamu

    // 2. Inisialisasi koneksi Socket
    const socketInstance = io(SOCKET_URL, {
      withCredentials: true, // Wajib di-true kan karena backend kamu set 'credentials: true'
      auth: {
        token: accessToken,
        refreshToken: refreshToken,
        guestId: guestId,
      },
    });

    // 3. Listener bawaan Socket.io
    socketInstance.on("connect", () => {
      console.log(
        "Successfully connected to the socket with ID:",
        socketInstance.id,
      );
    });

    // 4. Tangkap Token Baru (Fitur Auto-Refresh dari Backend)
    socketInstance.on("token_refreshed", (newTokens) => {
      console.log("The token is refreshed via a socket!", newTokens);
      localStorage.setItem("access_token", newTokens.accessToken);
      localStorage.setItem("refresh_token", newTokens.refreshToken);
      // Kalau pakai state management kayak Zustand/Redux, update juga statenya di sini
    });

    // 5. Handle Error dari Middleware (Misal token mati atau user tidak valid)
    socketInstance.on("connect_error", (err) => {
      console.error("❌ Socket Error:", err.message);

      // Kalau gagal total / session habis, kamu bisa arahin paksa ke halaman login
      if (err.message.includes("Session Expired")) {
        console.log("Your session has expired. Please log in again");
        localStorage.clear();
        // window.location.href = "/login";
      }
    });

    setSocket(socketInstance);

    // 6. Cleanup (SANGAT PENTING!)
    // Ini biar kalau komponennya hilang (pindah halaman), koneksi socket diputus,
    // biar nggak numpuk bikin server jebol.
    return () => {
      socketInstance.disconnect();
    };
  }, []); // Array kosong = hanya dijalankan sekali saat mount

  return socket;
};
