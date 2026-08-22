// src/components/analytics/history-list.jsx
import { motion } from "framer-motion";

const STATUS_TABS = [
  { value: "ALL", label: "Semua" },
  { value: "SELESAI", label: "Selesai" },
  { value: "DIBATALKAN", label: "Dibatalkan" },
];

const STATUS_BADGE = {
  SELESAI: "bg-green-500/20 text-green-500",
  DIBATALKAN: "bg-red-500/20 text-red-500",
};

function formatDate(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function LineItem({ detail }) {
  const addons = parseAddons(detail.selected_addons);
  return (
    <div className="flex items-start gap-[6px] text-[12px]">
      <span className="text-white/40 shrink-0 font-medium">
        {detail.quantity}x
      </span>
      <div className="min-w-0 flex flex-col">
        <span className="text-white/80 group-hover:text-white transition-colors capitalize duration-300">
          {detail.product?.name || "Produk tidak diketahui"}
          {detail.variant?.name && (
            <span className="text-white/40"> · {detail.variant.name}</span>
          )}
        </span>
        {addons.length > 0 && (
          <span className="text-white/40 text-[11px] mt-[2px] truncate group-hover:text-white/60 transition-colors duration-300">
            +{" "}
            {addons
              .map((a) => a.name)
              .filter(Boolean)
              .join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function HistoryList({
  history,
  pagination,
  status,
  onStatusChange,
  onPageChange,
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      {/* Header & Tabs */}
      <div className="flex justify-between items-center flex-wrap gap-[12px]">
        <p className="text-[14px] font-bold text-white">Riwayat Transaksi</p>
        <div className="flex gap-[8px]">
          {STATUS_TABS.map((tab) => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={`px-[12px] py-[6px] rounded-none text-[11px] font-medium transition-colors duration-300 ${
                status === tab.value
                  ? "bg-[#C0FE04] text-[#1e1e1e]"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="border border-white/10 p-[32px] text-center">
          <p className="text-[13px] text-white/30">
            Belum ada riwayat transaksi.
          </p>
        </div>
      ) : (
        /* Table Container - overflow-x-auto agar aman di mobile */
        <div className="w-full overflow-x-auto border border-white/10">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-white/5 text-white/50 text-[11px] uppercase tracking-wider">
                <th className="py-[10px] px-[12px] font-medium w-[140px] border-b border-white/10">
                  Tanggal
                </th>
                <th className="py-[10px] px-[12px] font-medium border-b border-white/10">
                  Detail Pesanan
                </th>
                <th className="py-[10px] px-[12px] font-medium w-[140px] border-b border-white/10">
                  Total Harga
                </th>
                <th className="py-[10px] px-[12px] font-medium w-[120px] border-b border-white/10 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }} // Animasi baris beruntun
                  className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors duration-300"
                >
                  {/* Kolom Tanggal */}
                  <td className="py-[12px] px-[12px] text-[12px] text-white/50 align-top group-hover:text-white/70 transition-colors">
                    {formatDate(row.created_at)}
                  </td>

                  {/* Kolom Detail */}
                  <td className="py-[12px] px-[12px] align-top">
                    <div className="flex flex-col gap-[6px]">
                      {row.queueDetails?.map((detail) => (
                        <LineItem key={detail.id} detail={detail} />
                      ))}
                    </div>
                  </td>

                  {/* Kolom Harga */}
                  <td className="py-[12px] px-[12px] text-[13px] font-bold text-[#C0FE04] align-top whitespace-nowrap">
                    Rp{Number(row.total_price).toLocaleString("id-ID")}
                  </td>

                  {/* Kolom Status */}
                  <td className="py-[12px] px-[12px] align-top text-right">
                    <span
                      className={`inline-block text-[10px] font-bold px-[8px] py-[3px] rounded-none whitespace-nowrap ${
                        STATUS_BADGE[row.status] || "bg-white/10 text-white/50"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-[8px]">
          <p className="text-[12px] text-white/40">
            Menampilkan halaman {pagination.currentPage} dari{" "}
            {pagination.totalPages}
          </p>
          <div className="flex gap-[8px]">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                onPageChange(Math.max(1, pagination.currentPage - 1))
              }
              disabled={pagination.currentPage <= 1}
              className="px-[12px] py-[6px] rounded-none bg-white/5 text-white/70 text-[12px] hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Prev
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                onPageChange(
                  Math.min(pagination.totalPages, pagination.currentPage + 1),
                )
              }
              disabled={pagination.currentPage >= pagination.totalPages}
              className="px-[12px] py-[6px] rounded-none bg-white/5 text-white/70 text-[12px] hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
