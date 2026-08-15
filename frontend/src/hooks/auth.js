import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { privateApi, publicApi } from "../lib/axios.js";
import { supabase } from "../lib/supabase.js";

// ==========================================
// AUTHENTICATION HOOKS (REGISTER, LOGIN, DLL)
// ==========================================

export function useRegister() {
  return useMutation({
    mutationFn: async ({ name, email, password }) => {
      const response = await publicApi.post("/users", {
        name,
        email,
        password,
      });
      return response.data;
    },
  });
}

export function useResendEmail() {
  return useMutation({
    mutationFn: async (email) => {
      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await publicApi.post("/users/login", {
        email,
        password,
      });
      return response.data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      return data;
    },
  });
}

// Sesuai Docs: Method diubah jadi DELETE
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await privateApi.delete("/users/logout");
      return response.data;
    },
    onSuccess: () => {
      // Bersihkan semua cache data saat user logout
      queryClient.clear();
    },
  });
}

// ==========================================
// USER PROFILE HOOKS
// ==========================================

// GET /api/users/me
export function useAuthSession() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await privateApi.get("/users/me");
      return response.data;
    },
    retry: false,
  });
}

// PATCH /api/users/me (Khusus update field name di database lokal)
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }) => {
      const response = await privateApi.patch("/users/me", { name });
      return response.data;
    },
    onSuccess: () => {
      // Wajib: Invalidate cache 'user' agar UI (seperti nama di sidebar) langsung terupdate!
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
export function useUpdateEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newEmail) => {
      // Tembak endpoint yang baru kita bikin
      const response = await privateApi.patch("/users/email", {
        email: newEmail,
      });
      return response.data;
    },
    onSuccess: () => {
      // Langsung refresh data user di sidebar & layar
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

// UPDATE PASSWORD (via SDK Supabase)
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (newPassword) => {
      // 1. Sinkronkan token dari localStorage ke SDK Supabase Frontend
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      // 2. Lakukan update
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return data;
    },
  });
}

// DELETE /api/users/me (Hard delete account)
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await privateApi.delete("/users/me");
      return response.data;
    },
    onSuccess: () => {
      // Bersihkan cache dan paksa user ke state unauthenticated
      queryClient.clear();
    },
  });
}
