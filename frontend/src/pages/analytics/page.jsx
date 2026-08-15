// src/pages/analytics/analytics-page.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock, CalendarDays } from "lucide-react";
import { useStoreHistory } from "../../hooks/analytics.js";
import StatCard from "../../components/analytics/stat-card.jsx";
import RevenueChart from "../../components/analytics/revenue-chart.jsx";
import TrafficDailyChart from "../../components/analytics/traffic-daily-chart.jsx";
import HistoryList from "../../components/analytics/history-list.jsx";
import TopSellingList from "../../components/analytics/top-selling-list.jsx";
import { useGenerateAIReport } from "../../hooks/ai.js";
import AIReportModal from "../../components/ai/ai-report-modal.jsx";
import TrafficWeekView from "../../components/analytics/traffic-week-view.jsx";
import TopAddonsList from "../../components/analytics/top-addons-list.jsx";
import EmptyStoreState from "../empty-state/no-store.jsx";
import AnalytictPageLoading from "../loading-state/analytics-page-loading.jsx";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const now = new Date();

export default function AnalyticsPage() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [status, setStatus] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [topPage, setTopPage] = useState(1);

  const { data, isLoading, isError, error } = useStoreHistory({
    month,
    year,
    status,
    page: historyPage,
    limit: 10,
    topPage,
    topLimit: 10,
  });
  console.log(data);

  const [reportOpen, setReportOpen] = useState(false);
  const generateReport = useGenerateAIReport();
  const [reportData, setReportData] = useState(null);
  const [reportError, setReportError] = useState("");
  useDocumentTitle("Analitik");
  function handleMonthChange(newMonth, newYear) {
    setMonth(newMonth);
    setYear(newYear);
    setHistoryPage(1);
    setTopPage(1);
  }

  function handleGenerateReport() {
    setReportOpen(true);
    setReportData(null);
    setReportError("");
    generateReport.mutate(
      { month, year },
      {
        onSuccess: (res) => setReportData(res?.data?.ai_report),
        onError: (err) =>
          setReportError(
            err?.response?.data?.errors || "Gagal membuat laporan, coba lagi.",
          ),
      },
    );
  }

  const summary = data?.data?.summary;
  const charts = data?.data?.charts;
  const history = data?.data?.history || [];
  const pagination = data?.data?.pagination;
  const topSelling = data?.data?.topSelling;
  const topAddons = data?.data?.topAddons || [];

  const meta = data?.data?.meta;
  const containerVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 18,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: "easeOut",
      },
    },
  };
  if (isLoading) {
    return <AnalytictPageLoading></AnalytictPageLoading>;
  }

  if (isError && error.message === "Toko tidak ditemukan") {
    return <EmptyStoreState />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-[#1e1e1e] min-h-full w-full p-[16px] flex flex-col gap-[16px]"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]"
      >
        <div>
          <p className="text-[20px] font-bold text-white">Analitik & Laporan</p>

          <p className="text-[13px] text-white/50 whitespace-nowrap">
            Ringkasan performa toko kamu per bulan.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-[16px] w-full">
          {/* Wrapper untuk Select Bulan & Tahun (Tetap 1 baris di mobile) */}
          <div className="flex items-center lg:ml-auto gap-[16px] w-full lg:w-auto">
            <select
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value), year)}
              className="flex-1 lg:flex-none lg:w-auto bg-white/5 border border-white/10 text-white text-[16px] h-[48px] px-[16px] rounded-none focus:outline-none focus:border-[#C0FE04] transition-colors cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option
                  key={i}
                  value={i + 1}
                  className="bg-[#1e1e1e] text-white"
                >
                  {m}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => handleMonthChange(month, Number(e.target.value))}
              className="flex-1 lg:flex-none lg:w-auto bg-white/5 border border-white/10 text-white text-[16px] h-[48px] px-[16px] rounded-none focus:outline-none focus:border-[#C0FE04] transition-colors cursor-pointer"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y} className="bg-[#1e1e1e] text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Buat Laporan (Di bawah pada mobile, di kanan pada desktop) */}
          <RevealButton
            type="button"
            onClick={handleGenerateReport}
            label="Buat Laporan AI"
            icon={Sparkles}
            bgBefore="bg-[#C0FE04]"
            textBefore="text-[#1e1e1e]"
            bgAfter="bg-white"
            textAfter="text-[#1e1e1e]"
            className="w-full lg:w-fit rounded-none"
          />
        </div>
      </motion.div>

      {/* Divider */}
      <motion.div
        variants={itemVariants}
        className="h-[1px] w-full bg-white/10"
      />

      {/* Current month info */}
      {meta?.isCurrentMonth && (
        <motion.p variants={itemVariants} className="text-[12px] text-white/40">
          Data bulan berjalan dihitung sampai saat ini, belum sampai akhir
          bulan.
        </motion.p>
      )}

      {/* Error */}
      {isError && (
        <motion.div
          variants={itemVariants}
          className="flex min-h-[40vh] items-center justify-center"
        >
          <p className="text-[14px] text-red-500">
            {error?.response?.data?.errors || "Gagal memuat data analitik."}
          </p>
        </motion.div>
      )}

      {!isLoading && !isError && summary && (
        <>
          {/* Summary */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[16px]"
          >
            <motion.div variants={itemVariants}>
              <StatCard
                index={0}
                label="Total Pendapatan"
                value={`Rp${Number(summary.totalOmzet).toLocaleString(
                  "id-ID",
                )}`}
                trend={summary.trend?.omzet}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                index={1}
                label="Pesanan Selesai"
                value={summary.totalPesanan}
                trend={summary.trend?.pesanan}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                index={2}
                label="Pesanan Batal"
                value={summary.totalBatal}
                trend={summary.trend?.batal}
                inverseTrend
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                index={3}
                label="Tingkat Batal"
                value={`${summary.cancellationRate}%`}
                trend={summary.trend?.cancellationRate}
                inverseTrend
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                index={4}
                label="Rata-rata Pesanan"
                value={`Rp${Number(summary.averageOrderValue).toLocaleString(
                  "id-ID",
                )}`}
                trend={summary.trend?.averageOrderValue}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                index={5}
                label="Rata-rata Tunggu"
                value={`${summary.averageWaitTimeMinutes} menit`}
                trend={summary.trend?.averageWaitTime}
                inverseTrend
              />
            </motion.div>
          </motion.div>

          {/* Peak Traffic */}
          {summary.peakTraffic && (
            <motion.div
              variants={itemVariants}
              className="flex justify-between gap-[16px]"
            >
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="flex items-center bg-white/5 border border-white/10 hover:border-white/20 w-full transition-all duration-300 p-[8px] gap-[16px]"
              >
                <Clock size={16} className="text-[#C0FE04]" />

                <p className="text-[13px] text-white/70">
                  Jam Tersibuk:{" "}
                  <span className="text-white font-medium">
                    {summary.peakTraffic.peakHour}
                  </span>
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="flex items-center bg-white/5 border border-white/10 hover:border-white/20 w-full transition-all duration-300 p-[8px] gap-[16px]"
              >
                <CalendarDays size={16} className="text-[#C0FE04]" />

                <p className="text-[13px] text-white/70">
                  Hari Tersibuk:{" "}
                  <span className="text-white font-medium">
                    {summary.peakTraffic.peakDay}
                  </span>
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Charts */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]"
          >
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.25 }}
              className="bg-white/5 border border-white/10 hover:border-white/20 p-[8px] rounded-none flex flex-col gap-[16px] transition-all duration-300 shadow-sm"
            >
              <p className="text-[13px] font-bold text-white">Omzet Harian</p>

              <div className="h-[1px] w-full bg-white/10" />

              <RevenueChart data={charts?.revenueDaily || []} />
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.25 }}
              className="bg-white/5 border border-white/10 hover:border-white/20 p-[8px] rounded-none transition-all duration-300 shadow-sm"
            >
              <TrafficWeekView
                key={`${month}-${year}`}
                revenueDaily={charts?.revenueDaily || []}
                trafficDaily={charts?.trafficDaily || []}
                month={month}
                year={year}
              />
            </motion.div>
          </motion.div>

          {/* History */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.25 }}
            className="bg-white/5 border border-white/10 hover:border-white/20 p-[8px] rounded-none flex flex-col gap-[16px] transition-all duration-300 shadow-sm"
          >
            <HistoryList
              history={history}
              pagination={pagination}
              status={status}
              onStatusChange={(s) => {
                setStatus(s);
                setHistoryPage(1);
              }}
              onPageChange={setHistoryPage}
            />
          </motion.div>

          {/* Top Selling + Addons */}
          <motion.div
            variants={containerVariants}
            className="flex flex-col lg:flex-row gap-[16px]"
          >
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.25 }}
              className="bg-white/5 border border-white/10 w-full hover:border-white/20 p-[8px] rounded-none flex flex-col gap-[16px] transition-all duration-300 shadow-sm"
            >
              <p className="text-[13px] font-bold text-white">
                Produk Terlaris
              </p>

              <div className="h-[1px] w-full bg-white/10" />

              <TopSellingList
                rankings={topSelling?.rankings || []}
                pagination={topSelling?.pagination}
                onPageChange={setTopPage}
              />
            </motion.div>

            {topAddons.length > 0 && (
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.25 }}
                className="bg-white/5 border border-white/10 w-full hover:border-white/20 p-[8px] rounded-none flex flex-col gap-[16px] transition-all duration-300 shadow-sm"
              >
                <p className="text-[13px] font-bold text-white">
                  Addon Terlaris
                </p>

                <div className="h-[1px] w-full bg-white/10" />

                <TopAddonsList addons={topAddons} />
              </motion.div>
            )}
          </motion.div>
        </>
      )}

      <AIReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        isPending={generateReport.isPending}
        report={reportData}
        error={reportError}
      />
    </motion.div>
  );
}
