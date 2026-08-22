// src/components/analytics/ai-report-modal.jsx
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Loader2 } from "lucide-react";

export default function AIReportModal({
  open,
  onClose,
  isPending,
  report,
  error,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[55] flex items-center backdrop-blur-md justify-center bg-black/70 p-[16px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[440px] max-h-[85vh] overflow-y-auto bg-[#1e1e1e] border border-white/10"
          >
            <div className="flex items-center justify-between p-[16px] border-b border-white/10">
              <div className="flex items-center gap-[8px]">
                <Sparkles size={16} className="text-[#C0FE04]" />
                <p className="text-white text-[16px] font-bold">Laporan AI</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-[16px] flex flex-col gap-[16px]">
              {isPending && (
                <div className="flex flex-col items-center justify-center gap-[12px] py-[40px]">
                  <Loader2 size={28} className="animate-spin text-[#C0FE04]" />
                  <p className="text-[14px] text-white text-center">
                    Sedang membuat laporan...
                  </p>
                  <p className="text-[12px] text-white/40 text-center">
                    Ini bisa memakan waktu sampai 1 menit, mohon tunggu.
                  </p>
                </div>
              )}

              {error && (
                <div className="px-[12px] py-[8px] bg-red-500/10 border border-red-500/30 text-red-500 text-[13px]">
                  {error}
                </div>
              )}

              {report && (
                <div className="flex flex-col gap-[16px]">
                  <p className="text-[15px] font-bold text-white">
                    {report.greeting}
                  </p>
                  <p className="text-[13px] text-white/70 leading-relaxed">
                    {report.evaluation}
                  </p>

                  {report.recommendations?.length > 0 && (
                    <div className="flex flex-col gap-[8px]">
                      <p className="text-[12px] font-bold text-white/50 uppercase tracking-wide">
                        Rekomendasi
                      </p>
                      {report.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="flex gap-[8px] p-[10px] bg-white/5 border border-white/10"
                        >
                          <span className="text-[#C0FE04] text-[13px] font-bold shrink-0">
                            {i + 1}.
                          </span>
                          <p className="text-[13px] text-white/80">{rec}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
