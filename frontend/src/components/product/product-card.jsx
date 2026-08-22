// src/components/product/product-card.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export const productCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function ProductCard({
  product,
  onOpenDetail,
  onToggleAvailability,
  isHighlighted,
}) {
  const { id, name, description, price, image_url, is_available, total_sold } =
    product;
  const [hovered, setHovered] = useState(false);

  const formattedPrice = `Rp${Number(price ?? 0).toLocaleString("id-ID")}`;
  const accentColor = is_available ? "#C0FE04" : "#fb5555";

  return (
    <motion.div
      variants={productCardVariants}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onOpenDetail?.(id)}
      className={`relative h-full flex flex-col rounded-none p-[8px] overflow-hidden gap-[8px] bg-white/5 border border-white/10 cursor-pointer transition-opacity duration-300 ${
        is_available ? "" : "opacity-60"
      }`}
    >
      {/* Gradasi saat hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `linear-gradient(to top, ${accentColor}4D, transparent 70%)`,
        }}
        animate={{ opacity: hovered || isHighlighted ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      />

      {/* Gambar */}
      <div className="relative w-full aspect-square overflow-hidden bg-white/5 shrink-0">
        <motion.img
          src={image_url}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          animate={{ scale: hovered || isHighlighted ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        />

        {!is_available && (
          <span className="absolute top-[8px] left-[8px] z-20 text-[11px] font-bold px-[8px] py-[2px] rounded-full bg-red-500/90 text-white">
            Habis
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAvailability?.(id, !is_available);
          }}
          className={`absolute top-[8px] right-[8px] flex items-center z-30 h-[20px] w-[36px] rounded-full transition-colors ${
            is_available ? "bg-green-500" : "bg-white/20"
          }`}
          aria-label={is_available ? "Tandai habis" : "Tandai tersedia"}
        >
          <span
            className={`h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${
              is_available ? "translate-x-[18px]" : "translate-x-[2px]"
            }`}
          />
        </button>

        {/* Lingkaran arrow, saat hover */}
        <motion.div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          initial={false}
          animate={
            hovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }
          }
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          {/* ANIMASI LINGKARAN MENGEMBANG/MENGEMPIS */}
          <motion.div
            className="flex items-center justify-center h-[48px] w-[48px] rounded-full"
            style={{ backgroundColor: accentColor }}
            animate={
              hovered
                ? { scale: [1, 1.12, 1] } // Berubah dari ukuran asli -> membesar 12% -> kembali ke asli
                : { scale: 1 }
            }
            transition={{
              duration: 1.5,
              repeat: hovered ? Infinity : 0, // Mengulang terus-menerus selama hover
              ease: "easeInOut",
            }}
          >
            {/* ANIMASI ARROW NAIK/TURUN */}
            <motion.div
              animate={
                hovered
                  ? { x: [0, 2.5, 0], y: [0, -2.5, 0] } // x membesar (ke kanan), y mengecil (ke atas)
                  : { x: 0, y: 0 }
              }
              transition={{
                duration: 1.5,
                repeat: hovered ? Infinity : 0, // Durasinya harus sama persis dengan lingkaran agar sinkron
                ease: "easeInOut",
              }}
              className="flex items-center justify-center"
            >
              <ArrowUpRight className="text-[#1e1e1e]" size={22} />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Konten */}
      <div className="relative z-20 flex flex-1 flex-col justify-between gap-[8px]">
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
          <div className="h-[1px] w-full bg-white/10"></div>
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
