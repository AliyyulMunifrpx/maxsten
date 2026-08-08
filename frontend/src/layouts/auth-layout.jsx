import { Outlet, useLocation } from "react-router-dom";
import DotField from "../components/DotField.jsx";
import GradientWaves from "./../components/GradientWaves";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthLayout() {
  const location = useLocation();
  return (
    <div className="overflow-hidden flex min-h-screen bg-[#1e1e1e]">
      {/* ========================================================
          LEFT PANEL — Desktop Only (Dark Theme) 
      ======================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative hidden md:block md:w-1/2 bg-[#1E1E1E]"
      >
        <div className="z-10 absolute flex justify-center items-center gap-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white">
          <img
            src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/MEWA.webp"
            alt="Maxsten Logo"
            className="w-[10%] h-[10%]"
          />
          <p className="font-bold text-2xl">MAXSTEN</p>
        </div>

        <div
          className="z-5"
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
          }}
        >
          <DotField
            dotRadius={1.5}
            dotSpacing={20}
            bulgeStrength={67}
            glowRadius={160}
            sparkle={false}
            waveAmplitude={0}
            cursorRadius={500}
            cursorForce={0.1}
            bulgeOnly
            gradientFrom="#D99A25"
            gradientTo="#D99A25"
            glowColor="#1e1e1e"
          />
        </div>
        <div
          style={{ width: "100%", height: "600px" }}
          className="z-10 absolute bottom-0"
        >
          <GradientWaves
            horizonColor="#D99A25"
            waveColor="#D99A25"
            crestColor="#D99A25"
            speed={0.4}
            amplitude={2.5}
            waveScale={0.6}
            waveRatio={0.9}
            swell={35}
            turbulence={20}
            tilt={1.11}
            zoom={1}
            height={5.5}
            fogDepth={15}
            detail="medium"
            brightness={1}
            opacity={1}
            mouseInteraction
            parallaxStrength={0.5}
            grain
            grainIntensity={0.05}
          />
        </div>
      </motion.div>

      {/* ========================================================
          RIGHT PANEL — Mobile & Desktop (Yellow Theme) 
      ======================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        // 1. TAMBAHKAN class 'relative' di div ini agar logo bisa di-pin di atas
        className="relative flex w-full items-center justify-center bg-[#1e1e1e] md:bg-[#D99A25] px-4 md:w-1/2"
      >
        {/* 2. LOGO MOBILE - Hanya muncul di HP (md:hidden) */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-3 md:hidden z-10">
          <img
            src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/MEWA.webp"
            alt="Maxsten Logo Mobile"
            // Pakai ukuran pasti (h-10 w-10) supaya gak gepeng di layar kecil
            className="h-10 w-10 object-contain"
          />
          {/* Warna teks pakai gelap (#1e1e1e) supaya kontras dengan background kuning */}
          <p className="font-bold text-2xl text-white">MAXSTEN</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex min-h-screen w-full max-w-md items-center justify-center py-24 md:py-4"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
