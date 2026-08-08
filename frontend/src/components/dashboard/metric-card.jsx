import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export default function MetricCard({
  icon: Icon,
  name,
  value,
  trend,
  color,
  format,
  inverseTrend = false, // Bisa dilempar dari parent jika butuh manual
}) {
  const isUp = trend > 0;
  const isDown = trend < 0;

  // Deteksi otomatis metrik negatif dari nama (kalau mengandung kata cancel/batal)
  const nameLower = name?.toLowerCase() || "";
  const isNegativeMetric =
    inverseTrend || nameLower.includes("cancel") || nameLower.includes("batal");

  const TrendIcon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;

  // Logic warna trend disesuaikan
  let trendColor = "text-gray-400";
  if (isUp) {
    // Jika naik: metrik negatif jadi merah, metrik biasa jadi hijau
    trendColor = isNegativeMetric ? "text-red-400" : "text-green-500";
  } else if (isDown) {
    // Jika turun: metrik negatif jadi hijau, metrik biasa jadi merah
    trendColor = isNegativeMetric ? "text-green-500" : "text-red-500";
  }

  const formattedValue =
    format === "currency"
      ? `Rp${Number(value).toLocaleString("id-ID")}`
      : Number(value).toLocaleString("id-ID");

  const colorStyles = {
    yellow: {
      bg: "bg-yellow-400/10",
      text: "text-yellow-400",
      gradient: "from-yellow-400/0 to-yellow-400/30",
    },
    green: {
      bg: "bg-green-400/10",
      text: "text-green-400",
      gradient: "from-green-400/0 to-green-400/30",
    },
    red: {
      bg: "bg-red-400/10",
      text: "text-red-400",
      gradient: "from-red-400/0 to-red-400/30",
    },
    blue: {
      bg: "bg-blue-400/10",
      text: "text-blue-400",
      gradient: "from-blue-400/0 to-blue-400/30",
    },
  };

  const theme = colorStyles[color] || colorStyles.yellow;

  return (
    <div className="group relative w-full h-[128px] flex flex-col justify-center bg-white/5 border-1 border-white/10 p-[16px] overflow-hidden cursor-pointer">
      <div
        className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none`}
      ></div>

      <div className="relative z-10 flex gap-[16px] items-center mb-[16px]">
        <div
          className={`h-[48px] w-[48px] ${theme.bg} rounded-md flex items-center justify-center shadow-inner`}
        >
          {Icon && <Icon className={`h-[24px] w-[24px] ${theme.text}`} />}
        </div>
        <div className="flex flex-col text-white">
          <p className="font-medium text-[16px] text-white/50 capitalize">
            {name}
          </p>
          <p className="font-bold text-[24px] tracking-wide">
            {formattedValue}
          </p>
        </div>
      </div>

      <div
        className={`relative z-10 flex items-center justify-center border-t-1 border-white/10 pt-[8px] gap-[8px] text-[16px] ${trendColor}`}
      >
        <TrendIcon size={16} strokeWidth={3} />
        <p className="font-bold">
          {trend === 0 ? "Stabil" : `${Math.abs(trend)}%`}
        </p>
        <p className="text-white/40 font-normal">vs Kemarin</p>
      </div>
    </div>
  );
}
