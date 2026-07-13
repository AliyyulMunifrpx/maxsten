import { useState, useEffect } from "react";

// Komponen ini HANYA mengurus waktu, sehingga re-render terisolasi di sini saja.
export default function CountdownTimer({ createdAt }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!createdAt) return;

    const createdAtTime = new Date(createdAt).getTime();
    const expiryTime = createdAtTime + 30 * 60 * 1000; 

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
  }, [createdAt]);

  const isExpired = timeLeft <= 0;
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
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
      <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {isExpired ? "Kadaluarsa" : formattedCountdown}
    </div>
  );
}