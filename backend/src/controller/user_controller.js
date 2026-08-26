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

    // Murni mengembalikan token via JSON untuk digunakan sebagai Bearer Token
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
    // 1. Ambil token HANYA dari Header Authorization
    const accessToken = req.headers.authorization?.split(" ")[1];

    // 2. Lempar token ke service untuk dihanguskan di Supabase
    if (accessToken) {
      await userService.logout(accessToken);
    }

    // 3. Kasih respons sukses (Clear Cookie dihapus karena sudah tidak pakai cookie)
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

    // Clear Cookie dihapus karena sudah tidak pakai cookie
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
    const result = await userService.updateEmail(req.user, req.body);
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
  updateEmail,
};
