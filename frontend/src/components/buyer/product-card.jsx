// src/components/buyer/product-card.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ImageOff } from "lucide-react";
import toast from "react-hot-toast"; // 1. Tambahkan import toast

export const productCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function ProductCard({ product, onOpenProduct }) {
  const { id, name, description, price, image_url, is_available, total_sold } =
    product;
  const [hovered, setHovered] = useState(false);

  const formattedPrice = `Rp${Number(price ?? 0).toLocaleString("id-ID")}`;
  const accentColor = is_available ? "#C0FE04" : "#ef4444";

  // 2. Buat handler khusus untuk klik
  const handleClick = () => {
    if (is_available) {
      onOpenProduct?.(id);
    } else {
      toast("Maaf, produk ini sedang habis", {
        icon: "🚫",
        style: {
          background: "#1e1e1e",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      });
    }
  };

  return (
    <motion.div
      variants={productCardVariants}
      whileHover={is_available ? { y: -4 } : {}}
      whileTap={is_available ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={handleClick} // 3. Gunakan handler yang baru
      className={`relative h-full flex flex-col rounded-none p-[8px] overflow-hidden gap-[8px] bg-white/5 border border-white/10 transition-opacity duration-300 ${
        is_available ? "cursor-pointer" : "opacity-30 cursor-not-allowed" // Opacity 30 sudah ada di sini
      }`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: `linear-gradient(to top, ${accentColor}26, transparent 60%)`,
        }}
        animate={{ opacity: hovered && is_available ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      />

      <div className="relative z-10 w-full aspect-square overflow-hidden bg-white/5 shrink-0">
        {image_url ? (
          <motion.img
            src={image_url}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
            animate={{ scale: hovered && is_available ? 1.06 : 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="text-white/30" size={24} />
          </div>
        )}

        {!is_available && (
          <span className="absolute top-[8px] left-[8px] z-20 text-[11px] font-bold px-[8px] py-[2px] rounded-full bg-red-500/90 text-white">
            Habis
          </span>
        )}

        {is_available && (
          <motion.div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
            initial={false}
            animate={
              hovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }
            }
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <div
              className="flex items-center justify-center h-[40px] w-[40px] rounded-full"
              style={{ backgroundColor: accentColor }}
            >
              <ArrowUpRight className="text-[#1e1e1e]" size={18} />
            </div>
          </motion.div>
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-between gap-[8px]">
        <div className="w-full">
          <p className="font-bold text-white text-[14px] truncate capitalize">
            {name}
          </p>
          {description && (
            <p className="text-white/50 text-[12px] line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <div className="w-full flex flex-col gap-[8px]">
          <div className="h-[1px] w-full bg-white/10" />
          <div className="flex justify-between items-end">
            <p className="font-bold text-[14px]" style={{ color: accentColor }}>
              {formattedPrice}
            </p>
            {total_sold > 0 && (
              <p className="text-white/40 text-[11px] shrink-0">
                {total_sold} terjual
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
