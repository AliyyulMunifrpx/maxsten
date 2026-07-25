import { prisma } from "../application/database.js";
import { supabase } from "../application/supabase.js";

export const authMiddleware = async (req, res, next) => {
  let accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ errors: "Unauthorized" }).end();
  }

  let {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error && refreshToken) {
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

    if (refreshError || !refreshData.session) {
      res.clearCookie("access_token");
      res.clearCookie("refresh_token");
      return res
        .status(401)
        .json({ errors: "Session Expired. Please login again." })
        .end();
    }

    accessToken = refreshData.session.access_token;
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 1000 * 60 * 60,
    });
    res.cookie("refresh_token", refreshData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    user = refreshData.user;
    error = null;
  }

  if (error || !user) {
    return res.status(401).json({ errors: "Unauthorized" }).end();
  }

  // ==========================================
  // PERUBAHAN DI SINI: Pake supabase_id sebagai validasi utama
  // ==========================================
  const prismaUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { id: true, supabase_id: true, email: true, name: true },
  });

  if (!prismaUser) {
    return res.status(401).json({ errors: "User database mismatch" }).end();
  }

  req.user = prismaUser;
  next();
};
