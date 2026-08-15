// src/components/analytics/top-addons-list.jsx
import { motion } from "framer-motion";

export default function TopAddonsList({ addons = [] }) {
  return (
    <div className="flex flex-col  gap-[8px]">
      {addons.length === 0 ? (
        <div className="border border-white/10 p-[32px] text-center">
          <p className="text-[13px] text-white/30">Belum ada data addon.</p>
        </div>
      ) : (
        /* Table Container - overflow-x-auto agar aman di mobile */
        <div className="w-full overflow-x-auto border border-white/10">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-white/5 text-white/50 text-[11px] uppercase tracking-wider">
                <th className="py-[10px] px-[12px] font-medium border-b border-white/10">
                  Nama Addon
                </th>
                <th className="py-[10px] px-[12px] font-medium w-[120px] border-b border-white/10 text-right">
                  Terjual
                </th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon, index) => (
                <motion.tr
                  key={addon.name || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }} // Efek muncul berurutan
                  className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors duration-300"
                >
                  <td className="py-[12px] px-[12px] text-[13px] text-white/80 group-hover:text-white transition-colors duration-300">
                    {addon.name}
                  </td>
                  <td className="py-[12px] px-[12px] text-[12px] text-white/50 text-right group-hover:text-white/70 transition-colors duration-300">
                    {addon.totalQuantity}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
