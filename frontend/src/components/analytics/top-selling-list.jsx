// src/components/analytics/top-selling-list.jsx
import { motion } from "framer-motion";

export default function TopSellingList({ rankings, pagination, onPageChange }) {
  return (
    <div className="flex flex-col  gap-[12px]">
      {rankings.length === 0 ? (
        <div className="border border-white/10 p-[32px] text-center">
          <p className="text-[13px] text-white/30">Belum ada data penjualan.</p>
        </div>
      ) : (
        /* Table Container - overflow-x-auto agar aman di mobile */
        <div className="w-full overflow-x-auto border border-white/10">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-white/5 text-white/50 text-[11px] uppercase tracking-wider">
                <th className="py-[10px] px-[12px] font-medium w-[70px] border-b border-white/10 text-center">
                  Rank
                </th>
                <th className="py-[10px] px-[12px] font-medium border-b border-white/10">
                  Nama Produk
                </th>
                <th className="py-[10px] px-[12px] font-medium w-[120px] border-b border-white/10 text-right">
                  Terjual
                </th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((item, index) => (
                <motion.tr
                  key={item.product_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }} // Efek muncul berurutan
                  className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors duration-300"
                >
                  <td className="py-[12px] px-[12px] text-[13px] font-bold text-[#C0FE04] text-center group-hover:opacity-80 transition-opacity duration-300">
                    #{item.rank}
                  </td>
                  <td className="py-[12px] px-[12px] text-[13px] text-white/80 capitalize group-hover:text-white transition-colors duration-300">
                    {item.name}
                  </td>
                  <td className="py-[12px] px-[12px] text-[12px] text-white/50 text-right group-hover:text-white/70 transition-colors duration-300">
                    {item.totalQuantity}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination - Disesuaikan dengan gaya dari HistoryList */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-[4px]">
          <p className="text-[12px] text-white/40">
            Hal. {pagination.currentPage} dari {pagination.totalPages}
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
