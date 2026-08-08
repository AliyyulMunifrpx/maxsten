import { useState, useEffect } from "react";
import { useLocation, Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import { useResendEmail } from "../../hooks/auth.js";
import toast from "react-hot-toast";

export default function VerifyEmailPage() {
  const location = useLocation();
  const email = location.state?.email;
  // Tangkap tanda khusus dari halaman Register
  const startTimer = location.state?.startTimer;

  const getInitialCountdown = () => {
    if (!email) return 0;

    const storedExpiry = localStorage.getItem(`resend_timer_${email}`);

    if (storedExpiry) {
      const timeLeft = Math.floor(
        (parseInt(storedExpiry, 10) - Date.now()) / 1000,
      );
      // Kalau timer masih jalan, lanjutkan!
      if (timeLeft > 0) return timeLeft;
    }

    // Kalau user datang langsung dari Register (sistem baru saja mengirim email)
    if (startTimer) {
      const newExpiry = Date.now() + 120 * 1000;
      localStorage.setItem(`resend_timer_${email}`, newExpiry.toString());
      return 120;
    }

    // Kalau user datang dari Login (tidak ada flag startTimer) dan memori timer kosong,
    // kembalikan angka 0 supaya tombol Kirim Ulang langsung aktif!
    return 0;
  };

  const [countdown, setCountdown] = useState(getInitialCountdown);
  const { mutate: resendEmail, isPending } = useResendEmail();

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
        // Saat tombol manual diklik, baru kita buat timer 120 detiknya
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
    <div className="w-full rounded-2xl bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <MailCheck className="h-8 w-8 text-blue-600" />
      </div>

      <h1 className="mb-3 text-2xl font-semibold">Cek Email Kamu</h1>
      <p className="mb-6 text-base text-muted-foreground">
        Kami sudah mengirimkan link verifikasi ke <br />
        <span className="font-medium text-foreground">{email}</span>
      </p>

      <div className="space-y-4">
        <Button className="h-12 w-full text-base" asChild>
          <Link to="/login">Ke Halaman Login</Link>
        </Button>

        <Button
          variant="outline"
          className="h-12 w-full text-base"
          onClick={handleResend}
          disabled={isPending || countdown > 0}
        >
          {isPending
            ? "Mengirim ulang..."
            : countdown > 0
              ? `Tunggu ${formatTime(countdown)} untuk kirim ulang`
              : "Kirim Ulang Email"}
        </Button>
      </div>
    </div>
  );
}
