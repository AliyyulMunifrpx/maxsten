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

  const headlineParallaxRef = useRef(null);
  const descParallaxRef = useRef(null);
  const quickSettersRef = useRef([]);

  const div1Ref = useRef(null);
  const div2Ref = useRef(null);
  const div3Ref = useRef(null);
  const green1Ref = useRef(null);
  const green2Ref = useRef(null);
  const green3Ref = useRef(null);

  const solutionHeadlineRef = useRef(null);

  // ==========================================
  // GSAP RESPONSIVE ENGINE (MatchMedia) — TIDAK DIUBAH
  // ==========================================
  useLayoutEffect(() => {
    let mm = gsap.matchMedia();

    const probWords =
      headlineParallaxRef.current.querySelectorAll(".prob-word");
    const solWords = solutionHeadlineRef.current.querySelectorAll(".sol-word");

    mm.add("(min-width: 1024px)", () => {
      const purpleSlides = [div1Ref.current, div2Ref.current, div3Ref.current];
      const greenSlides = [
        green1Ref.current,
        green2Ref.current,
        green3Ref.current,
      ];

      gsap.set(purpleSlides, { xPercent: 100 });
      gsap.set(greenSlides, { xPercent: -100 });
      gsap.set(descParallaxRef.current, { opacity: 0, y: 10 });
      gsap.set(probWords, { opacity: 0, y: 15, filter: "blur(12px)" });
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
        },
      });

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
      tl.to(
        div1Ref.current,
        { xPercent: 0, duration: 1.5, ease: "power2.inOut" },
        1.0,
      );
      tl.to(
        div2Ref.current,
        { xPercent: 0, duration: 1.25, ease: "power2.inOut" },
        1.25,
      );
      tl.to(
        div3Ref.current,
        { xPercent: 0, duration: 1.0, ease: "power2.inOut" },
        1.5,
      );
      tl.to(
        descParallaxRef.current,
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        2.5,
      );
      tl.to(
        green3Ref.current,
        { xPercent: 0, duration: 1.5, ease: "power2.inOut" },
        3.5,
      );
      tl.to(
        green2Ref.current,
        { xPercent: 0, duration: 1.25, ease: "power2.inOut" },
        3.75,
      );
      tl.to(
        green1Ref.current,
        { xPercent: 0, duration: 1.0, ease: "power2.inOut" },
        4.0,
      );
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
    });

    mm.add("(max-width: 1023px)", () => {
      gsap.set(probWords, { opacity: 0, y: 20 });
      gsap.set(descParallaxRef.current, { opacity: 0, y: 20 });
      gsap.set(solutionHeadlineRef.current, { opacity: 1 });
      gsap.set(solWords, { opacity: 0, y: 20 });

      gsap.to(probWords, {
        scrollTrigger: {
          trigger: headlineParallaxRef.current,
          start: "top 80%",
        },
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
      });

      gsap.to(descParallaxRef.current, {
        scrollTrigger: { trigger: descParallaxRef.current, start: "top 85%" },
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
      });

      gsap.to(solWords, {
        scrollTrigger: {
          trigger: solutionHeadlineRef.current,
          start: "top 80%",
        },
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
      });
    });

    return () => mm.revert();
  }, []);

  // ==========================================
  // PARALLAX MOUSE EFFECT — TIDAK DIUBAH
  // ==========================================
  useEffect(() => {
    const section = sectionRef.current;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!section || !isFinePointer) return;

    const layers = [
      { el: headlineParallaxRef.current, strength: 30 },
      { el: descParallaxRef.current, strength: 15 },
      { el: solutionHeadlineRef.current, strength: 30 },
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

  const handleToggle = () => setStep((prev) => (prev === 1 ? 2 : 1));

  return (
    <div
      ref={sectionRef}
      // Mobile: flow normal, gak dipaksa min-h-screen — biar spacing antar
      // section proporsional sama isinya, gak ada gap ngambang.
      className="relative flex w-full flex-col items-center gap-12 py-20 sm:gap-16 sm:py-24 lg:h-[100dvh] bg-white lg:min-h-screen lg:justify-center lg:gap-0 lg:overflow-hidden lg:py-0 pointer-events-auto"
    >
      {/* TIRAI — TIDAK DIUBAH */}
      <div className="pointer-events-none absolute inset-0 z-20 hidden lg:grid grid-cols-[0.1fr_1fr_1fr_1fr_0.1fr] grid-rows-3">
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

      <div className="pointer-events-none absolute inset-0 z-40 hidden lg:grid grid-cols-[0.1fr_1fr_1fr_1fr_0.1fr] grid-rows-3">
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
          1. PROBLEM HEADLINE
      ========================================== */}
      <div
        ref={headlineParallaxRef}
        className="pointer-events-none relative z-10 flex w-full flex-col items-center justify-center px-6 lg:absolute lg:inset-0 lg:px-4"
      >
        <h2 className="text-balance text-center font-science text-xl font-bold leading-tight text-[#4105F7] sm:text-4xl md:text-5xl">
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
          2. DESKRIPSI & TOMBOL TOGGLE
      ========================================== */}
      <div
        ref={descParallaxRef}
        className="pointer-events-auto relative z-30 flex w-full max-w-sm flex-col items-center gap-6 px-6 sm:max-w-md md:w-[60%] md:max-w-none md:px-0 lg:absolute lg:gap-0"
      >
        <div className="flex w-full min-h-[150px] flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-[#4105F7] lg:max-w-[60%] px-6 py-7 lg:min-h-[100px] lg:border-none lg:bg-transparent lg:p-0">
          {/* indikator step — cuma kepake pas card ini masih ada background-nya (mobile) */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 1 ? "w-6 bg-[#C0FE04]" : "w-1.5 bg-white/20"
              }`}
            />
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 2 ? "w-6 bg-[#C0FE04]" : "w-1.5 bg-white/20"
              }`}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center font-science text-xs lg:text-sm leading-relaxed text-white/90 lg:text-base lg:text-[#ffffff]"
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
          className="group flex items-center gap-2 rounded-full bg-[#C0FE04] px-6 py-3 font-science text-xs lg:text-sm font-bold uppercase tracking-widest text-[#1e1e1e] shadow-[0_0_20px_rgba(192,254,4,0.25)] transition-transform active:scale-95 lg:mt-8 lg:rounded-none lg:bg-[linear-gradient(to_right,#C0FE04_50%,white_50%)] lg:bg-[length:200%_100%] lg:bg-[position:100%_0] lg:bg-clip-text lg:px-0 lg:py-0 lg:text-transparent lg:shadow-none lg:transition-[background-position] lg:duration-500 lg:ease-out lg:hover:bg-[position:0_0] lg:active:scale-100"
        >
          <span>{step === 1 ? "selanjutnya" : "kembali"}</span>

          <motion.span
            animate={{ rotate: step === 1 ? 0 : -90 }}
            whileHover={{ x: 4, y: -4 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex rounded-full bg-[#4105F7] p-1 lg:bg-transparent lg:p-0"
          >
            <ArrowUpRight
              size={16}
              strokeWidth={2}
              className="text-white transition-colors duration-500 ease-out group-hover:text-[#1e1e1e] lg:group-hover:text-[#C0FE04]"
            />
          </motion.span>
        </motion.button>
      </div>

      {/* ==========================================
          3. SOLUTION HEADLINE
      ========================================== */}
      <div
        ref={solutionHeadlineRef}
        className="pointer-events-none relative z-50 flex w-full flex-col items-center justify-center px-6 lg:absolute lg:inset-0 lg:px-4"
      >
        <h2 className="text-balance text-center font-science text-xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          <span className="sol-word inline-block text-[#4105F7]">Maxsten</span>{" "}
          <span className="sol-word font-light text-black">
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
