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
    console.log("\n========== AUTH MIDDLEWARE ==========");

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

    console.log("🔐 Access Token:", maskToken(accessToken));
    console.log("🔄 Refresh Token:", maskToken(refreshToken));

    // ==========================================
    // 3. Tidak punya credential sama sekali
    // ==========================================
    if (!accessToken && !refreshToken) {
      console.log("❌ Tidak ada access token dan refresh token");

      return res.status(401).json({
        errors: "Unauthorized",
      });
    }

    let user = null;
    let error = null;

    // ==========================================
    // 4. Validasi Access Token
    // ==========================================
    if (accessToken) {
      console.log("🔍 Mengecek access token ke Supabase...");

      const result = await supabase.auth.getUser(accessToken);

      user = result.data.user;
      error = result.error;

      if (error) {
        console.log("❌ Access token gagal:", error.message);
      } else {
        console.log("✅ Access token valid");
        console.log("👤 Supabase User:", user?.id);
      }
    } else {
      console.log("⚠️ Access token tidak tersedia");
    }

    // ==========================================
    // 5. Refresh jika:
    //    - Access token tidak ada
    //    - ATAU access token expired/tidak valid
    //
    //    DAN refresh token tersedia
    // ==========================================
    if ((!user || error) && refreshToken) {
      console.log("🔄 Mencoba refresh session...");
      console.log(
        "🔑 Refresh Token:",
        maskToken(refreshToken),
      );

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
          "❌ Refresh session gagal:",
          refreshError?.message || "Session tidak tersedia",
        );

        return res.status(401).json({
          errors: "Session Expired. Please login again.",
        });
      }

      // ==========================================
      // Refresh BERHASIL
      // ==========================================
      accessToken = refreshData.session.access_token;

      const newRefreshToken =
        refreshData.session.refresh_token;

      user = refreshData.user;
      error = null;

      console.log("=================================");
      console.log("✅ REFRESH BERHASIL");
      console.log("👤 User:", user?.id);
      console.log(
        "🆕 New Access Token:",
        maskToken(accessToken),
      );
      console.log(
        "🆕 New Refresh Token:",
        maskToken(newRefreshToken),
      );
      console.log("=================================");

      // ==========================================
      // Kirim token baru ke frontend
      // ==========================================
      res.setHeader(
        "x-new-access-token",
        accessToken,
      );

      res.setHeader(
        "x-new-refresh-token",
        newRefreshToken,
      );

      console.log(
        "📤 x-new-access-token:",
        maskToken(res.getHeader("x-new-access-token")),
      );

      console.log(
        "📤 x-new-refresh-token:",
        maskToken(res.getHeader("x-new-refresh-token")),
      );
    }

    // ==========================================
    // 6. Semua metode authentication gagal
    // ==========================================
    if (error || !user) {
      console.log("❌ Authentication gagal");

      return res.status(401).json({
        errors: "Unauthorized",
      });
    }

    // ==========================================
    // 7. Validasi user ke database Prisma
    // ==========================================
    console.log(
      "🔍 Mengecek user Prisma:",
      user.id,
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
      console.log(
        "❌ User Supabase tidak ditemukan di database Prisma",
      );

      return res.status(401).json({
        errors: "User database mismatch",
      });
    }

    console.log(
      "✅ User Prisma ditemukan:",
      prismaUser.id,
    );

    // ==========================================
    // 8. Authentication sukses
    // ==========================================
    req.user = prismaUser;

    console.log("✅ AUTHENTICATION BERHASIL");
    console.log("====================================\n");

    next();
  } catch (err) {
    console.error("💥 AUTH MIDDLEWARE ERROR:", err);

    next(err);
  }
};
