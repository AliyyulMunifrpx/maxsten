import { prisma } from "../application/database.js";
import nodemailer from "nodemailer";
import {
  loginUserValidation,
  registerUserValidation,
  updateUserProfileValidation,
} from "../validation/user_validation.js";
import { validate } from "../validation/validation.js";
import { ResponseError } from "../error/response_error.js";
import bcrypt from "bcrypt";
import { v7 as uuid } from "uuid";
import crypto from "crypto";
import { supabase } from "../application/supabase.js";
import path from "path";
import { unlink } from "fs/promises";
const register = async function (request) {
  const user = validate(registerUserValidation, request);

  const existingUser = await prisma.user.findFirst({
    where: {
      email: user.email,
    },
  });

  if (existingUser) {
    throw new ResponseError(400, "That email address already exists");
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
  });

  if (authError) {
    throw new ResponseError(400, authError.message);
  }

  if (!authData?.user || authData.user.identities?.length === 0) {
    throw new ResponseError(400, "That email address already exists");
  }

  try {
    return await prisma.user.create({
      data: {
        supabase_id: authData.user.id,
        email: user.email,
        name: user.name,
      },
      select: {
        email: true,
        name: true,
      },
    });
  } catch (e) {
    try {
      await supabase.auth.admin.deleteUser(authData.user.id);
    } catch {}

    if (e.code === "P2002") {
      throw new ResponseError(400, "That email address already exists");
    }
    throw e;
  }
};
const login = async function (request) {
  const loginRequest = validate(loginUserValidation, request);

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
    if (authError.message.includes("Invalid login credentials")) {
      throw new ResponseError(401, "Incorrect email or password");
    }
    if (authError.message.toLowerCase().includes("banned")) {
      throw new ResponseError(
        403,
        "Account suspended. Please contact support.",
      );
    }
    throw new ResponseError(500, authError.message);
  }

  const supabaseId = authData.user.id;
  const supabaseEmail = authData.user.email;
  if (!supabaseEmail) {
    throw new ResponseError(500, "Supabase email missing");
  }
  let user;
  try {
    user = await prisma.user.upsert({
      where: {
        supabase_id: supabaseId,
      },
      update: {
        email: supabaseEmail,
      },
      create: {
        supabase_id: supabaseId,
        email: supabaseEmail,
        name: "User",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  } catch (e) {
    if (e.code === "P2002") {
      throw new ResponseError(
        409,
        "This email address is already in use by another user. Please contact the admin",
      );
    }
    throw e;
  }

  return {
    email: user.email,
    name: user.name,
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    access_token_expires: authData.session.expires_in,
  };
};
const updateUser = async (userId, request) => {
  const req = validate(updateUserProfileValidation, request);

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { name: req.name },
      select: { name: true },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new ResponseError(404, "User not found");
    }
    throw new ResponseError(500, "Failed to update user profile");
  }
};

const syncEmailWebhook = async (payload) => {
  const { type, record, old_record } = payload;
  if (type === "UPDATE" && old_record?.email && record?.email) {
    if (old_record.email !== record.email) {
      try {
        // Gunakan updateMany!
        // Kalau supabase_id ini belum ada di Prisma, tidak akan terjadi error P2025.
        // Webhook akan tetap membalas 200 OK dengan tenang ke Supabase.
        await prisma.user.updateMany({
          where: { supabase_id: record.id },
          data: { email: record.email },
        });
        console.log(
          `[WEBHOOK] Successfully updated email for ID: ${record.id}`,
        );
      } catch (error) {
        console.error(
          `[WEBHOOK] DB Error updating email for ID: ${record.id}`,
          error,
        );
        throw new Error("Database update failed");
      }
    }
  }
  return "OK";
};
const logout = async (accessToken) => {
  if (!accessToken) {
    // Kalau token nggak ada (misal udah kehapus di FE), anggep aja udah logout
    return "OK";
  }

  // Hancurkan token (sesi) secara absolut di server Supabase
  const { error } = await supabase.auth.admin.signOut(accessToken);

  if (error) {
    // Kita cuma nge-log errornya, tapi TIDAK throw error ke Front-End.
    // Kenapa? Karena kalau throw error, baris kode 'res.clearCookie' di Controller
    // nggak bakal tereksekusi, dan user malah terjebak nggak bisa logout di browser.
    console.error(
      "[SUPABASE LOGOUT ERROR]: Failed to burn the token",
      error.message,
    );
  }

  return "OK";
};
const deleteUser = async (userId, supabaseId) => {
  // 1. Cek Antrean Aktif
  const activeUserQueue = await prisma.queue.findFirst({
    where: {
      store: {
        user_id: userId,
        is_delete: false,
      },
      status: {
        in: ["BELUM_BAYAR", "DIPROSES"],
      },
    },
  });

  if (activeUserQueue) {
    throw new ResponseError(
      409,
      "You cannot delete your account because your store still has active customer queues.",
    );
  }

  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      logo_url: true,
    },
  });

  try {
    await prisma.$transaction([
      prisma.store.updateMany({
        where: { user_id: userId, is_delete: false },
        data: { is_delete: true },
      }),
      prisma.user.delete({
        where: { id: userId },
      }),
    ]);
  } catch (prismaError) {
    if (prismaError.code === "P2025") {
    } else {
      console.error("Gagal hapus Prisma:", prismaError);
      throw new ResponseError(
        409,
        "We cannot delete the account because there is still data associated with it",
      );
    }
  }

  const { error } = await supabase.auth.admin.deleteUser(supabaseId);
  if (error) {
    console.error("Failed to delete user from Supabase:", error.message);
    await prisma.pendingSupabaseCleanup.create({
      data: { supabase_id: supabaseId, reason: error.message },
    });
  }

  if (store && store.logo_url) {
    try {
      const filePath = path.join(process.cwd(), "public", store.logo_url);
      await unlink(filePath);
    } catch (fileError) {
      console.error(
        "File logo gagal dihapus dari hardisk (abaikan):",
        fileError.message,
      );
    }
  }

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
