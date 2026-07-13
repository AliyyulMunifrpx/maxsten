import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStoreHistory } from "../../lib/sellerApi.js";

import {
  AreaChart,
  Area,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

function MetricCard({ title, value, type }) {
  const isMoney = type === "money";
  const isDanger = type === "danger";

  return (
    <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8A8375]">
        {title}
      </p>
      <h3
        className={`text-2xl sm:text-3xl font-bold font-mono ${
          isMoney
            ? "text-[#147356]"
            : isDanger
              ? "text-[#B23A2E]"
              : "text-[#1C2321]"
        }`}
      >
        {isMoney ? `Rp ${value.toLocaleString("id-ID")}` : value}
      </h3>
    </div>
  );
}

function formatWaitTime(minutes) {
  const rounded = Math.max(0, Math.round(minutes));

  if (rounded < 60) {
    return `${rounded} menit`;
  }

  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  if (hours < 24) {
    return remainingMinutes
      ? `${hours} jam ${remainingMinutes} menit`
      : `${hours} jam`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours
    ? `${days} hari ${remainingHours} jam`
    : `${days} hari`;
}

function PaginationBar({ currentPage, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#E4E1D8] pt-4">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={onPrev}
        className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#1C2321] transition hover:bg-[#FAF9F6] disabled:opacity-30"
      >
        Sebelumnya
      </button>
      <p className="text-[10px] text-[#8A8375]">
        Halaman {currentPage} dari {totalPages}
      </p>
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={onNext}
        className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#1C2321] transition hover:bg-[#FAF9F6] disabled:opacity-30"
      >
        Selanjutnya
      </button>
    </div>
  );
}

const FILTER_OPTIONS = [
  { id: "day", label: "Hari Ini" },
  { id: "week", label: "7 Hari" },
  { id: "month", label: "30 Hari" },
  { id: "year", label: "1 Tahun" },
  { id: "all", label: "Semua Waktu" },
];

export default function StoreHistory() {
  const [activeFilter, setActiveFilter] = useState("day");
  const [page, setPage] = useState(1);
  const [topPage, setTopPage] = useState(1);
  const topLimit = 10;

  const [txStatus, setTxStatus] = useState("ALL");

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["storeHistory", activeFilter, page, topPage, txStatus],
    queryFn: () =>
      getStoreHistory({
        filter: activeFilter,
        page: page,
        limit: 10,
        topPage,
        topLimit,
        status: txStatus === "ALL" ? undefined : txStatus,
      }),
    keepPreviousData: true,
  });
 console.log(data)
  return (
    <div className="min-h-screen bg-[#FAF9F6] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* HEADER & FILTER */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-[#1C2321] sm:text-3xl">
              Riwayat & Laporan
            </h1>
            <p className="text-sm text-[#8A8375]">
              Ringkasan pendapatan sesuai rentang waktu.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border border-[#E4E1D8] bg-white p-1 shadow-sm">
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  setActiveFilter(filter.id);
                  setPage(1);
                  setTopPage(1);
                }}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  activeFilter === filter.id
                    ? "bg-[#1C2321] text-white shadow"
                    : "text-[#8A8375] hover:bg-[#FAF9F6] hover:text-[#1C2321]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E1D8] border-t-[#C98A1F]" />
          </div>
        ) : isError ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-[#F1CFC7] bg-[#FBEAE7]">
            <p className="font-bold text-[#B23A2E]">
              Gagal memuat laporan: {error.response?.data?.errors}
            </p>
          </div>
        ) : (
          <>
            {/* 4 KARTU METRIK */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total Omzet Selesai"
                value={data.summary.totalOmzet}
                type="money"
              />
              <MetricCard
                title="Pesanan Selesai"
                value={data.summary.totalPesanan}
                type="normal"
              />
              <MetricCard
                title="Pesanan Dibatalkan"
                value={data.summary.totalBatal}
                type="danger"
              />
              <MetricCard
                title="Rata-rata Waktu Tunggu"
                value={formatWaitTime(data.summary.averageWaitTimeMinutes)}
                type="normal"
              />
            </div>

            {/* GRID 2x2 */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* ===== KOLOM KIRI: TOP SELLING ===== */}
              <div className="flex flex-col gap-6">
                {/* Chart Top Selling Products */}
                <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-4">
                    <h2 className="font-bold text-[#1C2321]">
                      Top Selling Products
                    </h2>
                    <p className="text-sm text-[#8A8375]">
                      5 produk terlaris berdasarkan kuantitas.
                    </p>
                  </div>

                  {data.topSelling && data.topSelling.products.length > 0 ? (
                    <>
                      <div className="mb-4 flex flex-wrap gap-2 text-xs text-[#8A8375]">
                        {data.topSelling.products.map((product) => (
                          <span
                            key={product.product_id}
                            className="inline-flex items-center gap-2 rounded-full border border-[#E4E1D8] bg-[#FAF9F6] px-3 py-1"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: product.color }}
                            />
                            {product.name}
                          </span>
                        ))}
                      </div>
                      <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={data.topSelling.chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          >
                            <defs>
                              {data.topSelling.products.map((product) => (
                                <linearGradient
                                  key={product.key}
                                  id={`gradient-${product.key}`}
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor={product.color}
                                    stopOpacity={0.35}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor={product.color}
                                    stopOpacity={0.03}
                                  />
                                </linearGradient>
                              ))}
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
                            />
                            <RechartsTooltip
                              cursor={{
                                stroke: "#C98A1F",
                                strokeWidth: 1,
                                strokeDasharray: "5 5",
                              }}
                              contentStyle={{
                                borderRadius: "12px",
                                border: "1px solid #E4E1D8",
                              }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 12, color: "#8A8375" }}
                            />
                            {data.topSelling.products.map((product) => (
                              <Area
                                key={product.key}
                                type="monotone"
                                dataKey={product.key}
                                name={product.name}
                                stroke={product.color}
                                strokeWidth={2}
                                fill={`url(#gradient-${product.key})`}
                              />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[#D8D3C4] bg-[#FAF9F6]">
                      <p className="text-sm text-[#8A8375]">
                        Belum ada data penjualan produk.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tabel Peringkat Top Selling Products */}
                <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="mb-4 font-bold text-[#1C2321]">
                    Peringkat Produk Terlaris
                  </h3>

                  {!data.topSelling || data.topSelling.rankings.length === 0 ? (
                    <p className="text-sm text-[#8A8375]">
                      Belum ada penjualan untuk produk terlaris.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data.topSelling.rankings.map((item) => (
                        <div
                          key={item.product_id}
                          className="rounded-xl border border-[#E4E1D8] bg-[#FAF9F6] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[#1C2321]">
                                {item.name}
                              </p>
                              <p className="text-xs text-[#8A8375]">
                                Posisi #{item.rank}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#E7F3EC] px-3 py-1 text-xs font-bold text-[#147356]">
                              {item.totalQuantity} pcs
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {data.topSelling && (
                    <PaginationBar
                      currentPage={data.topSelling.pagination.currentPage}
                      totalPages={data.topSelling.pagination.totalPages}
                      onPrev={() => setTopPage((old) => Math.max(old - 1, 1))}
                      onNext={() =>
                        setTopPage((old) =>
                          Math.min(
                            old + 1,
                            data.topSelling.pagination.totalPages,
                          ),
                        )
                      }
                    />
                  )}
                </div>

                {/* Tabel Peringkat Top Selling Addons */}
                <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="mb-4 font-bold text-[#1C2321]">
                    Peringkat Add-on Terlaris
                  </h3>

                  {!data.topAddons || data.topAddons.length === 0 ? (
                    <p className="text-sm text-[#8A8375]">
                      Belum ada penjualan untuk add-on.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data.topAddons.map((item, index) => (
                        <div
                          key={item.name}
                          className="rounded-xl border border-[#E4E1D8] bg-[#FAF9F6] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[#1C2321]">
                                {item.name}
                              </p>
                              <p className="text-xs text-[#8A8375]">
                                Posisi #{index + 1}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#E7F3EC] px-3 py-1 text-xs font-bold text-[#147356]">
                              {item.totalQuantity} pcs
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ===== KOLOM KANAN: TREN PENJUALAN & TABEL HISTORI ===== */}
              <div className="flex flex-col gap-6">
                {/* Chart Tren Penjualan */}
                <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-4">
                    <h2 className="font-bold text-[#1C2321]">Tren Penjualan</h2>
                    <p className="text-sm text-[#8A8375]">
                      Omzet dari pesanan selesai sesuai rentang waktu.
                    </p>
                  </div>

                  {data.chartData && data.chartData.length > 0 ? (
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.chartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                                stopOpacity={0.3}
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
                            tickFormatter={(value) =>
                              `${value >= 1000 ? value / 1000 + "k" : value}`
                            }
                          />
                          <RechartsTooltip
                            cursor={{
                              stroke: "#C98A1F",
                              strokeWidth: 1,
                              strokeDasharray: "5 5",
                            }}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid #E4E1D8",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                            formatter={(value) => [
                              `Rp ${value.toLocaleString("id-ID")}`,
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
                    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[#D8D3C4] bg-[#FAF9F6]">
                      <p className="text-sm text-[#8A8375]">
                        Belum ada data tren penjualan.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tabel Daftar Transaksi Terkini */}
                <div className="relative overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white shadow-sm">
                  {isFetching && (
                    <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-[#FCEFDA]">
                      <div className="h-full w-1/3 animate-pulse rounded-r-full bg-[#C98A1F]" />
                    </div>
                  )}

                  <div className="flex flex-col gap-3 border-b border-[#E4E1D8] bg-[#FCFBF9] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-bold text-[#1C2321]">
                      Daftar Transaksi Terkini
                    </h2>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "ALL", label: "Semua" },
                        { id: "SELESAI", label: "Selesai" },
                        { id: "DIBATALKAN", label: "Dibatalkan" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setTxStatus(tab.id);
                            setPage(1);
                          }}
                          className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                            txStatus === tab.id
                              ? "bg-[#1C2321] text-white"
                              : "bg-[#E4E1D8]/30 text-[#8A8375] hover:bg-[#E4E1D8]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-[#1C2321]">
                      <thead className="border-b border-[#E4E1D8] bg-[#FAF9F6] text-xs uppercase text-[#8A8375]">
                        <tr>
                          <th className="px-4 py-3">Waktu</th>
                          <th className="px-4 py-3">No.</th>
                          <th className="px-4 py-3">Nama Produk</th>
                          <th className="px-4 py-3">Variant</th>
                          <th className="px-4 py-3">Add-ons</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>

                      {/* Hapus divide-y di sini karena kita mengontrol border antar grup row secara manual */}
                      <tbody>
                        {data.history.length === 0 ? (
                          <tr>
                            <td
                              colSpan="7"
                              className="px-4 py-8 text-center text-[#8A8375]"
                            >
                              Belum ada transaksi dengan status ini.
                            </td>
                          </tr>
                        ) : (
                          data.history.map((queue) => {
                            const rowCount = queue.queueDetails.length;

                            return (
                              <Fragment key={queue.id}>
                                {queue.queueDetails.map((item, index) => {
                                  // Parse addons per produk
                                  let parsedAddons = [];
                                  if (item.selected_addons) {
                                    parsedAddons =
                                      typeof item.selected_addons === "string"
                                        ? JSON.parse(item.selected_addons)
                                        : item.selected_addons;
                                  }

                                  // Border bawah hanya diletakkan pada baris terakhir dari sebuah transaksi
                                  const isLastItem = index === rowCount - 1;

                                  return (
                                    <tr
                                      key={item.id}
                                      className={`transition hover:bg-[#FAF9F6]/50 ${isLastItem ? "border-b border-[#E4E1D8]" : ""}`}
                                    >
                                      {/* Kolom Waktu & Nomor di-Merge pakai rowSpan */}
                                      {index === 0 && (
                                        <>
                                          <td
                                            rowSpan={rowCount}
                                            className="whitespace-nowrap px-4 py-3 text-xs text-[#8A8375] align-top"
                                          >
                                            {new Date(
                                              queue.created_at,
                                            ).toLocaleString("id-ID", {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })}
                                          </td>
                                          <td
                                            rowSpan={rowCount}
                                            className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold align-top"
                                          >
                                            #{queue.queue_number}
                                          </td>
                                        </>
                                      )}

                                      {/* Kolom Nama Produk */}
                                      <td className="px-4 py-3 text-xs align-top">
                                        <span className="font-bold">
                                          {item.quantity}x
                                        </span>{" "}
                                        {item.product.name}
                                        {isLastItem && queue.note && (
                                          <p className="mt-2 text-[10px] italic text-[#9C6A16]">
                                            Note: {queue.note}
                                          </p>
                                        )}
                                      </td>

                                      {/* Kolom Variant */}
                                      <td className="px-4 py-3 text-xs align-top">
                                        {item.variant ? (
                                          <span className="font-semibold text-[#C98A1F]">
                                            {item.variant.name}
                                          </span>
                                        ) : (
                                          <span className="text-[#8A8375]">
                                            -
                                          </span>
                                        )}
                                      </td>

                                      {/* Kolom Add-ons */}
                                      <td className="px-4 py-3 text-xs align-top">
                                        {parsedAddons.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {parsedAddons.map((addon, idx) => (
                                              <span
                                                key={idx}
                                                className="inline-block rounded-md bg-[#FAF9F6] border border-[#E4E1D8] px-1.5 py-0.5 text-[9px] font-medium text-[#8A8375]"
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

                                      {/* Kolom Total & Status di-Merge pakai rowSpan */}
                                      {index === 0 && (
                                        <>
                                          <td
                                            rowSpan={rowCount}
                                            className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold align-top"
                                          >
                                            Rp{" "}
                                            {queue.total_price.toLocaleString(
                                              "id-ID",
                                            )}
                                          </td>
                                          <td
                                            rowSpan={rowCount}
                                            className="whitespace-nowrap px-4 py-3 text-center align-top"
                                          >
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
                                        </>
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

                  {data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[#E4E1D8] bg-white px-5 py-3">
                      <p className="text-xs text-[#8A8375]">
                        Hal{" "}
                        <span className="font-bold text-[#1C2321]">
                          {data.pagination.currentPage}
                        </span>
                        /{data.pagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPage((old) => Math.max(old - 1, 1))}
                          disabled={data.pagination.currentPage === 1}
                          className="rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs font-bold text-[#1C2321] transition hover:bg-[#FAF9F6] disabled:opacity-30"
                        >
                          Sebelumnya
                        </button>
                        <button
                          onClick={() =>
                            setPage((old) =>
                              old < data.pagination.totalPages ? old + 1 : old,
                            )
                          }
                          disabled={
                            data.pagination.currentPage ===
                            data.pagination.totalPages
                          }
                          className="rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs font-bold text-[#1C2321] transition hover:bg-[#FAF9F6] disabled:opacity-30"
                        >
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
