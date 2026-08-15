import { useState } from "react";
import { motion } from "framer-motion";
import {
  Timer,
  StickyNote,
  Pin,
  ChevronRight,
  Package,
  Ban,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCountdown, formatCountdown } from "../../lib/countdown.js";
import { RevealButton } from "../reveal-button.jsx";

const STATUS_CONFIG = {
  BELUM_BAYAR: {
    label: "Belum Bayar",
    badgeClass: "bg-[#C0FE04]/10 text-[#C0FE04] border-[#C0FE04]/20",
    accentColor: "#C0FE04",
  },
  DIPROSES: {
    label: "Diproses",
    badgeClass: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    accentColor: "#60a5fa",
  },
  SELESAI: {
    label: "Selesai",
    badgeClass: "bg-green-500/10 text-green-500 border-green-500/20",
    accentColor: "#22c55e",
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    accentColor: "#f87171",
  },
};

const STEP_ORDER = ["BELUM_BAYAR", "DIPROSES", "SELESAI"];

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

export default function QueueCard({
  queue,
  serverTime,
  onAdvance,
  onCancel,
  isMutating,
  isPinned,
  isHighlighted,
}) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const config = STATUS_CONFIG[queue.status] ?? STATUS_CONFIG.BELUM_BAYAR;

  const remainingMs = useCountdown(
    queue.status === "BELUM_BAYAR" ? queue.expired_at : null,
    serverTime,
  );

  const isExpiringSoon = remainingMs !== null && remainingMs < 5 * 60 * 1000;
  const canAdvance =
    queue.status === "BELUM_BAYAR" || queue.status === "DIPROSES";
  const canCancel = canAdvance;
  const advanceLabel = queue.status === "BELUM_BAYAR" ? "Proses" : "Selesai";

  function handleProductClick(id) {
    if (!id) return;
    navigate("/products", { state: { highlightId: id } });
  }

  return (
    <motion.div
      layout
      layoutId={`queue-${queue.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        layout: { type: "spring", stiffness: 300, damping: 30 },
        duration: 0.35,
        ease: "easeOut",
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`group relative flex h-full flex-col overflow-hidden border bg-white/5 transition-all duration-300 ${
        isPinned ? "border-[#C0FE04]/50" : "border-white/[0.08]"
      } ${hovered ? "border-white/[0.16]" : ""}`}
    >
      {/* Top Accent */}
      <motion.div
        className="
    pointer-events-none
    absolute inset-x-0 top-0 z-0 h-full
    bg-gradient-to-b
    from-[var(--accent)]/0
    to-[var(--accent)]/10
  "
        style={{
          "--accent": config.accentColor,
        }}
        animate={{
          opacity: hovered || isHighlighted ? 1 : 0,
        }}
        transition={{ duration: 0.25 }}
      />

      {/* Highlight */}
      {isHighlighted && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-30 border-2"
          style={{ borderColor: config.accentColor }}
          initial={{ opacity: 0.9 }}
          animate={{ opacity: [0.9, 0.3, 0.9] }}
          transition={{ duration: 1.4, repeat: 2, ease: "easeInOut" }}
        />
      )}

      {/* ================= HEADER: TICKET STUB ================= */}
      <div className="relative z-10 flex items-start justify-between gap-[8px] p-[8px]">
        <div>
          <p className=" text-[12px] tracking-[0.2em] text-white/30">
            NO. ANTREAN
          </p>
          <p
            className="  text-[24px] font-bold tabular-nums tracking-wider"
            style={{ color: config.accentColor }}
          >
            {String(queue.queue_number ?? 0).padStart(3, "0")}
          </p>
        </div>

        <div className="flex min-w-0 flex-col items-end">
          <span
            className={`inline-flex rounded-full items-center gap-[8px] border px-[8px] text-[12px] font-semibold ${config.badgeClass}`}
          >
            {isExpiringSoon && queue.status === "BELUM_BAYAR" && (
              <span className="relative flex h-[6px] w-[6px]">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-red-400" />
              </span>
            )}
            {config.label}
          </span>

          {queue.status === "BELUM_BAYAR" && (
            <div
              className={`flex h-[32px] items-center gap-[8px] text-[12px] font-bold tabular-nums ${
                isExpiringSoon ? "text-red-400" : "text-white/40"
              }`}
            >
              <Timer size={14} />
              <span>{formatCountdown(remainingMs)}</span>
            </div>
          )}
        </div>

        {isPinned && (
          <div className="absolute right-[16px] top-[16px] flex h-[32px] w-[32px] items-center justify-center bg-[#C0FE04]/10 text-[#C0FE04]">
            <Pin size={14} className="fill-[#C0FE04]" />
          </div>
        )}
      </div>

      <div className="relative w-full h-[1px] bg-white/10 z-10 mx-auto" />
      <div className="relative z-10 flex flex-1 flex-col gap-[8px] p-[8px]">
        <div className="flex items-center gap-[8px]">
          <Package size={14} className="text-white/30" />
          <span className="text-[12px] font-semibold  text-white/30">
            Pesanan:
          </span>
          <span className="ml-auto text-[12px] text-white/30">
            {queue.queueDetails?.length ?? 0} item
          </span>
        </div>

        <div className="flex flex-col">
          {queue.queueDetails?.map((detail, index) => {
            const addons = parseAddons(detail.selected_addons);
            const productId = detail.product?.id;

            return (
              <button
                key={detail.id}
                type="button"
                disabled={!productId}
                onClick={() => handleProductClick(productId)}
                className={`group/product flex w-full gap-[8px] p-[8px] text-left transition-colors ${
                  index !== queue.queueDetails.length - 1
                    ? "border-b border-dashed border-white/[0.08]"
                    : ""
                } ${productId ? "cursor-pointer hover:bg-white/[0.03]" : "cursor-default"}`}
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden bg-white/[0.06]">
                  {detail.product?.image_url ? (
                    <img
                      src={detail.product.image_url}
                      alt={detail.product?.name ?? "Produk"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover/product:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/20">
                      <Package size={20} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-[8px]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-medium text-white transition-colors capitalize group-hover/product:text-[#C0FE04]">
                        {detail.product?.name}
                      </p>
                      {detail.variant?.name && (
                        <p className=" text-[12px] text-white/40">
                          varian: {detail.variant.name}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0  text-[12px] font-bold text-white/40">
                      {detail.quantity}×
                    </span>
                  </div>

                  {addons.length > 0 && (
                    <p className="line-clamp-2 text-[12px] leading-relaxed text-white/30">
                      +{" "}
                      {addons
                        .map((a) => a.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>

                <ChevronRight
                  size={14}
                  className="my-auto shrink-0 text-white/15 transition-all duration-200 group-hover/product:translate-x-1 group-hover/product:text-white/50"
                />
              </button>
            );
          })}
        </div>

        {queue.note && (
          <div className="flex gap-[8px] p-[8px] mt-auto bg-white/5">
            <p className="text-[12px] text-white/30">Catatan:</p>
            <p className=" text-[12px] text-white/60">{queue.note}</p>
          </div>
        )}
      </div>

      {/* Perforasi kedua — pemisah body & footer */}
      <div className="relative w-full h-[1px] bg-white/10 z-10 mx-auto" />

      {/* ================= FOOTER ================= */}
      <div className="relative flex flex-col z-10 p-[8px] gap-[8px]">
        <div className=" flex items-end justify-between">
          <p className="text-[12px]  text-white/30">Total pesanan:</p>
          <p className=" text-[16px] text-white font-bold tabular-nums">
            Rp{Number(queue.total_price).toLocaleString("id-ID")}
          </p>
        </div>

        {(canAdvance || canCancel) && (
          <div className="flex gap-[8px]">
            {canCancel && (
              <RevealButton
                type="button"
                onClick={onCancel}
                disable={isMutating}
                label="Batalkan"
                bgBefore="bg-red-500"
                textBefore="text-white"
                bgAfter="bg-white"
                textAfter="text-[#1e1e1e]"
                className="h-[48px] flex-1 rounded-none"
              />
            )}
            {canAdvance && (
              <RevealButton
                type="button"
                onClick={onAdvance}
                disable={isMutating}
                label={advanceLabel}
                bgBefore={
                  advanceLabel === "Selesai" ? "bg-blue-500" : "bg-[#C0FE04]"
                }
                textBefore={
                  advanceLabel === "Selesai" ? "text-white" : "text-[#1e1e1e]"
                }
                bgAfter="bg-white"
                textAfter="text-[#1e1e1e]"
                className="h-[48px] flex-1 rounded-none"
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
