import { supabase } from "../application/supabase.js";
import { prisma } from "../application/database.js";

export async function socketAuth(socket, next) {
  try {
    // 1. CARI ACCESS TOKEN, REFRESH TOKEN, & GUEST ID
    // Seller MURNI ngambil dari auth payload (karena cookie udah dihapus)
    let accessToken = socket.handshake.auth?.token;
    let refreshToken = socket.handshake.auth?.refreshToken;

    // Buyer ngambil dari auth payload, ATAU fallback ke Cookie (karena guest_id masih pakai cookie)
    let guestId = socket.handshake.auth?.guestId;

    const cookieHeader = socket.handshake.headers.cookie;

    // CUKUP cari guest_id di cookie, token JWT udah nggak ada wujudnya di situ
    if (!guestId && cookieHeader) {
      guestId = cookieHeader
        ?.split(";")
        .find((c) => c.trim().startsWith("guest_id="))
        ?.split("=")[1];
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
      // Karena di middleware Socket tidak ada objek `res` untuk ngeset Header,
      // kita simpan token baru ini di dalam objek `socket`.
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
