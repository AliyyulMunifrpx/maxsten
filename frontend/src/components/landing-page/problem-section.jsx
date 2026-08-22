"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function ProblemSection() {
  const sectionRef = useRef(null);
  const [step, setStep] = useState(1);

  const headlineParallaxRef = useRef(null); // Dipakai buat parallax & target GSAP Problem Headline
  const descParallaxRef = useRef(null);
  const quickSettersRef = useRef([]);

  // Ref buat tirai ungu (Kanan ke Kiri)
  const div1Ref = useRef(null);
  const div2Ref = useRef(null);
  const div3Ref = useRef(null);

  // Ref buat tirai hijau (Kiri ke Kanan)
  const green1Ref = useRef(null);
  const green2Ref = useRef(null);
  const green3Ref = useRef(null);

  // Ref buat Solution Headline
  const solutionHeadlineRef = useRef(null);

  // ==========================================
  // GSAP PINNING & TIMELINE
  // ==========================================
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const purpleSlides = [div1Ref.current, div2Ref.current, div3Ref.current];
      const greenSlides = [
        green1Ref.current,
        green2Ref.current,
        green3Ref.current,
      ];

      // Setup awal elemen-elemen GSAP
      gsap.set(purpleSlides, { xPercent: 100 });
      gsap.set(greenSlides, { xPercent: -100 });
      gsap.set(descParallaxRef.current, { opacity: 0, y: 10 });

      // Setup Problem Headline (Sembunyikan & Blur di awal)
      const probWords =
        headlineParallaxRef.current.querySelectorAll(".prob-word");
      gsap.set(probWords, { opacity: 0, y: 15, filter: "blur(12px)" });

      // Setup Solution Headline (Sembunyikan & Blur di awal)
      const solWords =
        solutionHeadlineRef.current.querySelectorAll(".sol-word");
      gsap.set(solutionHeadlineRef.current, { opacity: 0 });
      gsap.set(solWords, { opacity: 0, y: 15, filter: "blur(12px)" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=4000",
          scrub: true,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // --- PHASE 1: PROBLEM HEADLINE REVEAL DENGAN SCRUB ---
      tl.to(
        probWords,
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: "power2.out",
        },
        0,
      );

      // --- PHASE 2: TIRAI UNGU MASUK (Target Selesai Bareng di detik 2.5) ---
      // Mulai di 1.0 -> butuh durasi 1.5 detik buat nyampe di 2.5
      tl.to(
        div1Ref.current,
        { xPercent: 0, duration: 1.5, ease: "power2.inOut" },
        1.0,
      );
      // Mulai di 1.25 -> butuh durasi 1.25 detik buat nyampe di 2.5
      tl.to(
        div2Ref.current,
        { xPercent: 0, duration: 1.25, ease: "power2.inOut" },
        1.25,
      );
      // Mulai di 1.5 -> butuh durasi 1.0 detik buat nyampe di 2.5 (Paling ngebut)
      tl.to(
        div3Ref.current,
        { xPercent: 0, duration: 1.0, ease: "power2.inOut" },
        1.5,
      );

      // --- PHASE 3: DESKRIPSI MASUK ---
      tl.to(
        descParallaxRef.current,
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        2.5, // Pas banget tirai ungu selesai, teks muncul
      );

      // --- PHASE 4: TIRAI HIJAU MASUK (Target Selesai Bareng di detik 5.0) ---
      // Mulai di 3.5 -> durasi 1.5
      tl.to(
        green3Ref.current,
        { xPercent: 0, duration: 1.5, ease: "power2.inOut" },
        3.5,
      );
      // Mulai di 3.75 -> durasi 1.25
      tl.to(
        green2Ref.current,
        { xPercent: 0, duration: 1.25, ease: "power2.inOut" },
        3.75,
      );
      // Mulai di 4.0 -> durasi 1.0 (Paling ngebut)
      tl.to(
        green1Ref.current,
        { xPercent: 0, duration: 1.0, ease: "power2.inOut" },
        4.0,
      );

      // --- PHASE 5: SOLUTION HEADLINE MUNCUL ---
      // Mundurin start-nya dari 4.0 ke 5.0 biar pas tirai hijau nutup full, teksnya baru nongol
      tl.set(solutionHeadlineRef.current, { opacity: 1 }, 5.0);
      tl.to(
        solWords,
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          stagger: 0.2,
          duration: 0.8,
          ease: "easeOut",
        },
        5.0,
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // ==========================================
  // PARALLAX MOUSE EFFECT
  // ==========================================
  useEffect(() => {
    const section = sectionRef.current;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!section || !isFinePointer) return;

    // Menambahkan solutionHeadlineRef ke array layers
    const layers = [
      { el: headlineParallaxRef.current, strength: 30 },
      { el: descParallaxRef.current, strength: 15 },
      { el: solutionHeadlineRef.current, strength: 30 }, // <-- Ini tambahannya
    ].filter((l) => l.el);

    quickSettersRef.current = layers.map(({ el, strength }) => ({
      x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3.out" }),
      strength,
    }));

    const handleMouseMove = (e) => {
      const rect = section.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;

      quickSettersRef.current.forEach(({ x, y, strength }) => {
        x(relX * strength);
        y(relY * strength);
      });
    };

    const handleMouseLeave = () => {
      quickSettersRef.current.forEach(({ x, y }) => {
        x(0);
        y(0);
      });
    };

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleToggle = () => {
    setStep((prev) => (prev === 1 ? 2 : 1));
  };

  return (
    <div
      ref={sectionRef}
      className="relative h-[100vh] lg:h-[100dvh] pointer-events-auto w-full flex flex-col items-center justify-center gap-12 overflow-hidden bg-white"
    >
      {/* ==========================================
        PURPLE CURTAIN (Z-20, Menutupi Headline)
    ========================================== */}
      <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-[0.1fr_1fr_1fr_1fr_0.1fr] grid-rows-3">
        <div
          ref={div1Ref}
          className="col-start-1 col-end-6 row-start-1 h-full w-full bg-[#4105F7]"
        />
        <div
          ref={div2Ref}
          className="col-start-1 col-end-6 row-start-2 h-full w-full bg-[#4105F7]"
        />
        <div
          ref={div3Ref}
          className="col-start-1 col-end-6 row-start-3 h-full w-full bg-[#4105F7]"
        />
      </div>

      {/* ==========================================
        GREEN CURTAIN (Z-40, Menutupi Ungu & Deskripsi)
    ========================================== */}
      <div className="pointer-events-none absolute inset-0 z-40 grid grid-cols-[0.1fr_1fr_1fr_1fr_0.1fr] grid-rows-3">
        <div
          ref={green1Ref}
          className="col-start-1 col-end-6 row-start-1 h-full w-full bg-[#C0FE04]"
        />

        <div
          ref={green2Ref}
          className="col-start-1 col-end-6 row-start-2 h-full w-full bg-[#C0FE04]"
        />
        <div
          ref={green3Ref}
          className="col-start-1 col-end-6 row-start-3 h-full w-full bg-[#C0FE04]"
        />
      </div>

      {/* ==========================================
        PROBLEM HEADLINE (Z-10)
    ========================================== */}
      <div
        ref={headlineParallaxRef}
        className="z-10 flex w-full flex-col items-center justify-center px-4 pointer-events-none"
      >
        <h2 className="font-science text-4xl md:text-5xl text-center font-bold text-[#4105F7] leading-tight">
          <span className="prob-word inline-block">Warung Rame</span>{" "}
          <span className="prob-word inline-block font-light text-[#1e1e1e]">
            Emang Bikin Seneng,
          </span>
          <br />
          <span className="prob-word inline-block font-light text-[#1e1e1e]">
            Tapi Yakin
          </span>{" "}
          <span className="prob-word inline-block">Mental Lu Aman?</span>
        </h2>
      </div>

      {/* ==========================================
        DESKRIPSI (Z-30, Menimpa Ungu, Ditimpa Hijau)
    ========================================== */}
      <div
        ref={descParallaxRef}
        className="absolute pointer-events-auto z-30 flex w-[90%] max-w-xl flex-col items-center justify-center text-center md:w-[60%]"
      >
        <div className="flex min-h-[100px] items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="font-science text-sm leading-relaxed text-white/80 md:text-base"
            >
              {step === 1
                ? "Pembeli yang udah sabar nunggu malah nggak ke-notice, sementara yang baru datang malah dilayanin dulu. Ujung-ujungnya? Pelanggan lu kecewa, ngerasa nggak dihargai, dan kapok balik lagi."
                : "Suasana yang chaos bikin lo gampang lupa. Pesanan meja 4 malah dikasih ke meja 2. Hasilnya? Lu rugi bahan baku karena harus masak ulang, plus reputasi warung hancur gara-gara review jelek."}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          onClick={handleToggle}
          className="
    group mt-8 flex cursor-pointer items-center gap-2
    font-science text-sm font-bold tracking-widest uppercase
    bg-[linear-gradient(to_right,#C0FE04_50%,white_50%)]
    bg-[length:200%_100%]
    bg-[position:100%_0]
    bg-clip-text text-transparent
    transition-[background-position]
    duration-500
    ease-out
    hover:bg-[position:0_0]
  "
        >
          <span>{step === 1 ? "selanjutnya" : "kembali"}</span>

          <motion.span
            animate={{
              rotate: step === 1 ? 0 : -90,
            }}
            whileHover={{
              x: 4,
              y: -4,
            }}
            transition={{
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex"
          >
            <ArrowUpRight
              size={16}
              strokeWidth={2}
              // Hapus stroke-current, ganti dengan warna statis + efek transisi grup
              className="text-white transition-colors duration-500 ease-out group-hover:text-[#C0FE04]"
            />
          </motion.span>
        </motion.button>
      </div>

      {/* ==========================================
        SOLUTION HEADLINE (Z-50 Paling Atas)
    ========================================== */}
      <div
        ref={solutionHeadlineRef}
        className="absolute inset-0 z-50 flex w-full flex-col items-center justify-center px-4 pointer-events-none"
      >
        <h2 className="text-4xl font-science md:text-xl lg:text-5xl font-bold text-center leading-tight">
          <span className="sol-word inline-block text-[#4105F7]">Maxsten</span>{" "}
          <span className="sol-word text-black font-light">
            Ambil Alih Ribetnya, <br className="hidden md:block" />
            Lu Tinggal{" "}
          </span>
          <span className="sol-word inline-block text-[#4105F7]">
            Fokus Masak
          </span>
        </h2>
      </div>
    </div>
  );
}
