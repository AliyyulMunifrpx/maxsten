import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Timer, StickyNote, ImageOff, X } from "lucide-react";
import { useQueueDetail, useCancelQueueBuyer } from "../../hooks/buyer.js";
import { useCountdown, formatCountdown } from "../../lib/countdown.js";
import CancelOrderModal from "./cancel-order-modal.jsx";
import { RevealButton } from "./../reveal-button";
import { useSocket } from "../../hooks/socket.js";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  BELUM_BAYAR: {
    label: "Belum Bayar",
    badgeClass: "bg-[#C0FE04]/20 text-[#C0FE04]",
    boxClass: "bg-[#C0FE04]",
  },
  DIPROSES: {
    label: "Sedang Diproses",
    badgeClass: "bg-blue-400/20 text-blue-400",
    boxClass: "bg-blue-400",
  },
  SELESAI: {
    label: "Selesai",
    badgeClass: "bg-green-500/20 text-green-500",
    boxClass: "bg-green-500",
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    badgeClass: "bg-red-400/20 text-red-400",
    boxClass: "bg-red-400",
  },
};

function parseAddons(selectedAddons) {
  if (!selectedAddons) return [];
  if (typeof selectedAddons === "string") {
    try {
      return JSON.parse(selectedAddons);
    } catch {
      return [];
    }
  }
  return Array.isArray(selectedAddons) ? selectedAddons : [];
}

