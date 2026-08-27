import { supabase } from "../application/supabase.js";
import { prisma } from "../application/database.js";

export async function socketAuth(socket, next) {
  try {
    // 1. CARI SEMUA CREDENTIAL MURNI DARI HANDSHAKE AUTH
    let accessToken = socket.handshake.auth?.token;
    let refreshToken = socket.handshake.auth?.refreshToken;
    let guestId = socket.handshake.auth?.guestId;

    // 2. Jika tidak ada token sama sekali, anggap sebagai Guest (Buyer)
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

    // 3. Validasi token ke Supabase (Seller)
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

      accessToken = refreshData.session.access_token;
      user = refreshData.user;
      error = null;

      // Simpan token baru di object socket agar bisa ditangkap oleh event emitter nanti
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
