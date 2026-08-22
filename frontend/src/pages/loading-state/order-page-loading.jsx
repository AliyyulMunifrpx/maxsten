import { motion } from "framer-motion";

// 1. Komponen efek cahaya (Shimmer)
function Shimmer() {
  return (
    <motion.div
      className="absolute top-0 left-0 w-full h-full"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
      }}
      initial={{ x: "-100%" }}
      animate={{ x: "100%" }}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: "linear",
        repeatDelay: 0.2,
      }}
    />
  );
}

// 2. Queue Card Skeleton
function QueueCard() {
  return (
    // ✅ Di sini sudah benar ada 'relative' dan 'overflow-hidden'
    <div className="relative h-full min-h-[120px] flex flex-col w-full rounded-none p-[8px] overflow-hidden gap-[8px] bg-white/5 border-none cursor-pointer transition-opacity duration-300">
      <Shimmer />
    </div>
  );
}

export default function QueuePageLoading() {
  return (
    <div className="w-full flex flex-col p-[16px] h-full bg-[#1e1e1e] gap-[16px]">
      {/* ✅ PERBAIKAN: Tambahkan 'relative' di sini */}
      <div className="relative w-full h-[5%]  overflow-hidden bg-white/5 border-none">
        <Shimmer />
      </div>

      {/* ✅ PERBAIKAN: Tambahkan 'relative' di sini */}
      <div className="relative w-full h-[5%]  overflow-hidden bg-white/5 border-none">
        <Shimmer />
      </div>

      <div className="w-full h-full grid grid-cols-2 lg:grid-cols-5 gap-[16px]">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`
        ${i >= 6 ? "hidden lg:block" : ""}
        ${i >= 8 ? "lg:hidden xl:block" : ""}
      `}
          >
            <QueueCard />
          </div>
        ))}
      </div>
    </div>
  );
}
