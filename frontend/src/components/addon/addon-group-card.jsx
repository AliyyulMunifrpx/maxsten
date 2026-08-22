// src/components/addon/addon-group-card.jsx
import { motion } from "framer-motion";
import { Layers } from "lucide-react";

export const addonGroupCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function AddonGroupCard({ group, onClick }) {
  const { name, addons } = group;

  // 1. Potong array addons untuk mengambil maksimal 3 item pertama
  const visibleAddons = addons?.slice(0, 3) || [];

  // 2. Hitung apakah ada sisa addon yang tidak ditampilkan
  const remainingCount = (addons?.length || 0) - 3;

  return (
    <motion.div
      variants={addonGroupCardVariants}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      onClick={onClick}
      className="group relative cursor-pointer flex flex-col gap-[12px] bg-white/5 border border-white/10 p-[16px] overflow-hidden"
    >
      {/* Background Gradient Kuning (#C0FE04) saat di-hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#C0FE04]/0 to-[#C0FE04]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none" />

      <div className="relative z-10 flex items-center gap-[8px]">
        <div className="h-[32px] w-[32px] bg-[#C0FE04]/10 flex items-center justify-center shrink-0">
          <Layers className="h-[16px] w-[16px] text-[#C0FE04]" />
        </div>
        <p className="font-bold text-white text-[14px] truncate">{name}</p>
      </div>

      <div className="relative z-10 h-[1px] w-full bg-white/10" />

      <div className="relative z-10">
        {addons?.length > 0 ? (
          <div className="flex flex-col gap-[6px]">
            {/* 3. Gunakan visibleAddons yang sudah dipotong (maksimal 3) untuk di-map */}
            {visibleAddons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between text-[13px]"
              >
                <p className="text-white/70 truncate mr-[8px]">{addon.name}</p>
                <p className="text-white/40 shrink-0">
                  {addon.price > 0
                    ? `+Rp${Number(addon.price).toLocaleString("id-ID")}`
                    : "Gratis"}
                </p>
              </div>
            ))}

            {/* 4. Jika ada sisa, tampilkan teks indikatornya */}
            {remainingCount > 0 && (
              <p className="text-[12px] text-white/40 italic mt-[2px]">
                +{remainingCount} addon lainnya...
              </p>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-white/30">
            Belum ada addon di grup ini.
          </p>
        )}
      </div>
    </motion.div>
  );
}
