import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Timer } from "lucide-react";
import { useNavigate } from "react-router-dom"; // PERUBAHAN: Import useNavigate pengganti Link
import CancelQueueModal from "../orders/cancel-queue-modal.jsx";
import { formatCountdown, useCountdown } from "../../lib/countdown.js";
import { RevealButton } from "../reveal-button.jsx";

const STATUS_CONFIG = {
  BELUM_BAYAR: {
    label: "Belum Bayar",
    badgeClass: "bg-[#C0FE04]/20 text-[#C0FE04]",
    action: { label: "Batalkan", className: "bg-red-500 text-[#1e1e1e]" },
  },
  DIPROSES: {
    label: "Diproses",
    badgeClass: "bg-blue-400/20 text-blue-400",
    action: { label: "Batalkan", className: "bg-red-500 text-[#1e1e1e]" },
  },
  SELESAI: {
    label: "Selesai",
    badgeClass: "bg-green-500/20 text-green-500",
    action: null,
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    badgeClass: "bg-red-500/20 text-red-500",
    action: null,
  },
};

export default function QueueCard({
  status,
  expired_at,
  server_time,
  queue_number,
  id,
  onAction,
}) {
  const navigate = useNavigate(); // PERUBAHAN: Inisialisasi navigate
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.BELUM_BAYAR;
  const remainingMs = useCountdown(expired_at, server_time);
  const isExpiringSoon = remainingMs !== null && remainingMs < 5 * 60 * 1000;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleConfirmCancel(reason) {
    try {
      setIsCancelling(true);
      await onAction?.("DIBATALKAN", reason);
      setShowCancelModal(false);
    } finally {
      setIsCancelling(false);
    }
  }

  // PERUBAHAN: Fungsi untuk navigasi card
  function handleCardClick() {
    navigate("/orders", { state: { highlightId: id } });
  }

  return (
    <motion.div
      onClick={handleCardClick} // PERUBAHAN: Aksi klik dipasang di parent
      whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
      transition={{ duration: 0.2 }}
      className="w-full grid grid-cols-3 min-h-[25%] gap-[8px] rounded-none p-[8px] cursor-pointer" // PERUBAHAN: Tambah cursor-pointer
      role="button"
    >
      <div className="h-full w-full flex items-center justify-center">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="aspect-square h-full w-full rounded-none overflow-hidden bg-[#C0FE04] flex items-center justify-center"
        >
          <p className="text-[32px] font-bold text-[#1e1e1e]">
            {String(queue_number ?? 0).padStart(3, "0")}
          </p>
        </motion.div>
      </div>

      <div className="h-full w-full col-span-2 flex gap-[16px] flex-col justify-between">
        <div className="flex justify-between items-center gap-[8px]">
          <span
            className={`text-[12px] font-bold px-[8px] py-[2px] rounded-full ${config.badgeClass}`}
          >
            {config.label}
          </span>
          {status === "BELUM_BAYAR" && (
            <div
              className={`flex items-center gap-[4px] ${
                isExpiringSoon ? "text-red-500" : "text-white/70"
              }`}
            >
              <Timer size={16} />
              <p className="font-bold text-[14px]">
                {formatCountdown(remainingMs)}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-[8px]">
          {/* PERUBAHAN: Karena card-nya sendiri sudah bisa diklik, ini otomatis bubbling ke parent */}
          <RevealButton
            type="button"
            label="Lihat Detail"
            bgBefore="bg-white/10"
            textBefore="text-white"
            bgAfter="bg-white"
            textAfter="text-[#1e1e1e]"
            className="flex-1 rounded-none"
          />

          <RevealButton
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // PERUBAHAN: Cegah event klik tembus ke parent card
              setShowCancelModal(true);
            }}
            label="Batalkan"
            bgBefore="bg-red-500"
            textBefore="text-white"
            bgAfter="bg-white"
            textAfter="text-[#1e1e1e]"
            className="flex-1 rounded-none"
          />
        </div>
      </div>

      {/* PERUBAHAN: e.stopPropagation() juga ditambahkan di prop onClick pada parent Modal jika diperlukan, 
          tapi React Portal biasanya sudah aman. */}
      <CancelQueueModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        isPending={isCancelling}
      />
    </motion.div>
  );
}
