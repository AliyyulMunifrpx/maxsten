// src/lib/countdown.js
import { useEffect, useState } from "react";

export function useCountdown(expiredAt, serverTime) {
  const [remainingMs, setRemainingMs] = useState(null);

  useEffect(() => {
    if (!expiredAt || !serverTime) return;
    const expiredMs = new Date(expiredAt).getTime();
    const offset = new Date(serverTime).getTime() - Date.now();

    const tick = () => {
      const estimatedServerNow = Date.now() + offset;
      setRemainingMs(Math.max(expiredMs - estimatedServerNow, 0));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiredAt, serverTime]);

  return remainingMs;
}

export function formatCountdown(ms) {
  if (ms === null) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
