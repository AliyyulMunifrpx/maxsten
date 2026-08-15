import { Outlet, useLocation } from "react-router-dom";
import DotField from "../components/DotField.jsx";
import GradientWaves from "../components/GradientWaves";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthLayout() {
  const location = useLocation();

  return (
    <div className="h-[100dvh] w-full bg-[#1e1e1e] p-6 flex items-center justify-center">
      {/* =====================================================
          CARD
      ====================================================== */}
      <div className="w-full max-w-5xl overflow-hidden rounded-[60px] bg-[#27241E] lg:pl-6 py-6">
        <div className="flex w-full overflow-hidden">
          {/* =================================================
              LEFT PANEL — 2 × 2
          ================================================== */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="
              relative
              hidden
              aspect-square
              w-2/3
              overflow-hidden
              bg-[#1e1e1e]
              md:block
              rounded-[40px]
            "
          >
            {/* LOGO */}
            <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-4 text-white">
              <img
                src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/MEWA.webp"
                alt="Maxsten Logo"
                className="h-10 w-10 object-contain"
              />

              <p className="text-2xl font-bold">MAXSTEN</p>
            </div>

            {/* DOT FIELD */}
            <div
              className="absolute inset-0 z-0 h-full w-full"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
              }}
            >
              <div className="h-full w-full">
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
                  gradientFrom="#C0FE04"
                  gradientTo="#C0FE04"
                  glowColor="#1e1e1e"
                />
              </div>
            </div>
            {/* GRADIENT WAVES */}
            <div className="absolute bottom-0 left-0 z-10 h-[500px] w-full">
              <GradientWaves
                horizonColor="#C0FE04"
                waveColor="#C0FE04"
                crestColor="#C0FE04"
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

          {/* =================================================
              RIGHT PANEL — 1 × 2
          ================================================== */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="
              relative
              flex
              min-h-full
              w-full
              items-center
              justify-center
              bg-[#1e1e1e]
              px-6
              md:w-1/3
              bg-[#27241E]
            
            "
          >
            {/* MOBILE LOGO */}
            <div className="absolute left-1/2 top-8 z-10 flex -translate-x-1/2 items-center gap-3 md:hidden">
              <img
                src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/MEWA.webp"
                alt="Maxsten Logo"
                className="h-10 w-10 object-contain"
              />

              <p className="text-2xl font-bold text-white">MAXSTEN</p>
            </div>

            {/* OUTLET */}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="flex w-full max-w-md items-center justify-center py-24 md:py-8"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
