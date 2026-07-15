import { useState, useEffect } from "react";

// Tambahkan props serverNow (timestamp dari backend saat data di-fetch)
export default function CountdownTimer({ expiresAt, serverNow }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt || !serverNow) return;

    const expiryTime = new Date(expiresAt).getTime();
    const serverTime = new Date(serverNow).getTime();
    const localTimeAtFetch = new Date().getTime();
    
    // Hitung selisih jam server dan jam lokal perangkat (bisa minus kalau jam lokal lebih cepat)
    const timeOffset = serverTime - localTimeAtFetch;

    const calculateTimeLeft = () => {
      // Waktu saat ini di perangkat user
      const localNow = new Date().getTime();
      
      // Waktu saat ini versi Server (jam lokal dikoreksi dengan selisih)
      const realServerNow = localNow + timeOffset; 
      
      const difference = expiryTime - realServerNow;
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
  }, [expiresAt, serverNow]);

  if (!expiresAt) return null;

  const isExpired = timeLeft <= 0;

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