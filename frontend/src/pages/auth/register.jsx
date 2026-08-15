import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // ✅ IMPORT MOTION
import { Input } from "@/components/ui/input";
import { useRegister } from "../../hooks/auth.js";
import toast from "react-hot-toast";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { mutate, isPending } = useRegister();
  const navigate = useNavigate();

  useDocumentTitle("Daftar Akun");

  function handleSubmit(e) {
    e.preventDefault();
    mutate(form, {
      onSuccess: (data) => {
        toast.success("Registrasi berhasil! Silakan cek email kamu.");
        console.log("Registration successful:", data);

        navigate("/verify-email", {
          state: { email: form.email, startTimer: true },
        });
      },
      onError: (err) => {
        toast.error(err.message || "Gagal mendaftar, silakan coba lagi.");
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
        Selamat datang{" "}
      </h1>

      {/* 16px */}
      <p className="mb-6 text-center text-[16px] text-muted-foreground">
        Antrean digital untuk UMKM.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* NAMA — 16px */}
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Nama Lengkap"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="h-12 rounded-full border-none bg-white/5 px-4 text-[16px] text-white"
        />

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
          placeholder="Password (Min. 8 Karakter)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
          className="h-12 rounded-full border-none bg-white/5 px-4 text-[16px] text-white"
        />

        {/* BUTTON — 16px */}
        <RevealButton
          type="submit"
          className="w-full rounded-full text-[16px]"
          disable={isPending}
          label={isPending ? "Mendaftar..." : "Daftar"}
          bgBefore="bg-white"
          textBefore="text-[#1e1e1e]"
        />
      </form>

      {/* 16px */}
      <p className="mt-6 text-center text-[16px] text-muted-foreground">
        Udah punya akun?{" "}
        <Link to="/login" className="font-medium text-white">
          Masuk
        </Link>
      </p>
    </motion.div>
  );
}
