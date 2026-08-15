import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // ✅ IMPORT MOTION
import { Input } from "@/components/ui/input";
import { useForgotPassword } from "../../hooks/auth.js";
import toast from "react-hot-toast";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const { mutate, isPending } = useForgotPassword();
  const [isSent, setIsSent] = useState(false);

  useDocumentTitle("Lupa Password");

  function handleSubmit(e) {
    e.preventDefault();
    mutate(email, {
      onSuccess: () => {
        toast.success("Link reset password berhasil dikirim!");
        setIsSent(true); // Ubah tampilan kalau email sukses terkirim
      },
      onError: (err) => {
        toast.error(err.message || "Gagal mengirim link reset.");
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
        Lupa Password?
      </h1>

      {!isSent ? (
        <>
          {/* 16px */}
          <p className="mb-6 text-center text-[16px] text-muted-foreground">
            Masukkan email yang terdaftar, kami akan mengirimkan link untuk
            membuat password baru.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* EMAIL — 16px (Label dihapus biar konsisten) */}
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-full border-none bg-white/5 px-4 text-[16px] text-white"
            />

            {/* BUTTON — 16px */}
            <RevealButton
              type="submit"
              className="w-full rounded-full text-[16px]"
              disable={isPending}
              label={isPending ? "Mengirim..." : "Kirim Email Reset"}
              bgBefore="bg-white"
              textBefore="text-[#1e1e1e]"
            />
          </form>
        </>
      ) : (
        <div className="space-y-6 text-center">
          {/* 16px */}
          <p className="text-[16px] text-muted-foreground">
            Silakan cek kotak masuk atau folder spam di email{" "}
            <strong className="text-white">{email}</strong>.
          </p>

          <RevealButton
            className="w-full rounded-full text-[16px]"
            onClick={() => setIsSent(false)}
            label="Coba email lain"
            bgBefore="bg-white"
            textBefore="text-[#1e1e1e]"
          />
        </div>
      )}

      {/* 16px */}
      <p className="mt-6 text-center text-[16px] text-muted-foreground">
        Ingat password kamu?{" "}
        <Link to="/login" className="font-medium text-white">
          Kembali ke Login
        </Link>
      </p>
    </motion.div>
  );
}
