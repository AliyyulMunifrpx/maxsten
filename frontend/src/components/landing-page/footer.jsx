"use client";

import { motion } from "framer-motion";

export default function Footer() {
  const socialItems = [
    { label: "Instagram", link: "https://instagram.com/itsaliyyul" },
    { label: "Github", link: "https://github.com/AliyyulMunifrpx" },
    {
      label: "LinkedIn",
      link: "https://www.linkedin.com/in/aliyyul-munif-253b76312?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    },
  ];
  return (
    // 1. FIX TINGGI: Pake min-h-[100dvh] di HP biar leluasa, baru 75dvh di PC
    <div className="relative flex flex-col justify-between bg-[#1e1e1e] min-h-[100dvh] md:min-h-0 md:h-[75dvh] w-full pt-16 md:pt-20 overflow-hidden">
      {/* ==========================================
          BARIS 1: INFO & LINK (Di atas)
      ========================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start w-full px-6 md:px-12 z-10 flex-1">
        {/* Kolom Kiri: CTA Email */}
        {/* 2. FIX LEBAR KIRI: Tambah w-full di mobile biar ga kedorong */}
        <div className="mb-16 md:mb-0 flex flex-col items-start w-full md:w-auto">
          <h3 className="text-white/60 text-md md:text-xl font-science font-medium mb-2 uppercase tracking-widest">
            Punya Pertanyaan?
          </h3>
          <a
            href="mailto:aliyyulmunif780@gmail.com"
            // 3. FIX EMAIL NGALIR: text-2xl di HP, break-all biar kalo kepanjangan turun ke bawah rapi
            className="text-white text-lg md:text-5xl font-science font-bold hover:text-[#C0FE04] transition-colors duration-300 break-all md:break-normal"
          >
            aliyyulmunif780@gmail.com
          </a>

          <motion.a
            href="https://github.com/username-lu/repo-lu" // Ganti link ke GitHub / Case Study Notion lu
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative mt-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-science text-sm tracking-wide text-white backdrop-blur-md transition-colors hover:border-[#C0FE04] hover:bg-[#C0FE04]/10 hover:text-[#C0FE04]"
          >
            {/* Titik hijau berkedip (Pulsing Dot) ala Dev Mode */}
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C0FE04] opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#C0FE04]"></span>
            </span>
            Bagaimana ini dibuat?
            {/* Panah panik kecil */}
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              ➔
            </span>
          </motion.a>
        </div>

        {/* Kolom Kanan: Menu Links */}
        {/* 4. FIX LAYOUT MENU: Pake grid cols-2 di HP biar presisi baginya, ga cuma ngandelin gap */}
        <div className="grid grid-cols-2 gap-8 sm:gap-16 md:flex md:gap-24 w-full md:w-auto mb-12 md:mb-0">
          <div className="flex flex-col gap-4">
            <h4 className="text-white/40 text-sm uppercase tracking-widest font-bold mb-1">
              Sosial
            </h4>
            {socialItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.link}
                target="_blank" // Bikin buka di tab baru
                rel="noreferrer" // Keamanan standar React buat link eksternal
                whileHover={{ x: 5 }}
                className="text-white text-base md:text-lg font-science hover:text-[#C0FE04] transition-colors"
              >
                {item.label}
              </motion.a>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-white/40 text-sm uppercase tracking-widest font-bold mb-1">
              Menu
            </h4>
            {["Beranda", "Masalah", "Solusi", "FAQ"].map((item) => {
              const targetId = `#${item.toLowerCase()}`;

              return (
                <motion.a
                  key={item}
                  href={targetId}
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.lenis) {
                      window.lenis.scrollTo(targetId, {
                        duration: 1.2,
                        easing: (t) =>
                          Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                      });
                    }
                  }}
                  whileHover={{ x: 5 }}
                  className="text-white text-base md:text-lg font-science hover:text-[#C0FE04] transition-colors"
                >
                  {item}
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==========================================
          BARIS 2: TYPOGRAPHY RAKSASA (Di dasar)
      ========================================== */}
      <div className="relative flex flex-col items-center justify-end w-full mt-auto pb-6 md:pb-12">
        <p className="font-sans text-[22vw] leading-none text-white font-black tracking-tighter select-none opacity-10">
          maxsten
        </p>
      </div>
    </div>
  );
}
