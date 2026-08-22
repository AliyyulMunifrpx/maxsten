// src/components/analytics/traffic-week-view.jsx
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import TrafficDailyChart from "./traffic-daily-chart.jsx";

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Kelompokkan revenueDaily (per-tanggal) jadi per-minggu kalender (Minggu-Sabtu).
// Minggu pertama/terakhir bisa parsial kalau bulan gak mulai/berakhir pas hari Minggu/Sabtu —
// itu ditandai isPartial, BUKAN diisi hari palsu dari bulan lain.
function buildWeeks(revenueDaily, month, year) {
  if (!revenueDaily?.length) return [];

  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Minggu
  const weeksMap = new Map();

  revenueDaily.forEach((entry) => {
    const dayOfMonth = Number(entry.label);
    const date = new Date(year, month - 1, dayOfMonth);
    const weekday = date.getDay();
    const weekIndex = Math.floor((dayOfMonth - 1 + firstWeekday) / 7);

    if (!weeksMap.has(weekIndex)) weeksMap.set(weekIndex, []);
    weeksMap.get(weekIndex).push({
      dayOfMonth,
      weekday,
      dayName: DAY_NAMES_SHORT[weekday],
      pesanan: entry.pesanan,
    });
  });

  return Array.from(weeksMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekIndex, days], i) => {
      days.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
      const first = days[0].dayOfMonth;
      const last = days[days.length - 1].dayOfMonth;
      return {
        weekIndex,
        label: `Minggu ${i + 1}`,
        rangeLabel: first === last ? `${first}` : `${first}–${last}`,
        isPartial: days.length < 7,
        days,
      };
    });
}

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

export default function TrafficWeekView({
  revenueDaily,
  trafficDaily,
  month,
  year,
}) {
  const [mode, setMode] = useState("month"); // "month" | "week"
  const [selectedWeek, setSelectedWeek] = useState(0);

  const weeks = useMemo(
    () => buildWeeks(revenueDaily, month, year),
    [revenueDaily, month, year],
  );

  const activeWeek = weeks[selectedWeek];
  const weekChartData = activeWeek
    ? activeWeek.days.map((d) => ({
        label: `${d.dayName} ${d.dayOfMonth}`,
        pesanan: d.pesanan,
      }))
    : [];
  const hasWeekData = weekChartData.some((d) => d.pesanan > 0);

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-center justify-between flex-wrap gap-[8px]">
        <p className="text-[13px] font-bold text-white">Traffic per Hari</p>

        <div className="flex gap-[6px]">
          <button
            onClick={() => setMode("month")}
            className={`px-[10px] py-[4px] text-[11px] font-medium transition-colors ${
              mode === "month"
                ? "bg-[#C0FE04] text-[#1e1e1e]"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            Seluruh Bulan
          </button>
          <button
            onClick={() => setMode("week")}
            className={`px-[10px] py-[4px] text-[11px] font-medium transition-colors ${
              mode === "week"
                ? "bg-[#C0FE04] text-[#1e1e1e]"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            Per Minggu
          </button>
        </div>
        <div className="h-[1px] w-full bg-white/10"></div>
      </div>

      {mode === "week" && weeks.length > 0 && (
        <div className="flex gap-[6px] flex-wrap">
          {weeks.map((w, i) => (
            <button
              key={w.weekIndex}
              onClick={() => setSelectedWeek(i)}
              className={`px-[10px] py-[4px] text-[11px] font-medium border transition-colors ${
                selectedWeek === i
                  ? "bg-[#C0FE04]/20 text-[#C0FE04] border-[#C0FE04]/50"
                  : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
              }`}
            >
              {w.label} ({w.rangeLabel}){w.isPartial && "*"}
            </button>
          ))}
        </div>
      )}

      {mode === "month" ? (
        <TrafficDailyChart data={trafficDaily} />
      ) : (
        <div className="w-full h-[220px]">
          {hasWeekData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekChartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255,255,255,0.08)"
                />
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
                Belum ada transaksi di minggu ini
              </p>
            </div>
          )}
        </div>
      )}

      {mode === "week" && weeks.some((w) => w.isPartial) && (
        <p className="text-[11px] text-white/30">
          * Minggu ini cuma sebagian hari, gak penuh 7 hari (potongan awal/akhir
          bulan).
        </p>
      )}
    </div>
  );
}
