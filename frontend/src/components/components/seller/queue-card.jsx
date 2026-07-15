import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { editStatusQueue, getCancelReasons } from "../../../lib/sellerApi.js";

const STATUS_STYLES = {
  MENUNGGU: { bg: "#F1EFE9", fg: "#6B6558" },
  DIPROSES: { bg: "#FCEFDA", fg: "#9C6A16" },
  SELESAI: { bg: "#E7F3EC", fg: "#147356" },
  DIBATALKAN: { bg: "#FBEAE7", fg: "#B23A2E" },
};

export default function QueueCard({ queue, isPinned }) {
  const queueId = queue.id;
  const queryClient = useQueryClient();

  // State untuk mode pembatalan
  const [isCancelMode, setIsCancelMode] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // Fetch data template alasan pembatalan dari API
  const { data: cancelReasons = [] } = useQuery({
    queryKey: ["cancelReasons"],
    queryFn: getCancelReasons, // Pastikan lu bikin fungsi ini di sellerApi.js
    enabled: isCancelMode, // Cuma nge-fetch kalau penjual klik tombol Batal biar hemat kuota
  });

  const { mutate: mutateQueueStatus, isPending } = useMutation({
    mutationFn: editStatusQueue,
    onSuccess: () => {
      toast.success("Status pesanan berhasil diubah");
      setIsCancelMode(false);
      setSelectedReason("");
      setCustomReason("");
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStoreMe"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.errors || "Gagal mengubah status pesanan.",
      );
    },
  });

  function handleEditStatus(targetStatus, reasonStr = undefined) {
    // Pastikan API editStatusQueue di sellerApi.js lu nerima parameter 'reason' juga ya
    mutateQueueStatus({
      status: targetStatus,
      queueId,
      reason: reasonStr,
    });
  }

  function submitCancel() {
    // Tentukan alasan final (dari dropdown atau ketikan custom)
    const finalReason =
      selectedReason === "OTHER" ? customReason : selectedReason;
    handleEditStatus("DIBATALKAN", finalReason || undefined);
  }

  const statusStyle = STATUS_STYLES[queue.status] || STATUS_STYLES.MENUNGGU;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 ${
        isPinned
          ? "border-[#C98A1F] scale-[1.02] ring-4 ring-[#C98A1F]/20"
          : "border-[#E4E1D8]"
      }`}
    >
      {isPinned && (
        <div className="absolute right-0 top-0 rounded-bl-lg bg-[#C98A1F] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          Sedang Dipilih
        </div>
      )}

      <span className="absolute left-[-8px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#FAF9F6]" />
      <span className="absolute right-[-8px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#FAF9F6]" />

      <div className="flex items-center justify-between p-4 pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#B0AA9B]">
            Antrean
          </p>
          <h3 className="font-mono text-2xl font-bold leading-none text-[#1C2321]">
            #{queue.queue_number}
          </h3>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.fg }}
        >
          {queue.status}
        </span>
      </div>

      <div className="flex items-center justify-between px-4 text-sm text-[#8A8375]">
        <span>{new Date(queue.created_at).toLocaleString("id-ID")}</span>
        <span className="font-mono font-semibold text-[#1C2321]">
          Rp {queue.total_price.toLocaleString("id-ID")}
        </span>
      </div>

      <div
        className="mx-4 my-3 h-px"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #D8D3C4 0 8px, transparent 8px 14px)",
        }}
        aria-hidden="true"
      />

      {queue.note && (
        <div className="mx-4 mb-4 rounded-xl border border-[#FCEFDA] bg-[#FFF8ED] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#9C6A16]">
            <span>📝</span> Catatan Pembeli
          </p>
          <p className="mt-1 text-sm font-medium leading-snug text-[#1C2321]">
            "{queue.note}"
          </p>
        </div>
      )}

      {/* Bagian Produk dibuat flex-grow biar layout tombol di bawah tetep sejajar antar kartu */}
      <div className="px-4 flex-grow">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#B0AA9B]">
          Produk
        </h4>
        <div className="space-y-1.5">
          {queue.queueDetails.map((item) => {
            const itemPrice =
              item.product.price + (item.variant?.additional_price || 0);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-[#FAF9F6] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-[#1C2321]">
                    {item.product.name}
                  </p>
                  {item.variant && (
                    <p className="text-xs font-semibold text-[#C98A1F]">
                      Varian: {item.variant.name}
                    </p>
                  )}
                  <p className="text-xs text-[#8A8375]">Qty: {item.quantity}</p>
                </div>
                <p className="font-mono text-sm font-semibold text-[#1C2321]">
                  Rp {(itemPrice * item.quantity).toLocaleString("id-ID")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTION AREA */}
      <div className="p-4 pt-4 mt-auto">
        {/* Kalau penjual klik Batalkan, muncul form ini di dalam kartu */}
        {isCancelMode ? (
          <div className="rounded-xl border border-[#F1CFC7] bg-[#FBEAE7] p-3 shadow-sm transition-all">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#B23A2E]">
              Pilih Alasan Pembatalan
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-[#E4E1D8] bg-white p-2 text-sm text-[#1C2321] outline-none focus:border-[#B23A2E] disabled:opacity-60"
            >
              <option value="" disabled>
                -- Pilih Alasan --
              </option>
              {cancelReasons.map((cr) => (
                <option key={cr.id} value={cr.reason}>
                  {cr.reason}
                </option>
              ))}
              <option value="OTHER">Lainnya (Ketik Manual)...</option>
            </select>

            {selectedReason === "OTHER" && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Ketik alasan pembatalan di sini..."
                rows="2"
                disabled={isPending}
                className="mt-2 w-full resize-none rounded-lg border border-[#E4E1D8] bg-white p-2 text-sm text-[#1C2321] outline-none transition focus:border-[#B23A2E] disabled:opacity-60"
              />
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setIsCancelMode(false);
                  setSelectedReason("");
                  setCustomReason("");
                }}
                disabled={isPending}
                className="flex-1 rounded-lg border border-[#B23A2E]/30 bg-white py-1.5 text-xs font-bold text-[#B23A2E] transition hover:bg-[#FBEAE7] disabled:opacity-50"
              >
                Kembali
              </button>
              <button
                onClick={submitCancel}
                disabled={
                  isPending ||
                  !selectedReason ||
                  (selectedReason === "OTHER" && !customReason.trim())
                }
                className="flex-1 rounded-lg bg-[#B23A2E] py-1.5 text-xs font-bold text-white transition hover:bg-[#9B3126] disabled:opacity-50"
              >
                {isPending ? "Tunggu..." : "Konfirmasi Batal"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsCancelMode(true)}
              disabled={
                isPending ||
                queue.status === "SELESAI" ||
                queue.status === "DIBATALKAN"
              }
              className="flex-1 rounded-lg bg-[#B23A2E] py-2 text-sm font-semibold text-white transition hover:bg-[#9B3126] disabled:opacity-50"
            >
              Batalkan
            </button>

            {queue.status === "DIPROSES" ? (
              <button
                onClick={() => handleEditStatus("SELESAI")}
                disabled={isPending}
                className="flex-1 rounded-lg bg-[#147356] py-2 text-sm font-semibold text-white transition hover:bg-[#0F5C44] disabled:opacity-50"
              >
                Selesai
              </button>
            ) : (
              <button
                onClick={() => handleEditStatus("DIPROSES")}
                disabled={
                  isPending ||
                  queue.status === "SELESAI" ||
                  queue.status === "DIBATALKAN"
                }
                className="flex-1 rounded-lg bg-[#C98A1F] py-2 text-sm font-semibold text-white transition hover:bg-[#AD7419] disabled:opacity-50"
              >
                Proses
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
