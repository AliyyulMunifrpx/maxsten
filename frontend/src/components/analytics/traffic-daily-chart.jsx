// src/components/analytics/traffic-daily-chart.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-white/10 px-[10px] py-[6px]">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="text-[13px] font-bold text-[#C0FE04]">
        {payload[0].value} pesanan
      </p>
    </div>
  );
}

export default function TrafficDailyChart({ data = [] }) {
  const hasData = data.some((d) => d.pesanan > 0);

  return (
    <div className="w-full h-[220px]">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey="pesanan" fill="#C0FE04" radius={[2, 2, 0, 0]} />
          </BarChart>
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
