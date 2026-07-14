import { useState, useEffect } from "react";

// Komponen ini murni nampilin countdown menuju `expiresAt` (timestamp absolut
// dari backend, hasil hitungan store.payment_timeout). Gak ngitung ulang durasi
// sendiri, jadi otomatis ngikutin berapapun timeout yang di-setting toko.
export default function CountdownTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;

    const expiryTime = new Date(expiresAt).getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = expiryTime - now;
      return difference > 0 ? difference : 0;
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Guard: kalau data lama/kosong belum punya expired_at, jangan render apa-apa
  // daripada nampilin countdown yang salah
  if (!expiresAt) return null;

  const isExpired = timeLeft <= 0;

  // FIX: sebelumnya minutes di-modulo 1 jam, jadi timeout > 60 menit
  // (sekarang bisa di-setting seller) bakal salah tampil (mis. 90 menit jadi "30:00").
  // Dihitung dari total detik biar gak ada batas atas.
  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedCountdown = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  return (
    <div
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
        isExpired
          ? "bg-red-100 text-red-700"
          : "bg-orange-100 text-orange-700 animate-pulse"
      }`}
      aria-live="polite"
    >
      <svg
        className="mr-1.5 h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {isExpired ? "Kadaluarsa" : formattedCountdown}
    </div>
  );
}
