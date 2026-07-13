import userService from "../service/user_service.js";
const register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body);
    res.cookie("token", result.token, {
      httpOnly: true, // HACKER GAK BISA BACA INI LEWAT JAVASCRIPT
      secure: process.env.NODE_ENV === "production", // Kalau udah live wajib HTTPS (true)
      sameSite: "strict", // Mencegah serangan CSRF (serangan dari web lain)
      maxAge: 1000 * 60 * 60 * 24 * 15, // Umur cookie 15 hari (dalam milidetik)
    });
    res.status(200).json({
      data: {
        username: result.username,
      },
    });
  } catch (e) {
    next(e);
  }
};
const get = async (req, res, next) => {
  try {
    // req.user.id dapet dari auth_middleware yang udah lu bikin sebelumnya
    const result = await userService.getUser(req.user.id);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await userService.updateUser(req.user.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const logout = async (req, res, next) => {
  try {
    // 1. Ambil token mentah dari Cookie browser
    const token = req.cookies?.token;

    // 2. Suruh service ngehapus sesi di Redis
    await userService.logout(token);

    // 3. Perintahkan browser untuk menghapus Cookie 'token'
    res.clearCookie("token");

    res.status(200).json({ data: "Logout berhasil" });
  } catch (e) {
    next(e);
  }
};
const forgotPassword = async (req, res, next) => {
  try {
    const result = await userService.forgotPassword(req.body);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const result = await userService.verifyOtp(req.body);
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
  get,
  update,
  logout,
  forgotPassword,
  verifyOtp,
};
