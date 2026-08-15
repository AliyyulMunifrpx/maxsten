// src/components/buyer/cancel-order-modal.jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { RevealButton } from "../reveal-button.jsx";

export default function CancelOrderModal({
  open,
  onClose,
  onConfirm,
  isPending,
}) {
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-[16px] backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] bg-[#1e1e1e] border border-white/10"
          >
            <div className="flex items-center justify-between p-[16px] border-b border-white/10">
              <p className="text-white text-[15px] font-bold">
                Batalkan Pesanan
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
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Kenapa mau dibatalkan?"
                className="bg-white/5 border border-white/10 text-white text-[13px] px-[10px] py-[8px] focus:outline-none focus:border-[#C0FE04] resize-none"
              />
              <div className="flex gap-[8px]">
                <RevealButton
                  type="button"
                  onClick={handleClose}
                  disable={isPending}
                  label="Batal"
                  bgBefore="bg-white/10"
                  textBefore="text-white"
                  bgAfter="bg-red-500"
                  textAfter="text-white"
                  className="flex-1 rounded-none"
                />

                <RevealButton
                  type="button"
                  onClick={handleConfirm}
                  disable={isPending || !reason.trim()}
                  label={isPending ? "Membatalkan..." : "Ya, Batalkan"}
                  bgBefore="bg-red-500"
                  textBefore="text-white"
                  bgAfter="bg-white"
                  textAfter="text-[#1e1e1e]"
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
