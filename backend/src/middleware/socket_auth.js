import { supabase } from "../application/supabase.js";
import { prisma } from "../application/database.js";

export async function socketAuth(socket, next) {
  try {
    // 1. CARI ACCESS TOKEN, REFRESH TOKEN, & GUEST ID
    // Coba dari `auth` payload (dari client/React) dulu, kalau kosong ambil dari Cookie
    let accessToken = socket.handshake.auth?.token;
    let refreshToken = socket.handshake.auth?.refreshToken;
    let guestId = socket.handshake.auth?.guestId;

    const cookieHeader = socket.handshake.headers.cookie;

    if (cookieHeader) {
      if (!accessToken) {
        accessToken = cookieHeader
          ?.split(";")
          .find((c) => c.trim().startsWith("access_token="))
          ?.split("=")[1];
      }
      if (!refreshToken) {
        refreshToken = cookieHeader
          ?.split(";")
          .find((c) => c.trim().startsWith("refresh_token="))
          ?.split("=")[1];
      }
      if (!guestId) {
        guestId = cookieHeader
          ?.split(";")
          .find((c) => c.trim().startsWith("guest_id="))
          ?.split("=")[1];
      }
    }

    // 2. Jika tidak ada token sama sekali, anggap sebagai Guest
    if (!accessToken && !refreshToken) {
      if (!guestId) {
        return next(
          new Error("Unauthorized: Missing auth tokens and guest identity"),
        );
      }

      socket.user = {
        id: guestId,
        role: "buyer",
        name: "Guest",
      };

      return next();
    }

    // 3. Validasi token ke Supabase
    let {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    // 4. Jika Access Token Expired, TAPI ada Refresh Token (Fitur Auto-Refresh)
    if (error && refreshToken) {
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

      if (refreshError || !refreshData.session) {
        return next(new Error("Session Expired. Please login again."));
      }

      // Update variabel dengan session yang baru
      accessToken = refreshData.session.access_token;
      user = refreshData.user;
      error = null;

      // CATATAN PENTING UNTUK SOCKET:
      // Karena di middleware Socket tidak ada objek `res` (response) untuk ngeset Cookie/Header,
      // kita simpan token baru ini di dalam objek `socket`.
      // Nanti kita bisa kirim balik token ini ke frontend setelah koneksi berhasil.
      socket.newTokens = {
        accessToken: refreshData.session.access_token,
        refreshToken: refreshData.session.refresh_token,
      };
    }

    // 5. Kalau gagal semuanya, tendang!
    if (error || !user) {
      return next(new Error("Unauthorized: Invalid token"));
    }

    // ==========================================
    // 6. Validasi user database
    // ==========================================
    // Samakan dengan authMiddleware: pakai supabase_id
    const prismaUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: { id: true, supabase_id: true, email: true, name: true },
    });

    if (!prismaUser) {
      return next(new Error("User database mismatch"));
    }

    socket.user = {
      ...prismaUser,
      role: "seller",
    };

    next();
  } catch (err) {
    next(err);
  }
}
