"use client";

import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useState, useEffect } from "react";
gsap.registerPlugin(ScrollTrigger);
const menuItems = [
  {
    label: "Beranda",
    ariaLabel: "Ke Beranda",
    link: "#beranda",
    id: "beranda",
  },
  {
    label: "Masalah",
    ariaLabel: "Ke Masalah",
    link: "#masalah",
    id: "masalah",
  },
  { label: "Solusi", ariaLabel: "Ke Solusi", link: "#solusi", id: "solusi" },
  { label: "FAQ", ariaLabel: "Ke FAQ", link: "#faq", id: "faq" },
];

const socialItems = [
  { label: "Instagram", link: "https://instagram.com/itsaliyyul" },
  { label: "Gihub", link: "https://github.com/AliyyulMunifrpx" },
  {
    label: "LinkedIn",
    link: "https://www.linkedin.com/in/aliyyul-munif-253b76312?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  },
];

export default function Navbar() {
  const [active, setActive] = useState("Beranda");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const rings = 4;
  useEffect(() => {
    // Kasih jeda dikit (500ms) biar GSAP di HomePage selesai ngebungkus
    // semua section lu pakai pin-spacer sebelum Navbar mulai ngukur posisi.
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        menuItems.forEach((item) => {
          const section = document.getElementById(item.id);

          if (section) {
            ScrollTrigger.create({
              trigger: section,
              start: "top 50%", // Trigger nyala pas pucuk atas section nyentuh tengah layar
              end: "bottom 50%", // Trigger mati pas dasar section nyentuh tengah layar
              // onEnter jalan pas scroll turun, onEnterBack jalan pas scroll naik
              onEnter: () => setActive(item.label),
              onEnterBack: () => setActive(item.label),
            });
          }
        });
      });

      return () => ctx.revert(); // Cleanup GSAP
    }, 500);

    return () => clearTimeout(timer); // Cleanup Timer
  }, []);

  return (
    <>
      {/* ==========================================
          MOBILE MENU OVERLAY
      ========================================== */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[45] flex flex-col items-center justify-center bg-[#1e1e1e] px-6 md:hidden"
          >
            <div className="flex flex-col items-center gap-8">
              {menuItems.map((item, index) => {
                const isActive = active === item.label;
                return (
                  <motion.a
                    key={item.label}
                    href={item.link}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMobileOpen(false);

                      // Panggil dari window!
                      if (window.lenis) {
                        window.lenis.scrollTo(item.link, {
                          duration: 1.2,
                          easing: (t) =>
                            Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                        });
                      }
                    }}
                    className={`font-science text-2xl tracking-wider ${
                      isActive ? "text-[#C0FE04]" : "text-white"
                    }`}
                  >
                    {item.label}
                  </motion.a>
                );
              })}
            </div>

            {/* Socials Mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="absolute bottom-10 flex gap-6"
            >
              {socialItems.map((social) => (
                <a
                  key={social.label}
                  href={social.link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-sans text-sm text-white/60 underline hover:text-[#C0FE04]"
                >
                  {social.label}
                </a>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MAIN NAVBAR
      ========================================== */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 mx-auto flex w-full items-center justify-between mix-blend-exclusion px-6 py-4 md:px-16 pointer-events-none" // pointer-events-none di navbar luar biar ga ngeblok klik di bawahnya
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* LOGO */}
        <motion.a
          href="#beranda"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="z-50 flex items-center pointer-events-auto" // Kembalikan pointer-events di elemen yg bisa di-klik
        >
          <img
            src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/munivy.svg"
            alt="Maxsten"
            className="w-8"
          />
          <span className="ml-1 overflow-hidden whitespace-nowrap">
            <p className="inline-block pb-1 font-sans text-2xl font-bold text-[#C0FE04]">
              max<span className="font-normal text-white">sten</span>
            </p>
          </span>
        </motion.a>

        {/* MENU DESKTOP */}
        <div className="hidden gap-8 md:flex pointer-events-auto">
          {menuItems.map((item, index) => {
            const isActive = active === item.label;

            return (
              <motion.a
                key={item.label}
                href={item.link}
                // ======== TAMBAHIN ONCLICK DI SINI ========
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileOpen(false);

                  // Panggil dari window!
                  if (window.lenis) {
                    window.lenis.scrollTo(item.link, {
                      duration: 1.2,
                      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                    });
                  }
                }}
                // ==========================================
                initial={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: 0.2 + index * 0.1,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`relative font-science text-sm tracking-wide ${
                  isActive
                    ? "text-[#C0FE04]"
                    : `
                      bg-[linear-gradient(to_right,#C0FE04_50%,white_50%)]
                      bg-[length:200%_100%]
                      bg-[position:100%_0]
                      bg-clip-text
                      text-transparent
                      transition-all
                      duration-500
                      ease-out
                      hover:bg-[position:0_0]
                    `
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -right-2 top-0 text-[#C0FE04]">
                    .
                  </span>
                )}
              </motion.a>
            );
          })}
        </div>

        {/* HAMBURGER BUTTON (MOBILE KANAN ATAS) */}
        <div className="flex items-center z-50 md:hidden pointer-events-auto">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="relative flex h-8 w-8 flex-col items-center justify-center gap-[6px]"
            aria-label="Toggle Menu"
          >
            <motion.span
              animate={
                isMobileOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }
              }
              className="h-[2px] w-6 origin-center bg-[#C0FE04]"
            />
            <motion.span
              animate={
                isMobileOpen ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }
              }
              className="h-[2px] w-6 bg-[#C0FE04]"
            />
            <motion.span
              animate={
                isMobileOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }
              }
              className="h-[2px] w-6 origin-center bg-[#C0FE04]"
            />
          </button>
        </div>
      </motion.nav>

      {/* ==========================================
          FOOTER / WATERMARK & GLOBE (TETAP SAMA)
      ========================================== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="pointer-events-none fixed bottom-6 right-12 z-50 h-10 flex items-center hidden mix-blend-difference font-science text-sm text-white md:flex"
      >
        <p>
          Dibuat dengan 🤍 oleh{" "}
          <a
            href="https://instagram.com/itsaliyyul"
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto text-[#C0FE04] hover:underline"
          >
            @itsaliyyul
          </a>
        </p>
      </motion.div>

      <div className="pointer-events-none fixed bottom-6 gap-4 left-12 z-50 hidden md:flex items-center mix-blend-difference">
        <div className="relative w-10 h-10" style={{ perspective: "800px" }}>
          <motion.div
            className="w-full h-full relative"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: 360 }}
            transition={{
              repeat: Infinity,
              duration: 8,
              ease: "linear",
            }}
          >
            {[...Array(rings)].map((_, i) => (
              <div
                key={`ring-${i}`}
                className="absolute inset-0 border-[2px] border-[#ffffff] rounded-full opacity-60"
                style={{ transform: `rotateY(${(180 / rings) * i}deg)` }}
              />
            ))}
          </motion.div>
        </div>
        <p className="text-sm font-science text-white pointer-events-auto">
          © 2026 Maxsten. Seluruh hak dilindungi undang-undang.
        </p>
      </div>
    </>
  );
}
