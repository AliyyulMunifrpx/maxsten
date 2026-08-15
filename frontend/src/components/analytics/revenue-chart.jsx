// src/components/analytics/revenue-chart.jsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion"; // Tambahkan Framer Motion

// 1. Animasi untuk Tooltip agar munculnya mulus (tidak kaku)
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { omzet, pesanan } = payload[0].payload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="bg-[#1e1e1e] border border-white/10 px-[10px] py-[6px] shadow-xl rounded-none pointer-events-none"
    >
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="text-[13px] font-bold text-[#C0FE04]">
        Rp{Number(omzet).toLocaleString("id-ID")}
      </p>
      <p className="text-[11px] text-white/40">{pesanan} pesanan</p>
    </motion.div>
  );
}

// 2. Custom titik (dot) saat di-hover agar ada efek "Radar/Pulse" bernafas
const CustomActiveDot = (props) => {
  const { cx, cy } = props;
  return (
    <g>
      {/* Lingkaran luar yang mengembang dan memudar berulang kali */}
      <circle cx={cx} cy={cy} r={8} fill="#C0FE04" fillOpacity={0.3}>
        <animate
          attributeName="r"
          from="4"
          to="12"
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="fill-opacity"
          from="0.6"
          to="0"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Lingkaran dalam (inti) */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#C0FE04"
        stroke="#1e1e1e"
        strokeWidth={2}
      />
    </g>
  );
};

export default function RevenueChart({ data = [] }) {
  const hasData = data.some((d) => d.omzet > 0 || d.pesanan > 0);

  return (
    <div className="w-full h-full">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 12, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C0FE04" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#C0FE04" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />

            {/* 3. Kustomisasi kursor hover (garis pembantu vertikal) */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "#C0FE04",
                strokeWidth: 1,
                strokeDasharray: "4 4",
                opacity: 0.3,
              }}
            />

            <Area
              type="monotone"
              dataKey="omzet"
              stroke="#C0FE04"
              strokeWidth={2}
              fill="url(#revenueFill)"
              activeDot={<CustomActiveDot />} // Pasang custom dot di sini
              animationDuration={1500} // Animasi garis merayap saat pertama kali di-load
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <p className="text-[13px] text-white/30">
            Belum ada transaksi di bulan ini
          </p>
        </div>
      )}
    </div>
  );
}
