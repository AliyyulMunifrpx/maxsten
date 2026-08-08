import { useMutation, useQuery } from "@tanstack/react-query";
import { privateApi, publicApi } from "../lib/axios.js";
import { supabase } from "../lib/supabase.js";

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
          emailRedirectTo: `${window.location.origin}/verify-email`,
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

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (newPassword) => {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const response = await privateApi.post("/users/logout");
      return response.data;
    },
  });
}

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
