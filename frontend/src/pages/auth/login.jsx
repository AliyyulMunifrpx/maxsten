import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // ✅ IMPORT MOTION
import { Input } from "@/components/ui/input";
import { useLogin } from "../../hooks/auth.js";
import toast from "react-hot-toast";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const { mutate, isPending } = useLogin();

  useDocumentTitle("Masuk");
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // replace: true bikin user nggak bisa pencet tombol "Back" ke halaman login lagi
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);
  function handleSubmit(e) {
    e.preventDefault();

    mutate(form, {
      onSuccess: (data) => {
        localStorage.setItem("access_token", data.data.access_token);
        localStorage.setItem("refresh_token", data.data.refresh_token);

        toast.success("Login berhasil!");
        navigate("/dashboard");
      },

      onError: (err) => {
        if (err.message.includes("belum diverifikasi")) {
          toast.error("Email belum diverifikasi!");

          navigate("/verify-email", {
            state: {
              email: form.email,
              autoResend: true,
            },
          });
        } else {
          toast.error(err.message || "Login gagal, silakan coba lagi.");
        }
      },
    });
  }

  return (
    // ✅ GANTI DIV JADI MOTION.DIV DENGAN ANIMASI
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full rounded-2xl p-4"
    >
      {/* JUDUL — 24px */}
      <h1 className="mb-3 text-center text-white text-[24px] font-semibold">
        Masuk
      </h1>

      {/* 16px */}
      <p className="mb-6  text-center text-[16px] text-muted-foreground">
        Antrean digital untuk UMKM.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* EMAIL — 16px */}
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="h-12 rounded-full border-none bg-white/5 px-4 text-[16px] text-white"
        />

        {/* PASSWORD — 16px */}
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={8}
          className="h-12 rounded-full border-none bg-white/5 px-4 text-[16px] text-white"
        />

        {/* BUTTON — 16px */}
        <RevealButton
          type="submit"
          className="w-full rounded-full text-[16px]"
          disable={isPending}
          label={isPending ? "Masuk..." : "Masuk"}
          bgBefore="bg-white"
          textBefore="text-[#1e1e1e]"
        />
      </form>

      {/* 16px */}
      <div className="mt-6 flex w-full items-center justify-center">
        <Link
          to="/forgot-password"
          className="text-[16px] font-medium text-white"
        >
          Lupa password?
        </Link>
      </div>

      {/* 16px */}
      <p className="mt-6 text-center text-[16px] text-muted-foreground">
        Belum punya akun?{" "}
        <Link to="/register" className="font-medium text-white">
          Daftar sekarang
        </Link>
      </p>
    </motion.div>
  );
}
