// src/components/orders/cancel-queue-modal.jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCancelReasons } from "../../hooks/cancel-reason.js";
import { RevealButton } from "../reveal-button.jsx";

export default function CancelQueueModal({
  open,
  onClose,
  onConfirm,
  isPending,
}) {
  const { data } = useCancelReasons();
  const templates = data?.data || [];
  const [reason, setReason] = useState("");

  function handleClose() {
    setReason("");
    onClose();
  }

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 z-[60] flex items-center backdrop-blur-md justify-center bg-black/70 p-[16px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[380px] bg-[#1e1e1e] border border-white/10"
          >
            <div className="flex items-center justify-between p-[16px] border-b border-white/10">
              <p className="text-white text-[15px] font-bold">
                Batalkan Antrean
              </p>
              <button
                onClick={handleClose}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-[16px] flex flex-col gap-[12px]">
              {templates.length > 0 && (
                <div className="flex flex-wrap gap-[6px]">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setReason(t.reason)}
                      className={`px-[10px] py-[6px] text-[12px] transition-colors ${
                        reason === t.reason
                          ? "bg-[#C0FE04] text-[#1e1e1e]"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {t.reason}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Tulis alasan pembatalan..."
                className="bg-white/5 border border-white/10 text-white text-[13px] px-[10px] py-[8px] focus:outline-none focus:border-[#C0FE04] resize-none"
              />

              <div className="flex gap-[8px] mt-[4px]">
                <RevealButton
                  type="button"
                  onClick={handleClose}
                  disable={isPending}
                  label="Batal"
                  bgBefore="bg-white/10"
                  textBefore="text-white text-[13px] font-medium"
                  bgAfter="bg-red-500" // Berubah jadi merah pas di-hover
                  textAfter="text-white text-[13px] font-medium"
                  className="flex-1 rounded-none"
                />

                <RevealButton
                  type="button"
                  onClick={handleConfirm}
                  disable={isPending || !reason.trim()}
                  label={isPending ? "Membatalkan..." : "Konfirmasi"}
                  bgBefore="bg-red-500" // Awalnya sudah merah
                  textBefore="text-white text-[13px] font-bold"
                  bgAfter="bg-white" // Berubah jadi putih pas di-hover
                  textAfter="text-[#1e1e1e] text-[13px] font-bold"
                  className="flex-1 rounded-none"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
