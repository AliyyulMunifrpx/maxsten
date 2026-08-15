// src/components/analytics/stat-card.jsx
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export default function StatCard({
  label,
  value,
  trend,
  index = 0,
  inverseTrend,
}) {
  const hasTrend = trend !== undefined && trend !== null;
  const isUp = trend > 0;
  const isDown = trend < 0;
  const TrendIcon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;

  // Logika warna yang baru
  let trendColor = "text-gray-400";
  if (isUp) {
    trendColor = inverseTrend ? "text-red-400" : "text-green-500";
  } else if (isDown) {
    trendColor = inverseTrend ? "text-green-500" : "text-red-400";
  }
  return (
    <motion.div
      // 1. Muncul dari bawah
      initial={{ opacity: 0, y: 16 }}
      // 2. Animasi masuk (Punya delay berdasarkan index agar muncul berurutan)
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut", delay: index * 0.1 },
      }}
      // 3. Animasi hover (Tanpa delay agar instan dan smooth)
      whileHover={{
        y: -5,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      // 4. Animasi klik/tap (Tanpa delay)
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 },
      }}
      className="group relative w-full flex flex-col justify-between bg-white/5 border border-white/10 p-[16px] overflow-hidden cursor-pointer"
    >
      {/* Background Gradient menyala pakai warna custom #C0FE04 */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#C0FE04]/0 to-[#C0FE04]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none" />

      {/* Konten Utama */}
      <div className="relative z-10 flex flex-col gap-[4px] mb-[16px]">
        <p className="font-medium text-[13px] text-white/50 capitalize transition-colors duration-300 group-hover:text-white/80">
          {label}
        </p>
        <p className="font-bold text-[20px] tracking-wide text-white transition-transform duration-300 group-hover:translate-x-1">
          {value}
        </p>
      </div>

      {/* Area Trend dengan garis pembatas (Sama persis desain MetricCard) */}
      <div
        className={`relative z-10 flex items-center border-t border-white/10 pt-[8px] gap-[6px] text-[12px] transition-colors duration-300 group-hover:border-white/20 ${hasTrend ? trendColor : "text-white/40"}`}
      >
        {hasTrend ? (
          <>
            <TrendIcon
              size={14}
              strokeWidth={3}
              className="transition-transform duration-300 group-hover:-translate-y-1"
            />
            <p className="font-bold transition-transform duration-300 group-hover:-translate-y-1">
              {trend === 0 ? "Stabil" : `${Math.abs(trend)}%`}
            </p>
            <p className="text-white/40 font-normal">vs Bulan Lalu</p>
          </>
        ) : (
          <p className="font-normal text-white/30 italic">Tidak ada data</p>
        )}
      </div>
    </motion.div>
  );
}
