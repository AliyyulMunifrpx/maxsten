import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // ✅ IMPORT MOTION
import { Input } from "@/components/ui/input";
import { useUpdatePassword } from "../../hooks/auth.js";
import toast from "react-hot-toast";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const { mutate, isPending } = useUpdatePassword();
  const navigate = useNavigate();

  useDocumentTitle("Update Password");

  function handleSubmit(e) {
    e.preventDefault();
    mutate(password, {
      onSuccess: () => {
        toast.success("Password berhasil diperbarui!");
        // Kalau sukses, langsung lempar ke dashboard atau login
        navigate("/dashboard");
      },
      onError: (err) => {
        toast.error(err.message || "Gagal memperbarui password.");
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
        Buat Password Baru
      </h1>

      {/* 16px */}
      <p className="mb-6 text-center text-[16px] text-muted-foreground">
        Silakan masukkan password baru kamu di bawah ini.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* PASSWORD — 16px (Label dihapus, pindah ke placeholder) */}
        <Input
          id="password"
          type="password"
          placeholder="Password Baru (Min. 8 Karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          className="h-12 rounded-full border-none bg-white/5 px-4 text-[16px] text-white"
        />

        {/* BUTTON — 16px */}
        <RevealButton
          type="submit"
          className="w-full rounded-full text-[16px]"
          disable={isPending}
          label={isPending ? "Menyimpan..." : "Simpan Password"}
          bgBefore="bg-white"
          textBefore="text-[#1e1e1e]"
        />
      </form>
    </motion.div>
  );
}