export default function OrderDetailModal({ queueId, onClose, onCanceled }) {
  const { storeId } = useParams();
  const { data, isLoading, isError, error } = useQueueDetail(storeId, queueId);
  const cancelQueue = useCancelQueueBuyer(storeId, queueId);
  const socket = useSocket();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const queryClient = useQueryClient();
  const queue = data?.data;

  const config = queue
    ? (STATUS_CONFIG[queue.status] ?? STATUS_CONFIG.BELUM_BAYAR)
    : null;

  const remainingMs = useCountdown(
    queue?.status === "BELUM_BAYAR" ? queue.expired_at : null,
    queue?.server_now,
  );

  const isExpiringSoon = remainingMs !== null && remainingMs < 5 * 60 * 1000;
  const canCancel = queue?.status === "BELUM_BAYAR";

  function handleSmartClose() {
    if (queue?.status === "SELESAI" || queue?.status === "DIBATALKAN") {
      onCanceled?.();
    } else {
      onClose();
    }
  }

  function handleCancelConfirm(reason) {
    setActionError("");
    cancelQueue.mutate(reason, {
      onSuccess: () => {
        setCancelOpen(false);
        onCanceled?.();
      },
      onError: (err) =>
        setActionError(
          err?.response?.data?.errors || "Gagal membatalkan pesanan.",
        ),
    });
  }

  if (isLoading || isError || !queue) {
    const handleEmergencyClose = () => {
      if (isError || (!isLoading && !queue)) {
        onCanceled?.();
      } else {
        handleSmartClose();
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex flex-col justify-end lg:justify-center lg:items-center bg-black/70 p-0 lg:p-[40px]"
        onClick={handleEmergencyClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-center bg-[#1e1e1e] h-[40vh] lg:h-auto lg:min-h-[40vh] lg:max-w-[500px] rounded-t-[20px] lg:rounded-xl shadow-2xl relative"
        >
          {isLoading ? (
            <p className="text-[14px] text-white/50">Memuat detail...</p>
          ) : (
            <p className="text-[14px] text-red-400">
              {error?.response?.data?.errors || "Pesanan gak ditemukan."}
            </p>
          )}
          <button
            onClick={handleEmergencyClose}
            className="absolute top-[16px] right-[16px] h-[32px] w-[32px] bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col justify-end backdrop-blur-md lg:justify-center lg:items-center bg-black/70 p-0 lg:p-[40px]"
      onClick={handleSmartClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full flex flex-col bg-[#1e1e1e] max-h-[90vh] lg:h-auto lg:max-h-[85vh] lg:max-w-[500px] rounded-t-[20px] lg:rounded-xl overflow-hidden shadow-2xl relative"
      >
        <div className="flex items-center justify-between px-[16px] pt-[16px] pb-[12px] lg:px-[24px] lg:pt-[24px] border-b border-white/10 shrink-0 bg-[#1e1e1e] z-10">
          <p className="text-[18px] font-bold text-white">Detail Pesanan</p>
          <button
            onClick={handleSmartClose}
            className="flex items-center justify-center h-[32px] w-[32px] bg-white/10 text-white hover:bg-white/20 transition-colors rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-[16px] p-[16px] lg:p-[24px] overflow-y-auto">
          {actionError && (
            <div className="px-[12px] py-[8px] bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] rounded shrink-0">
              {actionError}
            </div>
          )}

          <div className="flex flex-col gap-[16px] bg-white/5 border border-white/10 p-[16px] rounded-none shrink-0">
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center justify-center h-[56px] w-[56px] rounded-lg ${config.boxClass}`}
              >
                <p className="text-[22px] font-bold text-[#1e1e1e]">
                  {String(queue.queue_number ?? 0).padStart(3, "0")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-[4px]">
                <span
                  className={`text-[11px] font-bold px-[8px] py-[2px] rounded-full ${config.badgeClass}`}
                >
                  {config.label}
                </span>
                {queue.status === "BELUM_BAYAR" && (
                  <div
                    className={`flex items-center gap-[4px] mt-[2px] ${isExpiringSoon ? "text-red-400" : "text-white/70"}`}
                  >
                    <Timer size={14} />
                    <p className="font-bold text-[13px]">
                      {formatCountdown(remainingMs)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="h-[1px] w-full bg-white/10" />

            <div className="flex flex-col gap-[12px]">
              {queue.queueDetails?.map((detail) => {
                const addons = parseAddons(detail.selected_addons);
                return (
                  <div key={detail.id} className="flex gap-[12px]">
                    <div className="h-[48px] w-[48px] shrink-0 bg-white/10 overflow-hidden rounded">
                      {detail.product?.image_url ? (
                        <img
                          src={detail.product.image_url}
                          alt={detail.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageOff className="text-white/30" size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] capitalize text-white">
                        <span className="text-white/40">
                          {detail.quantity}x
                        </span>{" "}
                        {detail.product?.name}
                      </p>
                      {detail.variant?.name && (
                        <p className="text-[12px] text-white/50">
                          {detail.variant.name}
                        </p>
                      )}
                      {addons.length > 0 && (
                        <p className="text-[11px] text-white/30">
                          +{" "}
                          {addons
                            .map((a) => a.name)
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {queue.note && (
              <div className="flex items-start gap-[6px] text-[12px] text-white/50 bg-black/20 p-[8px] rounded mt-[4px]">
                <StickyNote size={12} className="mt-[2px] shrink-0" />
                <p>{queue.note}</p>
              </div>
            )}
            {queue.status === "DIBATALKAN" && queue.cancellation_reason && (
              <div className="bg-red-500/10 p-[8px] rounded border border-red-500/20 mt-[4px]">
                <p className="text-[12px] text-red-400">
                  <span className="font-bold">Alasan dibatalkan:</span> <br />
                  {queue.cancellation_reason}
                </p>
              </div>
            )}
            <div className="h-[1px] w-full bg-white/10" />
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-white/50">Total Pembayaran</p>
              <p className="text-[18px] font-bold text-[#C0FE04]">
                Rp{Number(queue.total_price).toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>

        {canCancel && (
          <div className="bg-[#1e1e1e] border-t border-white/10 p-[16px] lg:p-[20px] shrink-0 z-10">
            <RevealButton
              className="w-full"
              onClick={() => setCancelOpen(true)}
              label="Batalkan Pesanan"
              bgBefore="bg-red-500"
              bgAfter="bg-white"
            ></RevealButton>
          </div>
        )}
      </motion.div>

      <CancelOrderModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        isPending={cancelQueue.isPending}
      />
    </motion.div>
  );
}
