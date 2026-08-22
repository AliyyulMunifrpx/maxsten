"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// DUMMY DATA FAQ (Sesuaikan sama Maxsten)
// ==========================================
const FAQ_DATA = [
  {
    question: "Maxsten cocok buat siapa?",
    answer:
      "Maxsten cocok buat bisnis yang punya proses pemesanan dan antrean yang mulai bikin kewalahan mulai dari warung, kedai, kafe, sampai bisnis dengan volume pesanan yang lebih besar.",
  },
  {
    question: "Pelanggan harus bikin akun dulu nggak?",
    answer:
      "Nggak sama sekali! Pelanggan tinggal scan QR di meja, pilih menu, dan kirim pesanan. Semudah nge-chat teman, nggak ada friction sama sekali.",
  },
  {
    question: "Gimana kalau ada menu yang mendadak habis?",
    answer:
      "Lu bisa langsung update status menu di dashboard penjual. Real-time detik itu juga menu tersebut akan berubah jadi 'Habis' di layar pelanggan yang lagi scan.",
  },
  {
    question: "Bisa dipakai buat warung kecil yang pelayannya dikit?",
    answer:
      "Sangat bisa! Justru Maxsten didesain untuk membasmi chaos di warung yang pelayannya terbatas. Biar pelanggan nggak nunggu lama cuma buat order.",
  },
  {
    question: "Ada biaya langganan bulanan?",
    answer:
      "Ngga ada, karena aku orangnya baik ya, jadi semua gratis termasuk fitur AI (kalau ini tergantung penyedia AI nya sih, kalau dia minta bayar, yaudah aku matiin aja fitur AI nya)",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const sectionRef = useRef(null);
  const listContainerRef = useRef(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // ==========================================
  // GSAP SCRUB ANIMATION
  // ==========================================
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Animasi Scrub untuk Header
      gsap.fromTo(
        ".faq-header",
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%", // Mulai pas ujung atas section masuk 80% layar
            end: "top 30%", // Selesai pas nyampe 30% dari atas
            scrub: 1, // Angka 1 bikin scrub-nya smooth, nggak kaku
          },
        },
      );

      // 2. Animasi Scrub untuk Tiap Item FAQ (Muncul Stagger/Gantian)
      gsap.fromTo(
        ".faq-item",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.1, // Jarak muncul antar item FAQ
          scrollTrigger: {
            trigger: listContainerRef.current,
            start: "top 85%",
            end: "bottom 80%", // Selesai pas list udah cukup naik
            scrub: 1,
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 py-24 md:px-12 "
    >
      {/* ==========================================
          HEADER SECTION
      ========================================== */}
      <div className="faq-header mb-16 flex flex-col items-center text-center z-10">
        <h2 className="font-science text-4xl font-bold leading-tight text-white md:text-5xl">
          Paling Sering <br />
          <span className="text-[#C0FE04]">Ditanyain.</span>
        </h2>
      </div>

      {/* ==========================================
          ACCORDION LIST
      ========================================== */}
      <div ref={listContainerRef} className="z-10 w-full max-w-3xl">
        {FAQ_DATA.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            // Ganti motion.div jadi div biasa untuk pembungkus luar,
            // karena GSAP yang pegang kendali Y & Opacity sekarang.
            <div key={index} className="faq-item">
              {/* TOMBOL TOGGLE */}
              <button
                onClick={() => toggleFaq(index)}
                className="group flex w-full items-center justify-between py-6 text-left transition-colors"
              >
                <span
                  className={`font-science text-lg md:text-xl transition-colors duration-300 ${
                    isOpen
                      ? "text-[#C0FE04]"
                      : "text-white group-hover:text-[#C0FE04]"
                  }`}
                >
                  {item.question}
                </span>

                {/* ICON PLUS / MINUS (Masih pakai Framer Motion) */}
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                    isOpen
                      ? "border-[#C0FE04] bg-[#C0FE04] text-[#1e1e1e]"
                      : "border-white/20 text-white group-hover:border-[#C0FE04] group-hover:text-[#C0FE04]"
                  }`}
                >
                  {isOpen ? (
                    <Minus size={16} strokeWidth={3} />
                  ) : (
                    <Plus size={16} strokeWidth={3} />
                  )}
                </motion.div>
              </button>

              {/* ISI JAWABAN (ANIMASI BUKA TUTUP) */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-8 pr-12 font-science text-base leading-relaxed text-white/70">
                      {item.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
