import { useState, useEffect, useRef } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { motion } from "framer-motion"; // ✅ IMPORT MOTION
import { MailCheck } from "lucide-react";
import { useResendEmail } from "../../hooks/auth.js";
import toast from "react-hot-toast";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function VerifyEmailPage() {
  const location = useLocation();
  const email = location.state?.email;
  const startTimer = location.state?.startTimer;
  const autoResend = location.state?.autoResend; // ✅ true kalau datang dari Login
  useDocumentTitle("Verifikasi Email");

  const getInitialCountdown = () => {
    if (!email) return 0;

    const storedExpiry = localStorage.getItem(`resend_timer_${email}`);

    if (storedExpiry) {
      const timeLeft = Math.floor(
        (parseInt(storedExpiry, 10) - Date.now()) / 1000,
      );
      if (timeLeft > 0) return timeLeft;
    }

    if (startTimer) {
      const newExpiry = Date.now() + 120 * 1000;
      localStorage.setItem(`resend_timer_${email}`, newExpiry.toString());
      return 120;
    }

    return 0;
  };

  const [countdown, setCountdown] = useState(getInitialCountdown);
  const { mutate: resendEmail, isPending } = useResendEmail();
  const hasAutoSentRef = useRef(false); // ✅ guard biar gak nembak 2x

  useEffect(() => {
    if (countdown <= 0) {
      localStorage.removeItem(`resend_timer_${email}`);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, email]);

  // ✅ Auto-resend
  useEffect(() => {
    if (autoResend && email && countdown === 0 && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      resendEmail(email, {
        onSuccess: () => {
          const newExpiry = Date.now() + 120 * 1000;
          localStorage.setItem(`resend_timer_${email}`, newExpiry.toString());
          setCountdown(120);
        },
        onError: () => {
          // Diem-diem aja kalau auto-send gagal
        },
      });
    }
  }, [autoResend, email, countdown, resendEmail]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!email) {
    return <Navigate to="/register" replace />;
  }

  const handleResend = () => {
    resendEmail(email, {
      onSuccess: () => {
        const newExpiry = Date.now() + 120 * 1000;
        localStorage.setItem(`resend_timer_${email}`, newExpiry.toString());
        setCountdown(120);
        toast.success(
          "Email konfirmasi berhasil dikirim ulang! Coba cek inbox atau spam.",
        );
      },
      onError: (err) => {
        toast.error(err.message || "Gagal mengirim ulang email.");
      },
    });
  };

  return (
    // ✅ GANTI DIV JADI MOTION.DIV DENGAN ANIMASI
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full rounded-2xl p-4 text-center"
    >
      
      {/* JUDUL — 24px */}
      <h1 className="mb-3 text-center text-[24px] font-semibold text-white">
        Cek Email Kamu
      </h1>

      {/* 16px */}
      <p className="mb-6 text-[16px] text-muted-foreground">
        Kami sudah mengirimkan link verifikasi ke <br />
        <span className="font-medium text-white">{email}</span>
      </p>

      <div className="space-y-4">
        {/* BUTTON KEMBALI — 16px */}
        <RevealButton
          type="button"
          className="w-full rounded-full text-[16px]"
          label="Kembali ke halaman login"
          bgBefore="bg-white"
          textBefore="text-[#1e1e1e]"
          path="/login"
        />

        {/* BUTTON KIRIM ULANG — 16px */}
        <RevealButton
          type="button"
          onClick={handleResend}
          className="w-full rounded-full text-[16px]"
          disable={isPending || countdown > 0}
          label={
            isPending
              ? "Mengirim ulang..."
              : countdown > 0
                ? `Tunggu ${formatTime(countdown)} untuk kirim ulang`
                : "Kirim Ulang Email"
          }
          bgBefore="bg-white/10" // Sengaja dibedain dikit biar Button Utama (Kembali) lebih nonjol
          textBefore="text-white"
        />
      </div>
    </motion.div>
  );
}
