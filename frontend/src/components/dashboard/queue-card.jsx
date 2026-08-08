import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_CONFIG = {
  BELUM_BAYAR: {
    label: "Belum Bayar",
    badgeClass: "bg-[#D99A25]/20 text-[#D99A25]",
    action: { label: "Proses", className: "bg-[#D99A25] text-[#1e1e1e]" },
  },
  DIPROSES: {
    label: "Diproses",
    badgeClass: "bg-blue-400/20 text-blue-400",
    action: { label: "Selesai", className: "bg-green-500 text-[#1e1e1e]" },
  },
  SELESAI: {
    label: "Selesai",
    badgeClass: "bg-green-500/20 text-green-500",
    action: null,
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    badgeClass: "bg-red-400/20 text-red-400",
    action: null,
  },
};

// Hitung sisa waktu berdasarkan jam SERVER, bukan jam device user —
// offset dihitung sekali saat mount, lalu diikuti tick client per detik.
function useCountdown(expiredAt, serverTime) {
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

function formatCountdown(ms) {
  if (ms === null) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function QueueCard({
  status,
  expired_at,
  server_time,
  queue_number,
  id,
  onAction, // dipanggil dengan status tujuan, misal onAction("DIPROSES")
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.BELUM_BAYAR;
  const remainingMs = useCountdown(expired_at, server_time);
  const isExpiringSoon = remainingMs !== null && remainingMs < 5 * 60 * 1000;

  return (
    <div className="w-full grid grid-cols-3 h-[25%] hover:bg-white/10 rounded-none border-b-1 border-white/10 transition-colors">
      <div className="h-full w-full flex items-center justify-center p-[8px]">
        <div className="aspect-square h-full max-w-full rounded-none overflow-hidden bg-[#D99A25] flex items-center justify-center">
          <p className="text-[28px] font-bold text-[#1e1e1e]">
            {String(queue_number ?? 0).padStart(3, "0")}
          </p>
        </div>
      </div>

      <div className="h-full w-full col-span-2 pr-[16px] py-[10px] flex flex-col justify-between">
        <div className="flex justify-between items-center gap-[8px]">
          <span
            className={`text-[11px] font-bold px-[8px] py-[2px] rounded-full ${config.badgeClass}`}
          >
            {config.label}
          </span>
          {config.action && (
            <div
              className={`flex items-center gap-[4px] ${isExpiringSoon ? "text-red-400" : "text-white/70"}`}
            >
              <Timer size={16} />
              <p className="font-bold text-[14px]">
                {formatCountdown(remainingMs)}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-[8px]">
          <Link
            to={`/queues/${id}`}
            className="flex-1 text-center text-[14px] py-[6px] rounded-none bg-white/10 text-white hover:bg-white/20"
          >
            Lihat Detail
          </Link>
          {config.action && (
            <button
              onClick={() => onAction?.(status)}
              className={`flex-1 text-[14px] py-[6px] rounded-none font-bold ${config.action.className}`}
            >
              {config.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
