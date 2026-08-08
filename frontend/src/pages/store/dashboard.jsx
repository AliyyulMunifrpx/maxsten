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
import { getDashboard } from "../../hooks/store.js";
import MetricCard from "./../../components/dashboard/metric-card";
import Main from "../../components/dashboard/main.jsx";
import QueueCard from "../../components/dashboard/queue-card.jsx";
import DashboardPanel from "../../components/dashboard/panel.jsx";
import ProductCard from "../../components/dashboard/product-card.jsx";
import PeakHourChart from "../../components/dashboard/chart.jsx";

export default function DashboardPage() {
  const { data, isLoading, isError, error } = getDashboard();
  const navigate = useNavigate();
  console.log(data);
  if (isLoading) {
    return (
      <div className="flex min-h-[64vh] items-center justify-center">
        <p className="text-[16px] text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[64vh] items-center justify-center">
        <p className="text-[16px] text-red-500">
          {error?.response?.data?.errors || "Terjadi kesalahan, coba lagi."}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[64vh] flex-col items-center justify-center gap-[16px] px-[16px] text-center">
        <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#D99A25]/10">
          <Store className="h-[32px] w-[32px] text-[#D99A25]" />
        </div>

        <div className="space-y-[8px]">
          <h2 className="text-[24px] font-semibold">Kamu belum punya toko</h2>
          <p className="max-w-[384px] text-[16px] text-muted-foreground">
            Buat toko dulu buat mulai jualan dan kelola produk kamu di Maxsten.
          </p>
        </div>

        <Button
          onClick={() => navigate("/store/create")}
          className="bg-[#D99A25] text-[#1e1e1e] hover:bg-[#D99A25]/90 h-[48px] px-[24px] rounded-[8px]"
        >
          Buat Toko
        </Button>
      </div>
    );
  }

  const todayData = data.data.today; // ✅ Diperbaiki
  const serverTime = data.data.server_time;
  const oldestActiveQueues = data.data.lists?.oldest_active_queues || [];
  const activeQueuesCount = data.data.lists?.active_queues_count ?? 0;
  const latestProducts = data.data.lists?.latest_products || [];

  const metrics = [
    {
      id: "omzet",
      name: "Total Revenue",
      value: todayData?.omzet?.value || 0,
      trend: todayData?.omzet?.trend || 0,
      color: "yellow",
      format: "currency",
      icon: DollarSign,
    },
    {
      id: "aov",
      name: "Average Order Value",
      value: todayData?.aov?.value || 0,
      trend: todayData?.aov?.trend || 0,
      color: "blue",
      format: "currency",
      icon: LineChart,
    },
    {
      id: "pesanan_selesai",
      name: "Success Order",
      value: todayData?.pesanan_selesai?.value || 0,
      trend: todayData?.pesanan_selesai?.trend || 0,
      color: "green",
      format: "number",
      icon: CheckCircle,
    },
    {
      id: "pesanan_batal",
      name: "Cancelled Order",
      value: todayData?.pesanan_batal?.value || 0,
      trend: todayData?.pesanan_batal?.trend || 0,
      color: "red",
      format: "number",
      icon: XCircle,
    },
  ];

  return (
    <div className="bg-[#1e1e1e] flex flex-col min-h-screen w-full gap-[16px] p-[16px]">
      <Main
        logo={data.data.store.logo_url}
        name={data.data.store.name}
        status={data.data.store.is_open ? "buka" : " tutup"}
      ></Main>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            icon={metric.icon}
            name={metric.name}
            value={metric.value}
            trend={metric.trend}
            color={metric.color}
            format={metric.format}
          />
        ))}
      </div>
      <div className="flex w-full h-full gap-[16px]">
        <DashboardPanel icon={Clock} title="Antrean" count={activeQueuesCount}>
          {oldestActiveQueues.map((queue) => (
            <QueueCard
              key={queue.id}
              id={queue.id}
              queue_number={queue.queue_number}
              status={queue.status}
              expired_at={queue.expired_at}
              server_time={serverTime}
            />
          ))}
        </DashboardPanel>

        <DashboardPanel icon={Package} title="Produk">
          {latestProducts.map((product) => (
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
          ))}
        </DashboardPanel>
        <DashboardPanel icon={ChartLine} title="Jam Tersibuk">
          <PeakHourChart
            hourlyTraffic={todayData?.hourly_traffic || []}
            peakHour={todayData?.peak_hour}
          />
        </DashboardPanel>
      </div>
    </div>
  );
}
