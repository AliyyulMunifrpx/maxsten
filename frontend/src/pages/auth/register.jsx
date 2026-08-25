import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useRegister } from "../../hooks/auth.js";
import toast from "react-hot-toast";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { mutate, isPending } = useRegister();
  const navigate = useNavigate();

  useDocumentTitle("Daftar Akun");

  function handleSubmit(e) {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Password dan konfirmasi password tidak sama.");
      return;
    }

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full rounded-2xl p-4"
    >
      <h1 className="mb-3 text-center text-white text-[24px] font-semibold">
        Selamat datang{" "}
      </h1>

      <p className="mb-6 text-center text-[16px] text-muted-foreground">
        Antrean digital untuk UMKM.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Konfirmasi Password"
          value={form.confirmPassword}
          onChange={(e) =>
            setForm({ ...form, confirmPassword: e.target.value })
          }
          minLength={8}
          required
          className="h-12 rounded-full border-none bg-white/5 px-4 text-[16px] text-white"
        />

        <RevealButton
          type="submit"
          className="w-full rounded-full text-[16px]"
          disable={isPending}
          label={isPending ? "Mendaftar..." : "Daftar"}
          bgBefore="bg-white"
          textBefore="text-[#1e1e1e]"
        />
      </form>

      <p className="mt-6 text-center text-[16px] text-muted-foreground">
        Udah punya akun?{" "}
        <Link to="/login" className="font-medium text-white">
          Masuk
        </Link>
      </p>
    </motion.div>
  );
}
