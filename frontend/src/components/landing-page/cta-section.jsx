"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { GridScan } from "./../GridScan"; // Pastikan path import lu bener

// ==========================================
// KOMPONEN MAGNETIC BUTTON
// ==========================================
function MagneticButton({ children }) {
  const ref = useRef(null);

  // Nilai pergerakan X dan Y
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Bikin pergerakannya membal (spring) biar natural, nggak kaku
  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();

    // Hitung jarak kursor dari titik tengah tombol
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);

    // Angka 0.6 ini adalah kekuatan magnetnya.
    // Makin mendekati 1, makin "maksa" nempel ke kursor.
    x.set(middleX * 0.6);
    y.set(middleY * 0.6);
  };

  const reset = () => {
    // Balik ke posisi semula pas kursor pergi
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ x: springX, y: springY }}
      // Efek scale dipindah ke sini biar nggak tabrakan sama CSS Tailwind
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative z-20 flex"
    >
      {children}
    </motion.div>
  );
}

// ==========================================
// SECTION CTA UTAMA
// ==========================================
export default function CtaSection() {
  return (
    <div className="relative h-[100dvh] w-full bg-[#1e1e1e] flex items-center justify-center overflow-hidden">
      {/* ==========================================
          BACKGROUND (Z-0)
      ========================================== */}
      <div className="absolute inset-0 z-0 opacity-80 ">
        <GridScan
          sensitivity={0.01}
          lineThickness={1}
          linesColor="#1e1e1e"
          gridScale={0.1}
          scanColor="#C0FE04"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0}
          lineJitter={0}
          scanGlow={0.5}
          scanSoftness={2}
          enableWebcam={false}
          showPreview={false}
        />
      </div>

      {/* ==========================================
          KONTEN UTAMA (Z-10)
      ========================================== */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 md:px-12 max-w-4xl pointer-events-auto">
        {/* Sub-Headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-science text-white/60 text-lg md:text-xl mb-4 tracking-wide uppercase"
        >
          Masih mau ngurus antrean manual?
        </motion.p>

        {/* Headline Utama */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="font-science text-5xl md:text-5xl font-bold text-white leading-tight mb-10"
        >
          Udahlah, pakai <br />
          <span className="text-[#C0FE04]">Maxsten aja!</span>
        </motion.h2>

        {/* Pembungkus Animasi Masuk (Fade-up) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
        >
          {/* Efek Magnetic Button */}
          <MagneticButton>
            <a
              href="/login"
              className="
                group relative inline-flex items-center justify-center px-10 py-4 
                bg-[#C0FE04] text-[#1e1e1e] font-science text-sm md:text-base font-bold tracking-widest uppercase
                overflow-hidden rounded-full 
                shadow-[0_0_30px_rgba(192,254,4,0.3)] hover:shadow-[0_0_50px_rgba(192,254,4,0.6)]
              "
            >
              {/* Efek Kilap / Shine */}
              <span className="absolute inset-0 h-full w-full -translate-x-full bg-white/40 skew-x-[30deg] transition-transform duration-700 ease-out group-hover:translate-x-full" />

              <span className="relative z-10">Iya deh iya</span>
            </a>
          </MagneticButton>
        </motion.div>
      </div>
    </div>
  );
}
