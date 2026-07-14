import { useState, useMemo, useEffect, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStoreHistory } from "../../lib/sellerApi.js"; // Sesuaikan path

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// --- KOMPONEN KECIL ---

function TrendBadge({ value, inverse = false }) {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  // Jika inverse (misal pembatalan), tren naik itu merah, turun itu hijau.
  const isPositiveNumber = value >= 0;
  const isGood = inverse ? !isPositiveNumber : isPositiveNumber;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isGood ? "bg-[#E7F3EC] text-[#147356]" : "bg-[#FBEAE7] text-[#B23A2E]"
      }`}
    >
      {isPositiveNumber ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function MetricCard({
  title,
  value,
  type = "normal",
  trend,
  inverseTrend = false,
}) {
  const safeValue = value || 0;

  let displayValue = safeValue;
  let colorClass = "text-[#1C2321]";

  if (type === "money") {
    displayValue = `Rp ${safeValue.toLocaleString("id-ID")}`;
    colorClass = "text-[#147356]";
  } else if (type === "percent") {
    displayValue = `${safeValue}%`;
  } else if (type === "danger") {
    colorClass = "text-[#B23A2E]";
  }

  // Khusus untuk waktu tunggu karena formatnya string
  if (typeof value === "string") displayValue = value;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A8375]">
          {title}
        </p>
        <TrendBadge value={trend} inverse={inverseTrend} />
      </div>
      <h3 className={`font-mono text-2xl font-bold sm:text-3xl ${colorClass}`}>
        {displayValue}
      </h3>
    </div>
  );
}

function formatWaitTime(minutes) {
  const safeMinutes = minutes || 0;
  const rounded = Math.max(0, Math.round(safeMinutes));
  if (rounded < 60) return `${rounded} menit`;
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;
  if (hours < 24)
    return remainingMinutes
      ? `${hours} jam ${remainingMinutes} mnt`
      : `${hours} jam`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days} hari ${remainingHours} jam` : `${days} hari`;
}

