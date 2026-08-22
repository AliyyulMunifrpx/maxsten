"use client";

import { useRef, useLayoutEffect, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// DATA STEP
// ==========================================
const STEPS = [
  {
    image: "/image/scan.jpeg",
    title: "Scan QR. Nggak perlu ribet.",
    caption:
      "Pelanggan tinggal scan QR di meja atau kasir. Tanpa download aplikasi, tanpa login, langsung bisa lihat menu dan mulai pesan.",
  },
  {
    image: "/image/catalog.jpeg",
    title: "Lihat menu, pilih sesuka hati.",
    caption:
      "Semua produk sudah tersedia di satu tempat. Pelanggan tinggal pilih, atur jumlah, tambahkan pilihan yang dibutuhkan, lalu kirim pesanan.",
  },
  {
    image: "/image/order-detail.jpeg",
    title: "Pesanan masuk. Beres.",
    caption:
      "Begitu pesanan dibuat, detailnya langsung tercatat. Jadi nggak ada lagi drama salah catat, salah meja, atau pesanan yang tiba-tiba hilang.",
  },
  {
    image: "/image/manage-orders.jpeg",
    title: "Penjual tinggal fokus masak.",
    caption:
      "Pesanan yang masuk langsung terlihat di dashboard. Tinggal cek detail, proses, dan lanjut ke pesanan berikutnya tanpa harus ngurus antrean secara manual.",
  },
  {
    image: "/image/report.jpeg",
    title: "Laporan lengkap, nggak perlu ngitung.",
    caption:
      "Semua transaksi dirangkum. Mau tahu apa yang paling laku, berapa omzet? Tinggal lihat. Bahkan, AI bisa bantu kasih insight biar lo nggak perlu baca angka satu-satu.",
  },
];

function PhoneScreenStep({ innerRef, image }) {
  return (
    <div
      ref={innerRef}
      className="absolute inset-0 flex items-center justify-center bg-black"
      style={{ opacity: 0 }}
    >
      <img src={image} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

export default function SolutionSection() {
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);
  const phoneWrapperRef = useRef(null);
  const phoneScreenRef = useRef(null);
  const logoRef = useRef(null);
  const logoIconRef = useRef(null);
  const logoTextMaskRef = useRef(null);
  const stRef = useRef(null);

  const titleRefs = useRef([]);
  const captionRefs = useRef([]);
  const titlesWrapperRef = useRef(null);
  const captionsWrapperRef = useRef(null);
  const stepScreenRefs = useRef([]);

  const [activeStep, setActiveStep] = useState(-1);

  const STEP_SCROLL_LENGTH = 1200;
  const DESKTOP_BOOT = 1500;
  const MOBILE_BOOT = 800;

  // ==========================================
  // PARALLAX MOUSE EFFECT (Hanya XL ke atas — nyambung sama kemunculan HP)
  // ==========================================
  useEffect(() => {
    const section = sectionRef.current;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const isXlUp = window.matchMedia("(min-width: 1280px)").matches;
    if (!section || !isFinePointer || !isXlUp) return;

    const layers = [
      { el: titlesWrapperRef.current, strength: 30 },
      { el: captionsWrapperRef.current, strength: 30 },
      { el: phoneWrapperRef.current, strength: 15 },
    ].filter((l) => l.el);

    const quickSetters = layers.map(({ el, strength }) => ({
      x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3.out" }),
      strength,
    }));

    const handleMouseMove = (e) => {
      const rect = section.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;

      quickSetters.forEach(({ x, y, strength }) => {
        x(relX * strength);
        y(relY * strength);
      });
    };

    const handleMouseLeave = () => {
      quickSetters.forEach(({ x, y }) => {
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

  // ==========================================
  // GSAP SCROLL ANIMATION DENGAN MATCHMEDIA
  // ==========================================
  useLayoutEffect(() => {
    let mm = gsap.matchMedia();
    const words = gsap.utils.toArray(".prob-word");

    // ----------------------------------------------------
    // 1. TIMELINE DENGAN HP (Cuma XL ke atas)
    // ----------------------------------------------------
    mm.add("(min-width: 1280px)", () => {
      gsap.set(words, { opacity: 0, filter: "blur(10px)", y: 20 });
      gsap.set(phoneWrapperRef.current, { opacity: 0, scale: 0.7, y: 50 });
      gsap.set(logoIconRef.current, { opacity: 0 });
      gsap.set(logoTextMaskRef.current, { clipPath: "inset(0 100% 0 0)" });
      gsap.set(titleRefs.current, { opacity: 0, y: 20 });
      gsap.set(captionRefs.current, { opacity: 0, y: 20 });

      const totalLength = DESKTOP_BOOT + STEPS.length * STEP_SCROLL_LENGTH;

      const master = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${totalLength}`,
          scrub: true,
          pin: true,
          anticipatePin: 1,
        },
      });

      master.to(
        words,
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          stagger: 0.05,
          ease: "power2.out",
          duration: 0.8,
        },
        0,
      );
      master.to(
        words,
        {
          opacity: 0,
          filter: "blur(10px)",
          y: -20,
          stagger: 0.04,
          ease: "power1.inOut",
          duration: 0.5,
        },
        1.5,
      );
      master.to(
        phoneWrapperRef.current,
        { opacity: 1, scale: 1, y: 0, ease: "power2.out", duration: 0.8 },
        1.7,
      );
      master.to(
        logoIconRef.current,
        { opacity: 1, duration: 0.2, ease: "none" },
        2.0,
      );
      master.to(
        logoTextMaskRef.current,
        { clipPath: "inset(0 0% 0 0)", duration: 0.4, ease: "none" },
        2.1,
      );
      master.to(logoRef.current, { opacity: 0, duration: 0.2 }, 2.7);

      master.addLabel("bootDone");
      const stepFraction =
        (STEP_SCROLL_LENGTH / DESKTOP_BOOT) * master.labels.bootDone;

      STEPS.forEach((step, i) => {
        const stepStart = `bootDone+=${i * stepFraction}`;
        if (i > 0) {
          master.to(
            stepScreenRefs.current[i - 1],
            { opacity: 0, duration: stepFraction * 0.3, ease: "power1.inOut" },
            stepStart,
          );
          master.to(
            titleRefs.current[i - 1],
            {
              opacity: 0,
              y: -20,
              duration: stepFraction * 0.15,
              ease: "power1.in",
            },
            stepStart,
          );
          master.to(
            captionRefs.current[i - 1],
            {
              opacity: 0,
              y: -20,
              duration: stepFraction * 0.15,
              ease: "power1.in",
            },
            stepStart,
          );
        }
        master.to(
          stepScreenRefs.current[i],
          { opacity: 1, duration: stepFraction * 0.3, ease: "power2.out" },
          stepStart,
        );
        master.to(
          titleRefs.current[i],
          {
            opacity: 1,
            y: 0,
            duration: stepFraction * 0.2,
            ease: "power2.out",
          },
          `${stepStart}+=${stepFraction * 0.15}`,
        );
        master.to(
          captionRefs.current[i],
          {
            opacity: 1,
            y: 0,
            duration: stepFraction * 0.2,
            ease: "power2.out",
          },
          `${stepStart}+=${stepFraction * 0.15}`,
        );
      });
    });

    // ----------------------------------------------------
    // 2. TIMELINE TANPA HP (Semua di bawah XL, termasuk tablet/md)
    // ----------------------------------------------------
    mm.add("(max-width: 1279px)", () => {
      gsap.set(words, { opacity: 0, y: 20, filter: "none" });
      gsap.set(titleRefs.current, { opacity: 0, y: 20 });
      gsap.set(captionRefs.current, { opacity: 0, y: 20 });

      const totalLengthMobile = MOBILE_BOOT + STEPS.length * STEP_SCROLL_LENGTH;
      let currentStepLocal = -1;

      const master = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${totalLengthMobile}`,
          scrub: true,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const scrollY = self.scroll();
            const start = self.start + MOBILE_BOOT;
            let newStep = -1;

            if (scrollY >= start) {
              newStep = Math.floor((scrollY - start) / STEP_SCROLL_LENGTH);
              newStep = Math.min(Math.max(0, newStep), STEPS.length - 1);
            }

            if (newStep !== currentStepLocal) {
              currentStepLocal = newStep;
              setActiveStep(newStep);
            }
          },
        },
      });

      stRef.current = master.scrollTrigger;

      master.to(
        words,
        { opacity: 1, y: 0, stagger: 0.05, ease: "power2.out", duration: 0.8 },
        0,
      );
      master.to(
        words,
        {
          opacity: 0,
          y: -20,
          stagger: 0.04,
          ease: "power1.inOut",
          duration: 0.5,
        },
        1.5,
      );

      master.addLabel("bootDone");
      const stepFraction = 1;

      STEPS.forEach((step, i) => {
        const stepStart = `bootDone+=${i * stepFraction}`;
        if (i > 0) {
          master.to(
            titleRefs.current[i - 1],
            {
              opacity: 0,
              y: -20,
              duration: stepFraction * 0.3,
              ease: "power1.inOut",
            },
            stepStart,
          );
          master.to(
            captionRefs.current[i - 1],
            {
              opacity: 0,
              y: -20,
              duration: stepFraction * 0.3,
              ease: "power1.inOut",
            },
            stepStart,
          );
        }
        master.to(
          titleRefs.current[i],
          {
            opacity: 1,
            y: 0,
            duration: stepFraction * 0.4,
            ease: "power2.out",
          },
          `${stepStart}+=${stepFraction * 0.2}`,
        );
        master.to(
          captionRefs.current[i],
          {
            opacity: 1,
            y: 0,
            duration: stepFraction * 0.4,
            ease: "power2.out",
          },
          `${stepStart}+=${stepFraction * 0.2}`,
        );
      });
    });

    return () => mm.revert();
  }, []);

  // ==========================================
  // FUNGSI TOMBOL NAVIGASI (Sekarang muncul di semua layar < XL)
  // ==========================================
  const handleNext = () => {
    if (!stRef.current || !window.lenis) return;

    if (activeStep >= STEPS.length - 1) {
      window.lenis.scrollTo(stRef.current.end, { duration: 1.2 });
      return;
    }

    const start = stRef.current.start + MOBILE_BOOT;
    const targetStep = activeStep < 0 ? 0 : activeStep + 1;
    const targetScroll = start + targetStep * STEP_SCROLL_LENGTH + 400;

    window.lenis.scrollTo(targetScroll, { duration: 1.2 });
  };

  const handlePrev = () => {
    if (!stRef.current || !window.lenis) return;

    if (activeStep <= 0) {
      window.lenis.scrollTo(stRef.current.start, { duration: 1.2 });
    } else {
      const start = stRef.current.start + MOBILE_BOOT;
      const targetStep = activeStep - 1;
      const targetScroll = start + targetStep * STEP_SCROLL_LENGTH + 400;
      window.lenis.scrollTo(targetScroll, { duration: 1.2 });
    }
  };

  return (
    <div
      ref={sectionRef}
      className="relative z-0 h-[100dvh] w-full overflow-hidden"
    >
      {/* HEADLINE AWAL */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pointer-events-none">
        <h2
          ref={headlineRef}
          className="font-science text-3xl xl:text-5xl text-center font-bold text-[#C0FE04] leading-tight"
        >
          <span className="prob-word inline-block font-light text-white">
            Gimana
          </span>{" "}
          <span className="prob-word inline-block">Maxsten Bikin </span>
          <br />
          <span className="prob-word inline-block font-light text-white">
            Kerjaan Lu{" "}
          </span>{" "}
          <span className="prob-word inline-block">Makin Gampang?</span>
        </h2>
      </div>

      {/* ==========================================
          FRAME HP & SCREEN (Cuma muncul di XL ke atas)
      ========================================== */}
      <div className="absolute inset-0 z-20 hidden xl:flex items-center justify-center pointer-events-none">
        <div
          ref={phoneWrapperRef}
          className="relative h-[80%] max-h-[800px] inline-block"
        >
          <div
            className="absolute overflow-hidden flex justify-center items-center"
            style={{
              top: "3%",
              left: "6%",
              right: "6%",
              bottom: "3%",
              borderRadius: "2.5rem",
            }}
          >
            <div
              ref={phoneScreenRef}
              className="relative h-full w-[50%] rounded-[20px] flex items-center justify-center overflow-hidden bg-[#1e1e1e]"
            >
              {/* LOGO BOOT MAXSTEN */}
              <div
                ref={logoRef}
                className="absolute z-50 flex items-center justify-center"
              >
                <div className="flex items-center">
                  <div ref={logoIconRef}>
                    <img
                      src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/munivy.svg"
                      alt="Maxsten"
                      className="w-8"
                    />
                  </div>
                  <span className="ml-1 overflow-hidden whitespace-nowrap">
                    <span ref={logoTextMaskRef} className="inline-block">
                      <p className="inline-block pb-1 font-sans text-2xl font-bold text-[#C0FE04]">
                        max<span className="font-normal text-white">sten</span>
                      </p>
                    </span>
                  </span>
                </div>
              </div>

              {/* STEP SCREENS */}
              {STEPS.map((step, i) => (
                <PhoneScreenStep
                  key={i}
                  innerRef={(el) => (stepScreenRefs.current[i] = el)}
                  image={step.image}
                />
              ))}
            </div>
          </div>
          <img
            src="/image/phone-frame.svg"
            alt="Phone Frame"
            className="relative h-full pointer-events-none drop-shadow-2xl"
          />
        </div>
      </div>

      {/* ==========================================
          JUDUL & CAPTION
      ========================================== */}

      {/* JUDUL (Kiri di XL, Atas-Tengah di bawah XL) */}
      <div className="absolute top-[35%] xl:top-1/2 left-0 xl:left-24 -translate-y-1/2 w-full xl:w-[25%] px-6 xl:px-0 pointer-events-none z-30 flex justify-center xl:justify-start">
        <div
          ref={titlesWrapperRef}
          className="relative grid w-full place-items-center xl:place-items-start"
        >
          {STEPS.map((step, i) => {
            const number = i + 1 < 10 ? `0${i + 1}` : i + 1;
            return (
              <h3
                key={`title-${i}`}
                ref={(el) => (titleRefs.current[i] = el)}
                className="col-start-1 row-start-1 font-science text-white text-2xl xl:text-3xl font-bold leading-snug text-center xl:text-left"
              >
                <span className="text-[#C0FE04] block text-xl xl:text-2xl mb-2">
                  {number}.
                </span>
                {step.title}
              </h3>
            );
          })}
        </div>
      </div>

      {/* CAPTION (Kanan di XL, Bawah-Tengah di bawah XL) */}
      <div className="absolute top-[60%] xl:top-1/2 right-0 xl:right-24 -translate-y-1/2 w-full xl:w-[25%] px-6 xl:px-0 pointer-events-none z-30 flex justify-center xl:justify-start">
        <div
          ref={captionsWrapperRef}
          className="relative grid w-full place-items-center xl:place-items-start"
        >
          {STEPS.map((step, i) => (
            <p
              key={`caption-${i}`}
              ref={(el) => (captionRefs.current[i] = el)}
              className="col-start-1 row-start-1 font-science text-white/70 text-base xl:text-lg leading-relaxed text-center xl:text-left"
            >
              {step.caption}
            </p>
          ))}
        </div>
      </div>

      {/* ==========================================
          TOMBOL NAVIGASI (Sekarang muncul di semua layar di bawah XL)
      ========================================== */}
      <div className="absolute bottom-12 left-0 right-0 z-50 flex items-center justify-center gap-4 xl:hidden px-6">
        <button
          onClick={handlePrev}
          className="w-1/2 rounded-full py-4 font-science text-sm font-medium text-white/60 bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
        >
          {activeStep < 0 ? "Ke Atas" : "Kembali"}
        </button>
        <button
          onClick={handleNext}
          className="w-1/2 rounded-full py-4 font-science text-sm font-bold text-[#1e1e1e] bg-[#C0FE04] shadow-[0_0_20px_rgba(192,254,4,0.3)] active:scale-95 transition-transform"
        >
          {activeStep < 0
            ? "Lihat Solusi"
            : activeStep >= STEPS.length - 1
              ? "Selesai"
              : "Lanjut"}
        </button>
      </div>
    </div>
  );
}
