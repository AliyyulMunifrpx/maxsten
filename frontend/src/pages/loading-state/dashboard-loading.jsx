import { motion } from "framer-motion";

// 1. Komponen efek cahaya (Shimmer)
function Shimmer() {
  return (
    <motion.div
      className="absolute top-0 left-0 w-full h-full"
      style={{
        // Membuat gradasi transparan - putih agak pudar - transparan
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
      }}
      // Mulai dari luar layar sebelah kiri (-100%) bergerak ke luar kanan (100%)
      initial={{ x: "-100%" }}
      animate={{ x: "100%" }}
      transition={{
        repeat: Infinity, // Ulangi terus menerus
        duration: 1.5, // Kecepatan animasi (detik)
        ease: "linear", // Gerakan stabil tanpa melambat di ujung
        repeatDelay: 0.2, // Jeda sedikit sebelum cahaya lewat lagi
      }}
    />
  );
}

function MetricCard() {
  return (
    <div className="group relative w-full h-[128px] flex flex-col justify-center bg-white/5 border-none p-[16px] overflow-hidden cursor-pointer">
      <Shimmer />
    </div>
  );
}

function PanelCard() {
  return (
    <div className="group relative w-full h-full flex flex-col justify-center bg-white/5 border-none p-[16px] overflow-hidden cursor-pointer">
      <Shimmer />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="w-full flex flex-col p-[16px] h-full bg-[#1e1e1e] gap-[16px]">
      {/* Main Top Card */}
      <div className="group relative w-full h-[200px] flex flex-col justify-center bg-white/5 border-none p-[16px] overflow-hidden cursor-pointer">
        <Shimmer />
      </div>

      {/* Metric Cards */}
      <div className="w-full flex  grid grid-cols-2 lg:grid-cols-4 gap-[16px]">
        <MetricCard />
        <MetricCard />
        <MetricCard />
        <MetricCard />
      </div>

      {/* Panel Cards */}
      <div className="h-full w-full flex flex-col lg:flex-row gap-[16px]">
        <PanelCard />
        <PanelCard />
        <PanelCard />
      </div>
    </div>
  );
}