function PaginationBar({ currentPage, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[#E4E1D8] px-5 py-4">
      <p className="text-xs text-[#8A8375]">
        Halaman <span className="font-bold text-[#1C2321]">{currentPage}</span>{" "}
        dari {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#1C2321] transition hover:bg-[#FAF9F6] disabled:opacity-30"
        >
          Sebelumn
        </button>
        <button
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#1C2321] transition hover:bg-[#FAF9F6] disabled:opacity-30"
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}

function buildMonthOptions(storeCreatedAt, currentYear, currentMonth) {
  if (!storeCreatedAt || !currentYear || !currentMonth) return [];
  const start = new Date(storeCreatedAt);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth() + 1;
  const options = [];
  let y = currentYear;
  let m = currentMonth;
  let safety = 0;
  while (
    (y > startYear || (y === startYear && m >= startMonth)) &&
    safety < 600
  ) {
    const label = new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    options.push({
      value: `${y}-${String(m).padStart(2, "0")}`,
      label,
      year: y,
      month: m,
    });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    safety += 1;
  }
  return options;
}

// --- KOMPONEN UTAMA ---

export default function StoreHistory() {
  const [selectedMonthOpt, setSelectedMonthOpt] = useState(null);
  const [selectedDay, setSelectedDay] = useState("01"); // Default filter harian

  const [page, setPage] = useState(1);
  const [topPage, setTopPage] = useState(1);
  const [txStatus, setTxStatus] = useState("ALL");
  const topLimit = 10;

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [
      "storeHistory",
      selectedMonthOpt?.year,
      selectedMonthOpt?.month,
      page,
      topPage,
      txStatus,
    ],
    queryFn: () =>
      getStoreHistory({
        month: selectedMonthOpt?.month,
        year: selectedMonthOpt?.year,
        page,
        limit: 10,
        topPage,
        topLimit,
        status: txStatus === "ALL" ? undefined : txStatus,
      }),
    keepPreviousData: true,
  });
  console.log(data)
  const meta = data?.meta;
  const summary = data?.summary;
  const charts = data?.charts;

  const monthOptions = useMemo(() => {
    if (!meta?.storeCreatedAt || !meta?.currentYear || !meta?.currentMonth)
      return [];
    return buildMonthOptions(
      meta.storeCreatedAt,
      meta.currentYear,
      meta.currentMonth,
    );
  }, [meta]);

  const selectedValue = meta
    ? `${meta.selectedYear}-${String(meta.selectedMonth).padStart(2, "0")}`
    : "";

  // Reset tanggal filter chart jam sibuk setiap kali pindah bulan
  useEffect(() => {
    if (charts?.revenueDaily?.length > 0) {
      setSelectedDay(charts.revenueDaily[0].label); // Set ke tanggal 1 (atau yg pertama ada)
    }
  }, [selectedValue, charts?.revenueDaily]);

  // Transformasi data untuk Chart Jam Sibuk sesuai tanggal yang dipilih
  const activeHourlyTraffic = useMemo(() => {
    if (!charts?.trafficHourlyByDate || !selectedDay) return [];
    const rawData =
      charts.trafficHourlyByDate[selectedDay] || Array(24).fill(0);
    return rawData.map((val, idx) => ({
      label: `${String(idx).padStart(2, "0")}:00`,
      pesanan: val,
    }));
  }, [charts, selectedDay]);

  const handleMonthChange = (value) => {
    const [y, m] = value.split("-").map(Number);
    setSelectedMonthOpt({ year: y, month: m });
    setPage(1);
    setTopPage(1);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-4 font-sans text-[#1C2321] sm:p-8 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Riwayat Penjualan
            </h1>
            <p className="mt-1 text-sm font-medium text-[#8A8375]">
              Pantau performa operasional dan pendapatan tokomu.
            </p>
          </div>
          <div className="rounded-xl border border-[#E4E1D8] bg-white p-1 shadow-sm transition hover:border-[#D8D3C4]">
            <select
              value={selectedValue}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={monthOptions.length === 0}
              className="cursor-pointer appearance-none rounded-lg bg-transparent px-4 py-2.5 pr-8 text-sm font-bold text-[#1C2321] focus:outline-none disabled:opacity-50"
            >
              {monthOptions.length === 0 && <option value="">Memuat...</option>}
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E4E1D8] border-t-[#C98A1F]" />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-[#F1CFC7] bg-[#FBEAE7] p-6 text-center">
            <p className="font-bold text-[#B23A2E]">
              Gagal memuat laporan:{" "}
              {error?.response?.data?.errors ||
                error?.message ||
                "Terjadi kesalahan"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* ROW 1: METRIK (GRID 3x2) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                title="Total Omzet Selesai"
                value={summary?.totalOmzet}
                type="money"
                trend={summary?.trend?.omzet}
              />
              <MetricCard
                title="Pesanan Selesai"
                value={summary?.totalPesanan}
                type="normal"
                trend={summary?.trend?.pesanan}
              />
              <MetricCard
                title="Rata-rata Nilai (AOV)"
                value={summary?.averageOrderValue}
                type="money"
              />
              <MetricCard
                title="Pesanan Dibatalkan"
                value={summary?.totalBatal}
                type="danger"
                trend={summary?.trend?.batal}
                inverseTrend
              />
              <MetricCard
                title="Tingkat Pembatalan"
                value={summary?.cancellationRate}
                type="percent"
              />
              <MetricCard
                title="Rata-rata Wait Time"
                value={formatWaitTime(summary?.averageWaitTimeMinutes)}
                type="normal"
              />
            </div>

            {/* ROW 2: CHARTS */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Kolom Kiri: Tren Omzet Bulanan */}
              <div className="flex flex-col rounded-2xl border border-[#E4E1D8] bg-white shadow-sm lg:col-span-2">
                <div className="border-b border-[#E4E1D8] px-6 py-5">
                  <h2 className="text-base font-bold">
                    Tren Penjualan Bulanan
                  </h2>
                  <p className="mt-1 text-xs text-[#8A8375]">
                    Pergerakan omzet bersih berdasarkan tanggal.
                  </p>
                </div>
                <div className="p-6">
                  {charts?.revenueDaily?.length > 0 ? (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={charts.revenueDaily}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorOmzet"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#147356"
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor="#147356"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#E4E1D8"
                          />
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#8A8375" }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#8A8375" }}
                            tickFormatter={(val) =>
                              val >= 1000 ? `${val / 1000}k` : val
                            }
                          />
                          <RechartsTooltip
                            cursor={{
                              stroke: "#C98A1F",
                              strokeWidth: 1,
                              strokeDasharray: "4 4",
                            }}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid #E4E1D8",
                              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                            }}
                            formatter={(value) => [
                              `Rp ${(value || 0).toLocaleString("id-ID")}`,
                              "Omzet",
                            ]}
                            labelStyle={{
                              color: "#8A8375",
                              marginBottom: "4px",
                              fontWeight: "bold",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="omzet"
                            stroke="#147356"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorOmzet)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-[#D8D3C4] bg-[#FAF9F6]">
                      <p className="text-sm font-medium text-[#8A8375]">
                        Data omzet belum tersedia.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Distribusi Jam Sibuk Harian */}
              <div className="flex flex-col rounded-2xl border border-[#E4E1D8] bg-white shadow-sm lg:col-span-1">
                <div className="flex items-center justify-between border-b border-[#E4E1D8] px-6 py-4">
                  <div>
                    <h2 className="text-base font-bold">Jam Sibuk Harian</h2>
                    <p className="text-xs text-[#8A8375]">
                      Puncak pesanan masuk.
                    </p>
                  </div>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="cursor-pointer appearance-none rounded-lg border border-[#E4E1D8] bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold focus:outline-none"
                  >
                    {charts?.revenueDaily?.map((day) => (
                      <option key={day.label} value={day.label}>
                        Tgl {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 p-6">
                  {activeHourlyTraffic.some((d) => d.pesanan > 0) ? (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={activeHourlyTraffic}
                          margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#E4E1D8"
                          />
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#8A8375" }}
                            interval={3}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#8A8375" }}
                          />
                          <RechartsTooltip
                            cursor={{ fill: "#FAF9F6" }}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid #E4E1D8",
                            }}
                            formatter={(value) => [value, "Pesanan"]}
                            labelStyle={{
                              color: "#8A8375",
                              fontWeight: "bold",
                            }}
                          />
                          <Bar
                            dataKey="pesanan"
                            fill="#1C2321"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={30}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed border-[#D8D3C4] bg-[#FAF9F6]">
                      <p className="text-xs font-medium text-[#8A8375]">
                        Tidak ada pesanan di tanggal ini.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 3: DAFTAR TRANSAKSI & RANKING */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Kolom Kiri: Tabel History */}
              <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white shadow-sm lg:col-span-2">
                {isFetching && (
                  <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-[#FCEFDA]">
                    <div className="h-full w-1/3 animate-pulse rounded-r-full bg-[#C98A1F]" />
                  </div>
                )}
                <div className="flex flex-col gap-3 border-b border-[#E4E1D8] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold">Daftar Transaksi</h2>
                    <p className="mt-1 text-xs text-[#8A8375]">
                      Rincian faktur dan pesanan.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "ALL", label: "Semua" },
                      { id: "SELESAI", label: "Selesai" },
                      { id: "DIBATALKAN", label: "Batal" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setTxStatus(tab.id);
                          setPage(1);
                        }}
                        className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                          txStatus === tab.id
                            ? "bg-[#1C2321] text-white"
                            : "bg-[#FAF9F6] text-[#8A8375] hover:bg-[#E4E1D8]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-widest text-[#8A8375]">
                      <tr>
                        <th className="px-6 py-4 font-bold">Waktu & No</th>
                        <th className="px-6 py-4 font-bold">Item & Variant</th>
                        <th className="px-6 py-4 font-bold">Add-ons</th>
                        <th className="px-6 py-4 font-bold">Status & Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E1D8]">
                      {!data?.history || data.history.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-12 text-center text-sm font-medium text-[#8A8375]"
                          >
                            Belum ada transaksi di kategori ini.
                          </td>
                        </tr>
                      ) : (
                        data.history.map((queue) => {
                          const details = queue.queueDetails || [];
                          if (details.length === 0) return null;
                          return (
                            <Fragment key={queue.id}>
                              {details.map((item, index) => {
                                let parsedAddons = [];
                                if (item.selected_addons) {
                                  parsedAddons =
                                    typeof item.selected_addons === "string"
                                      ? JSON.parse(item.selected_addons)
                                      : item.selected_addons;
                                }
                                const isFirst = index === 0;
                                return (
                                  <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-[#FAF9F6]/60"
                                  >
                                    {isFirst && (
                                      <td
                                        rowSpan={details.length}
                                        className="whitespace-nowrap px-6 py-4 align-top"
                                      >
                                        <p className="font-mono text-sm font-bold">
                                          #{queue.queue_number}
                                        </p>
                                        <p className="mt-0.5 text-xs text-[#8A8375]">
                                          {new Date(
                                            queue.created_at,
                                          ).toLocaleString("id-ID", {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                          })}
                                        </p>
                                      </td>
                                    )}
                                    <td className="px-6 py-4 align-top">
                                      <p className="font-medium text-[#1C2321]">
                                        <span className="font-bold">
                                          {item.quantity}x
                                        </span>{" "}
                                        {item.product?.name}
                                      </p>
                                      {item.variant && (
                                        <p className="mt-1 text-xs font-semibold text-[#C98A1F]">
                                          {item.variant.name}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                      {parsedAddons.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {parsedAddons.map((addon, idx) => (
                                            <span
                                              key={idx}
                                              className="rounded-md border border-[#E4E1D8] bg-[#FAF9F6] px-1.5 py-0.5 text-[10px] font-medium text-[#8A8375]"
                                            >
                                              + {addon.name}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-[#8A8375]">
                                          -
                                        </span>
                                      )}
                                    </td>
                                    {isFirst && (
                                      <td
                                        rowSpan={details.length}
                                        className="px-6 py-4 align-top"
                                      >
                                        <p className="mb-2 font-mono font-bold text-[#147356]">
                                          Rp{" "}
                                          {(
                                            queue.total_price || 0
                                          ).toLocaleString("id-ID")}
                                        </p>
                                        <span
                                          className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${
                                            queue.status === "SELESAI"
                                              ? "bg-[#E7F3EC] text-[#147356]"
                                              : "bg-[#FBEAE7] text-[#B23A2E]"
                                          }`}
                                        >
                                          {queue.status}
                                        </span>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  currentPage={page}
                  totalPages={data?.pagination?.totalPages}
                  onPrev={() => setPage((o) => Math.max(o - 1, 1))}
                  onNext={() =>
                    setPage((o) =>
                      Math.min(o + 1, data?.pagination?.totalPages),
                    )
                  }
                />
              </div>

              {/* Kolom Kanan: Ranking Penjualan */}
              <div className="flex flex-col gap-6 lg:col-span-1">
                {/* Top Produk */}
                <div className="flex flex-col rounded-2xl border border-[#E4E1D8] bg-white shadow-sm">
                  <div className="border-b border-[#E4E1D8] px-6 py-5">
                    <h2 className="text-base font-bold">Produk Terlaris</h2>
                  </div>
                  <div className="p-4">
                    {!data?.topSelling?.rankings?.length ? (
                      <p className="p-4 text-center text-sm font-medium text-[#8A8375]">
                        Belum ada data produk.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {data.topSelling.rankings.map((item, idx) => (
                          <div
                            key={item.product_id}
                            className="flex items-center justify-between rounded-xl p-3 transition hover:bg-[#FAF9F6]"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E4E1D8]/50 text-xs font-bold text-[#8A8375]">
                                {item.rank}
                              </span>
                              <p className="text-sm font-semibold">
                                {item.name}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#147356]">
                              {item.totalQuantity} pcs
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Addon */}
                <div className="flex flex-col rounded-2xl border border-[#E4E1D8] bg-white shadow-sm">
                  <div className="border-b border-[#E4E1D8] px-6 py-5">
                    <h2 className="text-base font-bold">Ekstra & Topping</h2>
                  </div>
                  <div className="p-4">
                    {!data?.topAddons?.length ? (
                      <p className="p-4 text-center text-sm font-medium text-[#8A8375]">
                        Belum ada data add-on.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {data.topAddons.map((item, idx) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between rounded-xl p-3 transition hover:bg-[#FAF9F6]"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E4E1D8]/50 text-xs font-bold text-[#8A8375]">
                                {idx + 1}
                              </span>
                              <p className="text-sm font-semibold">
                                {item.name}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#147356]">
                              {item.totalQuantity} pcs
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
