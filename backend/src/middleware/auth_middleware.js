import { prisma } from "../application/database.js";
import { supabase } from "../application/supabase.js";

export const authMiddleware = async (req, res, next) => {
  // 1. CARI ACCESS TOKEN: HANYA dari Header Authorization
  let accessToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  // 2. CARI REFRESH TOKEN: HANYA dari Custom Header
  let refreshToken = req.headers["x-refresh-token"];

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ errors: "Unauthorized" }).end();
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
      // Clear Cookie dihapus, langsung return 401
      return res
        .status(401)
        .json({ errors: "Session Expired. Please login again." })
        .end();
    }

    // Update token baru
    accessToken = refreshData.session.access_token;

    // Kirim token baru lewat Response Header.
    // Axios di React bisa nangkep header ini (lewat interceptor) buat nge-update localStorage.
    res.setHeader("x-new-access-token", accessToken);
    res.setHeader("x-new-refresh-token", refreshData.session.refresh_token);

    user = refreshData.user;
    error = null;
  }

  // 5. Kalau gagal semuanya, tendang!
  if (error || !user) {
    return res.status(401).json({ errors: "Unauthorized" }).end();
  }

  // ==========================================
  // Validasi user database
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
