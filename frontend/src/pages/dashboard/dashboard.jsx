import { useNavigate } from "react-router-dom";
import {
  Store,
  DollarSign,
  LineChart,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Box,
  ChartLine,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "../../components/dashboard/metric-card.jsx";
import Main from "../../components/dashboard/main.jsx";
import QueueCard from "../../components/dashboard/queue-card.jsx";
import DashboardPanel from "../../components/dashboard/panel.jsx";
import ProductCard from "../../components/dashboard/product-card.jsx";
import PeakHourChart from "../../components/dashboard/chart.jsx";
import { useSocket } from "../../hooks/socket.js";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getDashboard } from "../../hooks/dashboard.js";
import toast from "react-hot-toast";
import EmptyStoreState from "../empty-state/no-store.jsx";
import DashboardLoading from "../loading-state/dashboard-loading.jsx";
import { useUpdateQueueStatus } from "../../hooks/order.js";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function DashboardPage() {
  // 1. SEMUA HOOK WAJIB DIPANGGIL DI SINI, PALING ATAS!
  const QueryClient = useQueryClient();
  const { data, isLoading, isError, error } = getDashboard();
  const navigate = useNavigate();
  const { mutateAsync: cancelQueue } = useUpdateQueueStatus(); // ✅ DIPINDAH KE SINI
  useDocumentTitle("Beranda");

  // 2. BARU BOLEH ADA KONDISIONAL RETURN (Early Return)
  if (isLoading) {
    return <DashboardLoading />;
  }

  if (isError && error?.message === "Toko tidak ditemukan") {
    return <EmptyStoreState />;
  }

  // 3. AMBIL DATA SETELAH LOADING SELESAI
  const todayData = data?.data?.today;
  const serverTime = data?.data?.server_time;
  const oldestActiveQueues = data?.data?.lists?.oldest_active_queues || [];
  const activeQueuesCount = data?.data?.lists?.active_queues_count ?? 0;
  const latestProducts = data?.data?.lists?.latest_products || [];
  async function handleQueueAction(queueId, status, reason) {
    await cancelQueue({
      storeId: data.data.store.public_id,
      queueId: Number(queueId),
      status,
      reason,
    });
    QueryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const metrics = [
    {
      id: "omzet",
      name: "Total Pendapatan",
      value: todayData?.omzet?.value || 0,
      trend: todayData?.omzet?.trend || 0,
      color: "yellow",
      format: "currency",
      icon: DollarSign,
    },
    {
      id: "aov",
      name: "Rata-rata Pesanan",
      value: todayData?.aov?.value || 0,
      trend: todayData?.aov?.trend || 0,
      color: "blue",
      format: "currency",
      icon: LineChart,
    },
    {
      id: "pesanan_selesai",
      name: "Pesanan Selesai",
      value: todayData?.pesanan_selesai?.value || 0,
      trend: todayData?.pesanan_selesai?.trend || 0,
      color: "green",
      format: "number",
      icon: CheckCircle,
    },
    {
      id: "pesanan_batal",
      name: "Pesanan Dibatalkan",
      value: todayData?.pesanan_batal?.value || 0,
      trend: todayData?.pesanan_batal?.trend || 0,
      color: "red",
      format: "number",
      icon: XCircle,
    },
  ];

  return (
    <div className="bg-[#1e1e1e] flex flex-col min-h-full w-full gap-[16px] p-[16px]">
      <Main
        logo={data?.data?.store?.logo_url}
        name={data?.data?.store?.name}
        status={data?.data?.store?.is_open ? "buka" : " tutup"}
        storeId={data?.data?.store?.public_id}
      />
      <p className="md:col-span-2 lg:col-span-4 text-[12px] -my-[8px] italic text-white/40">
        Dibandingkan jam yang sama kemarin, bukan sepanjang hari kemarin.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {metrics.map((metric, i) => (
          <MetricCard
            key={metric.id}
            index={i}
            icon={metric.icon}
            name={metric.name}
            value={metric.value}
            trend={metric.trend}
            color={metric.color}
            format={metric.format}
          />
        ))}
      </div>
      <p className="md:col-span-2 lg:col-span-4 text-[12px] -my-[8px] italic text-white/40">
        Menampilkan 5 antrean yang paling lama menunggu.{" "}
      </p>
      <div className="flex flex-col lg:flex-row w-full gap-[16px]">
        <DashboardPanel
          icon={Clock}
          title="Antrean"
          path="/orders"
          count={activeQueuesCount}
        >
          {oldestActiveQueues.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <p className="text-[13px] text-white/30">
                Tidak ada pesanan aktif
              </p>
            </div>
          ) : (
            oldestActiveQueues.map((queue) => (
              <QueueCard
                key={queue.id}
                id={queue.id}
                queue_number={queue.queue_number}
                status={queue.status}
                expired_at={queue.expired_at}
                server_time={serverTime}
                onAction={(status, reason) =>
                  handleQueueAction(queue.id, status, reason)
                }
              />
            ))
          )}
        </DashboardPanel>

        <DashboardPanel icon={Package} title="Produk" path="/products">
          {latestProducts.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <p className="text-[13px] text-white/30">Tidak ada produk</p>
            </div>
          ) : (
            latestProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                description={product.description}
                price={product.price}
                total_sold={product.total_sold}
                image_url={product.image_url}
                is_available={product.is_available}
              />
            ))
          )}
        </DashboardPanel>

        <DashboardPanel icon={ChartLine} title="Jam Tersibuk" path="/analytics">
          <PeakHourChart
            hourlyTraffic={todayData?.hourly_traffic || []}
            peakHour={todayData?.peak_hour}
          />
        </DashboardPanel>
      </div>
    </div>
  );
}
