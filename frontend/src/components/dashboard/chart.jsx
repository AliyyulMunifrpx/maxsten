// src/components/dashboard/peak-hour-chart.jsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-white/10 rounded-md px-[10px] py-[6px]">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="text-[13px] font-bold text-[#C0FE04]">
        {payload[0].value} pesanan
      </p>
    </div>
  );
}

export default function PeakHourChart({ hourlyTraffic = [], peakHour }) {
  const data = hourlyTraffic.map((count, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    count,
  }));

  const hasData = hourlyTraffic.some((count) => count > 0);

  return (
    <div className="aspect-[1/1] lg:h-full overflow-hidden w-full flex flex-col gap-[8px]">
      {peakHour && peakHour !== "-" && (
        <div className="flex items-center justify-between shrink-0">
          <p className="text-[12px] text-white/50">Jam Tersibuk</p>
          <p className="text-[14px] font-bold text-[#C0FE04]">{peakHour}</p>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="peakHourFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C0FE04" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#C0FE04" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="hour"
                interval={3}
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
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#C0FE04"
                strokeWidth={2}
                fill="url(#peakHourFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-[13px] text-white/30">Tidak ada transaksi</p>
          </div>
        )}
      </div>
    </div>
  );
}
