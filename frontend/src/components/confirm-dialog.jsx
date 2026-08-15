import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { RevealButton } from "./reveal-button.jsx";

export default function ConfirmDialog({
  open,
  title = "Konfirmasi",
  description = "Tindakan ini tidak bisa dibatalkan.",
  confirmText = "Hapus",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  isLoading = false,
  danger = true,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={isLoading ? undefined : onCancel}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-[16px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[400px] bg-[#1e1e1e] border border-white/10 shadow-2xl"
          >
            {/* Close */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="absolute top-[12px] right-[12px] p-[4px] text-white/30 hover:text-white transition-colors disabled:opacity-30"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="p-[20px]">
              <div className="flex gap-[12px]">
                {/* Icon */}
                <div
                  className={`shrink-0 flex items-center justify-center w-[36px] h-[36px] ${
                    danger
                      ? "bg-red-500/10 text-red-500"
                      : "bg-[#C0FE04]/10 text-[#C0FE04]"
                  }`}
                >
                  <AlertTriangle size={18} />
                </div>

                {/* Text */}
                <div className="flex flex-col gap-[4px] pr-[20px]">
                  <p className="text-[15px] font-bold text-white">{title}</p>

                  <p className="text-[13px] leading-[1.5] text-white/50">
                    {description}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-[8px] mt-[20px]">
                <RevealButton
                  type="button"
                  onClick={onCancel}
                  disable={isLoading}
                  label={cancelText}
                  bgBefore="bg-white/10"
                  textBefore="text-white"
                  bgAfter="bg-red-500"
                  textAfter="text-white"
                  className="flex-1 rounded-none"
                />

                <RevealButton
                  type="button"
                  onClick={onConfirm}
                  disable={isLoading}
                  label={isLoading ? "Memproses..." : confirmText}
                  bgBefore={danger ? "bg-red-500" : "bg-[#C0FE04]"}
                  textBefore={danger ? "text-white" : "text-[#1e1e1e]"}
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
