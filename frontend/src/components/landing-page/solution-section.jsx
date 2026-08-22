"use client";

import { useRef, useLayoutEffect, useEffect } from "react";
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

  // Referensi khusus Desktop
  const phoneWrapperRef = useRef(null);
  const phoneScreenRef = useRef(null);
  const logoRef = useRef(null);
  const logoIconRef = useRef(null);
  const logoTextMaskRef = useRef(null);
  const titleRefs = useRef([]);
  const captionRefs = useRef([]);
  const titlesWrapperRef = useRef(null);
  const captionsWrapperRef = useRef(null);
  const stepScreenRefs = useRef([]);

  const STEP_SCROLL_LENGTH = 1200;
  const DESKTOP_BOOT = 1500;

  // ==========================================
  // PARALLAX MOUSE EFFECT (Hanya Desktop)
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

    // ----------------------------------------------------
    // 1. TIMELINE DESKTOP (XL ke Atas) -> Mode Pin & Scrub
    // ----------------------------------------------------
    mm.add("(min-width: 1280px)", () => {
      const words = gsap.utils.toArray(".desktop-prob-word");

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

      master.to(words, { opacity: 1, filter: "blur(0px)", y: 0, stagger: 0.05, ease: "power2.out", duration: 0.8 }, 0);
      master.to(words, { opacity: 0, filter: "blur(10px)", y: -20, stagger: 0.04, ease: "power1.inOut", duration: 0.5 }, 1.5);
      master.to(phoneWrapperRef.current, { opacity: 1, scale: 1, y: 0, ease: "power2.out", duration: 0.8 }, 1.7);
      master.to(logoIconRef.current, { opacity: 1, duration: 0.2, ease: "none" }, 2.0);
      master.to(logoTextMaskRef.current, { clipPath: "inset(0 0% 0 0)", duration: 0.4, ease: "none" }, 2.1);
      master.to(logoRef.current, { opacity: 0, duration: 0.2 }, 2.7);

      master.addLabel("bootDone");
      const stepFraction = (STEP_SCROLL_LENGTH / DESKTOP_BOOT) * master.labels.bootDone;

      STEPS.forEach((step, i) => {
        const stepStart = `bootDone+=${i * stepFraction}`;
        if (i > 0) {
          master.to(stepScreenRefs.current[i - 1], { opacity: 0, duration: stepFraction * 0.3, ease: "power1.inOut" }, stepStart);
          master.to(titleRefs.current[i - 1], { opacity: 0, y: -20, duration: stepFraction * 0.15, ease: "power1.in" }, stepStart);
          master.to(captionRefs.current[i - 1], { opacity: 0, y: -20, duration: stepFraction * 0.15, ease: "power1.in" }, stepStart);
        }
        master.to(stepScreenRefs.current[i], { opacity: 1, duration: stepFraction * 0.3, ease: "power2.out" }, stepStart);
        master.to(titleRefs.current[i], { opacity: 1, y: 0, duration: stepFraction * 0.2, ease: "power2.out" }, `${stepStart}+=${stepFraction * 0.15}`);
        master.to(captionRefs.current[i], { opacity: 1, y: 0, duration: stepFraction * 0.2, ease: "power2.out" }, `${stepStart}+=${stepFraction * 0.15}`);
      });
    });

    // ----------------------------------------------------
    // 2. TIMELINE MOBILE (Bawah XL) -> Reveal Ringan & Bebas Scroll
    // ----------------------------------------------------
    mm.add("(max-width: 1279px)", () => {
      const mobileWords = gsap.utils.toArray(".mobile-prob-word");
      const mobileSteps = gsap.utils.toArray(".mobile-step");

      // Set awal biar ngumpet sebelum di-scroll
      gsap.set(mobileWords, { opacity: 0, y: 20 });
      gsap.set(mobileSteps, { opacity: 0, y: 30 });

      // Trigger pas user nge-scroll ke bagian ini
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%", // Mulai animasi pas elemen 25% masuk layar
        }
      });

      // Animasi Judul masuk duluan
      tl.to(mobileWords, { opacity: 1, y: 0, stagger: 0.05, duration: 0.6, ease: "power2.out" });
      
      // Diikuti sama daftar steps yang muncul satu per satu (Stagger)
      tl.to(mobileSteps, { opacity: 1, y: 0, stagger: 0.15, duration: 0.8, ease: "power2.out" }, "-=0.2");
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={sectionRef} className="relative z-0 w-full">
      
      {/* ==========================================
          LAYOUT DESKTOP (Pinned & Absolute)
      ========================================== */}
      <div className="hidden xl:block relative h-[100dvh] w-full overflow-hidden">
        {/* HEADLINE AWAL */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pointer-events-none">
          <h2 className="font-science text-5xl text-center font-bold text-[#C0FE04] leading-tight">
            <span className="desktop-prob-word inline-block font-light text-white">Gimana</span>{" "}
            <span className="desktop-prob-word inline-block">Maxsten Bikin </span>
            <br />
            <span className="desktop-prob-word inline-block font-light text-white">Kerjaan Lu </span>{" "}
            <span className="desktop-prob-word inline-block">Makin Gampang?</span>
          </h2>
        </div>

        {/* FRAME HP & SCREEN */}
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div ref={phoneWrapperRef} className="relative h-[80%] max-h-[800px] inline-block">
            <div
              className="absolute overflow-hidden flex justify-center items-center"
              style={{ top: "3%", left: "6%", right: "6%", bottom: "3%", borderRadius: "2.5rem" }}
            >
              <div ref={phoneScreenRef} className="relative h-full w-[50%] rounded-[20px] flex items-center justify-center overflow-hidden bg-[#1e1e1e]">
                <div ref={logoRef} className="absolute z-50 flex items-center justify-center">
                  <div className="flex items-center">
                    <div ref={logoIconRef}>
                      <img src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/munivy.svg" alt="Maxsten" className="w-8" />
                    </div>
                    <span className="ml-1 overflow-hidden whitespace-nowrap">
                      <span ref={logoTextMaskRef} className="inline-block">
                        <p className="inline-block pb-1 font-sans text-2xl font-bold text-[#C0FE04]">max<span className="font-normal text-white">sten</span></p>
                      </span>
                    </span>
                  </div>
                </div>

                {STEPS.map((step, i) => (
                  <PhoneScreenStep key={i} innerRef={(el) => (stepScreenRefs.current[i] = el)} image={step.image} />
                ))}
              </div>
            </div>
            <img src="/image/phone-frame.svg" alt="Phone Frame" className="relative h-full pointer-events-none drop-shadow-2xl" />
          </div>
        </div>

        {/* JUDUL & CAPTION */}
        <div className="absolute top-1/2 left-24 -translate-y-1/2 w-[25%] pointer-events-none z-30 flex justify-start">
          <div ref={titlesWrapperRef} className="relative grid w-full place-items-start">
            {STEPS.map((step, i) => {
              const number = i + 1 < 10 ? `0${i + 1}` : i + 1;
              return (
                <h3 key={`title-${i}`} ref={(el) => (titleRefs.current[i] = el)} className="col-start-1 row-start-1 font-science text-white text-3xl font-bold leading-snug text-left">
                  <span className="text-[#C0FE04] block text-2xl mb-2">{number}.</span>
                  {step.title}
                </h3>
              );
            })}
          </div>
        </div>

        <div className="absolute top-1/2 right-24 -translate-y-1/2 w-[25%] pointer-events-none z-30 flex justify-start">
          <div ref={captionsWrapperRef} className="relative grid w-full place-items-start">
            {STEPS.map((step, i) => (
              <p key={`caption-${i}`} ref={(el) => (captionRefs.current[i] = el)} className="col-start-1 row-start-1 font-science text-white/70 text-lg leading-relaxed text-left">
                {step.caption}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ==========================================
          LAYOUT MOBILE (Normal Scroll & Vertical Timeline)
      ========================================== */}
      <div className="xl:hidden flex flex-col w-full px-6 py-20 min-h-screen">
        
        {/* HEADLINE MOBILE */}
        <div className="mb-16">
          <h2 className="font-science text-3xl md:text-4xl font-bold text-[#C0FE04] leading-tight">
            <span className="mobile-prob-word inline-block font-light text-white">Gimana</span>{" "}
            <span className="mobile-prob-word inline-block">Maxsten Bikin </span>
            <br />
            <span className="mobile-prob-word inline-block font-light text-white">Kerjaan Lu </span>{" "}
            <span className="mobile-prob-word inline-block">Makin Gampang?</span>
          </h2>
        </div>

        {/* LIST STEP MOBILE (Timeline Vertikal) */}
        <div className="flex flex-col gap-10">
          {STEPS.map((step, i) => {
            const number = i + 1 < 10 ? `0${i + 1}` : i + 1;
            return (
              <div key={i} className="mobile-step flex flex-col border-l-2 border-white/10 pl-6 relative">
                {/* Titik indikator timeline */}
                <div className="absolute -left-[9px] top-2 h-4 w-4 rounded-full bg-[#1e1e1e] border-2 border-[#C0FE04]"></div>
                
                <span className="text-[#C0FE04] font-science text-xl mb-1 font-bold">{number}.</span>
                <h3 className="font-science text-white text-2xl font-bold leading-snug mb-3">
                  {step.title}
                </h3>
                <p className="font-science text-white/70 text-base leading-relaxed">
                  {step.caption}
                </p>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
