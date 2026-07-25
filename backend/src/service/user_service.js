import { prisma } from "../application/database.js";
import nodemailer from "nodemailer";
import {
  forgotPasswordValidation,
  loginUserValidation,
  registerUserValidation,
  updateUserProfileValidation,
  updateUserValidation,
  verifyOtpvalidation,
} from "../validation/user_validation.js";
import { validate } from "../validation/validation.js";
import { ResponseError } from "../error/response_error.js";
import bcrypt from "bcrypt";
import { v7 as uuid } from "uuid";
import crypto from "crypto";
import { redisClient } from "../application/redis.js";
import { supabase, supabaseAdmin } from "../application/supabase.js";

const register = async function (request) {
  // 1. Validasi input dari user
  const user = validate(registerUserValidation, request);

  // 2. Cek apakah Email udah dipakai di Prisma
  const existingUser = await prisma.user.findFirst({
    where: {
      email: user.email,
    },
  });

  if (existingUser) {
    throw new ResponseError(400, "That email address already exists");
  }

  // 3. Daftarin ke Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
  });

  if (authError) {
    throw new ResponseError(400, authError.message);
  }

  // 4. Simpan ke Prisma dengan supabase_id sebagai Jembatan Beton
  return await prisma.user.create({
    data: {
      supabase_id: authData.user.id, // <--- Wajib masuk!
      email: user.email,
      name: user.name,
      // PASSWORD NGGAK USAH DIMASUKIN KE SINI
    },
    select: {
      email: true,
      name: true,
    },
  });
};

const login = async function (request) {
  // 1. Validasi input
  const loginRequest = validate(loginUserValidation, request);

  // ==========================================
  // 2. BIARKAN SATPAM SUPABASE YANG BEKERJA
  // ==========================================
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: loginRequest.email,
      password: loginRequest.password,
    });

  if (authError) {
    console.log("SUPABASE LOGIN ERROR:", authError.message, authError.status);
    if (authError.message.includes("Email not confirmed")) {
      throw new ResponseError(403, "Email not verified");
    }
    throw new ResponseError(401, authError.message);
  }

  const supabaseId = authData.user.id;
  const supabaseEmail = authData.user.email;

  // ==========================================
  // 3. AMBIL BIODATA PAKE ID SUPABASE (Bukan Email)
  // ==========================================
  let user = await prisma.user.findUnique({
    where: { supabase_id: supabaseId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    throw new ResponseError(404, "User not found");
  }

  // ==========================================
  // 4. FITUR AUTO-HEALING EMAIL
  // ==========================================
  if (user.email !== supabaseEmail) {
    user = await prisma.user.update({
      where: { supabase_id: supabaseId },
      data: { email: supabaseEmail },
    });
    console.log(`[AUTO-HEAL] Email synced for ID: ${supabaseId}`);
  }

  // ==========================================
  // 5. KEMBALIKAN TOKEN RESMI DARI SUPABASE
  // ==========================================
  return {
    email: user.email,
    name: user.name,
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    access_token_expires: authData.session.expires_in,
  };
};
const updateUser = async (userId, request) => {
  // 1. Validasi request dari user
  const req = validate(updateUserProfileValidation, request);

  // 2. Cek eksistensi user di database dulu biar Prisma nggak teriak error P2025
  const totalUserInDatabase = await prisma.user.count({
    where: {
      id: userId,
    },
  });

  if (totalUserInDatabase !== 1) {
    throw new ResponseError(404, "User not found");
  }

  // 3. Kalau aman, baru hajar update
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name: req.name,
    },
    select: { name: true },
  });
};
const syncEmailWebhook = async (payload) => {
  const { type, record, old_record } = payload;

  // Cek kalau ini action UPDATE dan emailnya beneran berubah
  if (type === "UPDATE" && old_record?.email && record?.email) {
    if (old_record.email !== record.email) {
      // Kita cari datanya pakai ID Supabase (record.id), lalu timpa pakai email baru
      await prisma.user.update({
        where: { supabase_id: record.id },
        data: { email: record.email },
      });
      console.log(`[WEBHOOK] Successfully updated email for ID: ${record.id}`);
    }
  }

  return "OK";
};
const logout = async (userId) => {
  return "OK";
};
const deleteUser = async (userId, supabaseId) => {
  // 1. Pastikan user-nya ada di database kita
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ResponseError(404, "User not found");
  }

  // 2. Hapus dari Supabase Auth (Satpam) pakai Client Dewa
  const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseId);

  if (error) {
    // Kalau gagal di sini, data di Prisma belum disentuh sama sekali — aman
    console.error("Failed to delete user from Supabase:", error.message);
    throw new ResponseError(500, "Failed to delete user authentication");
  }

  // 3. Hapus dari Prisma (Buku HRD)
  await prisma.user.delete({
    where: { id: userId },
  });

  return "OK";
};
export default {
  register,
  login,
  updateUser,
  syncEmailWebhook,
  logout,
  deleteUser,
};
