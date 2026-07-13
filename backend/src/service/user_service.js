import { prisma } from "../application/database.js";
import nodemailer from "nodemailer";
import {
  forgotPasswordValidation,
  getUserValidation,
  loginUserValidation,
  registerUserValidation,
  updateUserValidation,
  verifyOtpvalidation,
} from "../validation/user_validation.js";
import { validate } from "../validation/validation.js";
import { ResponseError } from "../error/response_error.js";
import bcrypt from "bcrypt";
import { v7 as uuid } from "uuid";
import crypto from "crypto";
import { redisClient } from "../application/redis.js";

// Samain nama variabelnya jadi testAccount

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});

const register = async function (request) {
  const user = validate(registerUserValidation, request);
  const countUser = await prisma.user.count({
    where: {
      username: user.username,
    },
  });
  if (countUser === 1) {
    throw new ResponseError(400, "ERR_USER_IS_ALREADY_EXIST");
  }
  user.password = await bcrypt.hash(user.password, 10);
  return await prisma.user.create({
    data: user,
    select: {
      username: true,
      name: true,
    },
  });
};
const login = async function (request) {
  const loginRequest = validate(loginUserValidation, request);

  const user = await prisma.user.findUnique({
    where: { username: loginRequest.username },
    // Ambil data yang sekiranya kamu butuhkan di middleware nanti
    select: { id: true, username: true, password: true, name: true },
  });

  if (!user) {
    throw new ResponseError(401, "ERR_USERNAME_OR_PASSWORD_WRONG");
  }

  const isPasswordValid = await bcrypt.compare(
    loginRequest.password,
    user.password,
  );
  if (!isPasswordValid) {
    throw new ResponseError(401, "ERR_USERNAME_OR_PASSWORD_WRONG");
  }

  // 1. Generate token mentah biasa
  const rawToken = uuid().toString();
  const hashToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  // 2. Siapkan data user yang mau disimpan di sesi Redis (harus berbentuk String)
  const sessionData = JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.name,
  });

  // 3. Simpan ke Redis dengan Key = rawToken
  // EX: 2592000 adalah 30 hari dalam satuan detik (60 * 60 * 24 * 30)
  await redisClient.set(hashToken, sessionData, "EX", 60 * 60 * 24 * 30);
  // Gak perlu update tabel token di Prisma lagi!

  return {
    username: user.username,
    token: rawToken,
  };
};
const getUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true }, // Jangan pernah nge-select password!
  });

  if (!user) throw new ResponseError(404, "User tidak ditemukan");
  return user;
};

// 2. UPDATE USER
const updateUser = async (userId, request) => {
  const req = validate(updateUserValidation, request);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ResponseError(404, "User tidak ditemukan");

  const data = {};
  if (req.name) data.name = req.name;

  // Kalau user ngisi password baru, kita hash dulu sebelum masuk DB
  if (req.password) {
    data.password = await bcrypt.hash(req.password, 10);
  }

  return await prisma.user.update({
    where: { id: userId },
    data: data,
    select: { id: true, username: true, name: true },
  });
};

// 3. LOGOUT (Hapus sesi dari Redis)
const logout = async (token) => {
  if (!token) return; // Kalau emang gak ada token, biarin aja

  // Hash tokennya (karena yang disimpan di Redis adalah versi Hash)
  const hashToken = crypto.createHash("sha256").update(token).digest("hex");

  // Hapus kunci tersebut dari memori Redis
  await redisClient.del(hashToken);
};
const forgotPassword = async (usernamereq) => {
  const data = validate(forgotPasswordValidation, usernamereq);

  // Ganti count jadi findUnique biar dapet datanya (termasuk user.name)
  const user = await prisma.user.findUnique({
    where: {
      username: data.username, // Panggil dari object data hasil validasi
    },
  });

  if (!user) {
    throw new ResponseError(404, "ERR_USER_NOT_FOUND");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiredAt = new Date();
  expiredAt.setMinutes(expiredAt.getMinutes() + 5);

  await prisma.user.update({
    where: { username: data.username },
    data: {
      otp: otp,
      otp_expired_at: expiredAt,
    },
  });

  // 👇 TAMBAHIN BLOK INI BUAT NGIRIM EMAIL
  const info = await transporter.sendMail({
    from: "onboarding@resend.dev", // Sesuaikan dengan email pengirim lu
    to: user.username, // Asumsi username lu adalah email
    subject: "Reset Password OTP",
    text: `Kode OTP kamu adalah: ${otp}. Kode ini hangus dalam 5 menit.`,
  });

  // Sekarang variabel info udah ada, jadi gak akan eror
  console.log("Preview URL Email Kamu: %s", nodemailer.getTestMessageUrl(info));

  return "OTP successfully sent";
};

const verifyOtp = async (request) => {
  const req = validate(verifyOtpvalidation, request);
  const user = await prisma.user.findUnique({
    where: { username: req.username },
  });
  if (!user) {
    throw new ResponseError(404, "ERR_USER_NOT_FOUND"); // Pakai 404 kalau data gak ketemu
  }
  if (user.otp !== req.otp) {
    throw new ResponseError(400, "ERR_INVALID_OTP"); // Pakai 400 (Bad Request)
  }
  // Pakai huruf D besar: new Date()
  if (user.otp_expired_at < new Date()) {
    throw new ResponseError(400, "ERR_EXPIRED_OTP");
  }

  return "OK";
};
export default {
  register,
  login,
  getUser,
  updateUser,
  logout,
  forgotPassword,
  verifyOtp,
};
