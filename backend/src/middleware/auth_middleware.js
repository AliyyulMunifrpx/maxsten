import { prisma } from "../application/database.js";
import { supabase } from "../application/supabase.js";

const maskToken = (token) => {
  if (!token) return null;

  if (token.length <= 12) {
    return "***";
  }

  return `${token.slice(0, 6)}...${token.slice(-6)}`;
};

export const authMiddleware = async (req, res, next) => {
  try {
    // ==========================================
    // 1. Ambil Access Token
    // ==========================================
    let accessToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;

    // ==========================================
    // 2. Ambil Refresh Token
    // ==========================================
    const refreshToken = req.headers["x-refresh-token"];

    console.log("\n========== AUTH ==========");
    console.log("🔐 Access Token:", maskToken(accessToken));
    console.log("🔄 Refresh Token:", maskToken(refreshToken));

    // ==========================================
    // 3. Tidak ada token sama sekali
    // ==========================================
    if (!accessToken && !refreshToken) {
      console.log("❌ Tidak ada access token / refresh token");

      return res.status(401).json({
        errors: "Unauthorized",
      });
    }

    let user = null;
    let error = null;

    // ==========================================
    // 4. Kalau ADA access token → validasi
    // ==========================================
    if (accessToken) {
      console.log("🔍 Validating access token...");

      const result = await supabase.auth.getUser(accessToken);

      user = result.data.user;
      error = result.error;

      if (error) {
        console.log("❌ Access token invalid:", error.message);
      } else {
        console.log("✅ Access token valid");
        console.log("👤 Supabase User:", user?.id);
      }
    } else {
      console.log("⚠️ Access token tidak ada");
    }

    // ==========================================
    // 5. Kalau access token tidak valid / tidak ada
    //    DAN refresh token tersedia → REFRESH
    // ==========================================
    if ((!user || error) && refreshToken) {
      console.log("🔄 REFRESH SESSION DIMULAI");

      const {
        data: refreshData,
        error: refreshError,
      } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      // ==========================================
      // Refresh gagal
      // ==========================================
      if (refreshError || !refreshData.session) {
        console.log(
          "❌ Refresh gagal:",
          refreshError?.message
        );

        return res.status(401).json({
          errors: "Session Expired. Please login again.",
        });
      }

      // ==========================================
      // Refresh berhasil
      // ==========================================
      accessToken = refreshData.session.access_token;

      const newRefreshToken =
        refreshData.session.refresh_token;

      user = refreshData.user;
      error = null;

      console.log("✅ REFRESH BERHASIL");
      console.log("👤 User:", user?.id);
      console.log(
        "🆕 Access Token:",
        maskToken(accessToken)
      );
      console.log(
        "🆕 Refresh Token:",
        maskToken(newRefreshToken)
      );

      // ==========================================
      // Kirim token baru ke frontend
      // ==========================================
      res.setHeader(
        "x-new-access-token",
        accessToken
      );

      res.setHeader(
        "x-new-refresh-token",
        newRefreshToken
      );

      console.log(
        "📤 x-new-access-token:",
        maskToken(accessToken)
      );

      console.log(
        "📤 x-new-refresh-token:",
        maskToken(newRefreshToken)
      );
    }

    // ==========================================
    // 6. Authentication gagal
    // ==========================================
    if (error || !user) {
      console.log("❌ Authentication gagal");

      return res.status(401).json({
        errors: "Unauthorized",
      });
    }

    // ==========================================
    // 7. Cari user di Prisma
    // ==========================================
    console.log(
      "🔍 Mencari user Prisma:",
      user.id
    );

    const prismaUser = await prisma.user.findUnique({
      where: {
        supabase_id: user.id,
      },
      select: {
        id: true,
        supabase_id: true,
        email: true,
        name: true,
      },
    });

    if (!prismaUser) {
      console.log("❌ User tidak ditemukan di Prisma");

      return res.status(401).json({
        errors: "User database mismatch",
      });
    }

    console.log("✅ User Prisma ditemukan:", prismaUser.id);

    // ==========================================
    // 8. Sukses
    // ==========================================
    req.user = prismaUser;

    console.log("✅ AUTH SUCCESS");
    console.log("============================\n");

    next();
  } catch (err) {
    console.error("💥 AUTH ERROR:", err);

    next(err);
  }
};
