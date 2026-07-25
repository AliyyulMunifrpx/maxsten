import userService from "../service/user_service.js";

const register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body);
    res.status(201).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body);
    res.cookie("access_token", result.access_token, {
      httpOnly: true, // HACKER GAK BISA BACA INI LEWAT JAVASCRIPT
      secure: process.env.NODE_ENV === "production", // Kalau udah live wajib HTTPS (true)
      sameSite: "none", // Mencegah serangan CSRF (serangan dari web lain)
      maxAge: result.access_token_expires * 1000,
    });
    res.cookie("refresh_token", result.refresh_token, {
      httpOnly: true, // HACKER GAK BISA BACA INI LEWAT JAVASCRIPT
      secure: process.env.NODE_ENV === "production", // Kalau udah live wajib HTTPS (true)
      sameSite: "none", // Mencegah serangan CSRF (serangan dari web lain)
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const getUser = async (req, res, next) => {
  try {
    res.status(200).json({ data: req.user });
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
    await userService.logout(req.user.id);

    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

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
    // req.user.id dapet dari Prisma ID, req.user.supabase_id dapet dari middleware lu
    await userService.deleteUser(req.user.id, req.user.supabase_id);

    // Otomatis logout-in usernya (buang cookie)
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    res.status(200).json({
      data: "OK",
      message: "Account permanently deleted",
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
};
