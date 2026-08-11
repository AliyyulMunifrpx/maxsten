import userService from "../service/user_service.js";

const register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body);
    res.status(201).json({
      data: result, // result dari service cuma ngembaliin email & name
    });
  } catch (e) {
    console.error("REGISTER CONTROLLER ERROR:", e);

    next(e);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body);

    // Set Access Token ke Cookie
    res.cookie("access_token", result.access_token, {
      httpOnly: true, // Aman dari bacaan JavaScript (XSS)
      secure: true, // Wajib true karena beda domain & sameSite "none"
      sameSite: "none", // Syarat wajib beda domain (Cross-Origin)
      maxAge: result.access_token_expires * 1000,
    });

    // Set Refresh Token ke Cookie
    res.cookie("refresh_token", result.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 hari
    });

    // PENTING: Potong response. Jangan masukkan token ke JSON body!
    res.status(200).json({
      data: {
        email: result.email,
        name: result.name,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      },
    });
  } catch (e) {
    next(e);
  }
};
const getUser = async (req, res, next) => {
  try {
    res
      .status(200)
      .json({ data: { name: req.user.name, email: req.user.email } });
  } catch (e) {
    next(e);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const result = await userService.updateUser(req.user.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const syncEmailWebhook = async (req, res, next) => {
  const signature = req.headers["x-webhook-secret"];
  if (signature !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await userService.syncEmailWebhook(req.body);
    res.status(200).json({ message: "Prisma sync successful" });
  } catch (e) {
    console.error("[WEBHOOK ERROR]", e);
    res.status(500).json({ error: "Failed to sync to Prisma" });
  }
};
const logout = async (req, res, next) => {
  try {
    // 1. Ambil token dari cookie atau Header (Ini udah cakep banget logikanya!)
    const accessToken =
      req.cookies?.access_token || req.headers.authorization?.split(" ")[1];

    // 2. Lempar token ke service untuk dihanguskan di Supabase
    if (accessToken) {
      await userService.logout(accessToken);
    }

    // 3. Bersihkan cookie (Tambahin path: "/")
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/", // <--- INI WAJIB ADA
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/", // <--- INI WAJIB ADA
    });

    // 4. Kasih respons sukses
    res.status(200).json({
      data: "OK",
      message: "Logout successful",
    });
  } catch (e) {
    next(e);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.user.id, req.user.supabase_id);

    // Otomatis logout-in usernya (Tambahin path: "/")
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/", // <--- INI WAJIB ADA
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/", // <--- INI WAJIB ADA
    });

    res.status(200).json({
      data: "OK",
      message: "Account permanently deleted",
    });
  } catch (e) {
    next(e);
  }
};
const updateEmail = async (req, res, next) => {
  try {
    // req.user didapat dari authMiddleware yang udah lu bikin
    const result = await userService.updateEmail(req.user.id, req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
export default {
  register,
  login,
  getUser,
  updateUser,
  syncEmailWebhook,
  logout,
  deleteUser,
  updateEmail
};
