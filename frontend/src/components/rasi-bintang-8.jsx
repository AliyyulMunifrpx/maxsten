"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// DATA KOORDINAT RASI BINTANG (Semua Set ke 8 Titik & 8 Garis)
// ==========================================
const CONSTELLATIONS = {
  scorpius: {
    name: "Scorpius",
    subtitle: "Sang Kalajengking",
    points: [
      { x: -0.3, y: -0.6 }, // Capit Kiri
      { x: 0.3, y: -0.6 }, // Capit Kanan
      { x: 0, y: -0.4 }, // Kepala / Mahkota
      { x: 0, y: -0.1 }, // Jantung (Antares)
      { x: -0.1, y: 0.3 }, // Badan bawah
      { x: -0.3, y: 0.6 }, // Pangkal Ekor
      { x: -0.6, y: 0.5 }, // Lengkungan Ekor
      { x: -0.5, y: 0.2 }, // Ujung Sengat
    ],
    lines: [
      [0, 2], // Capit kiri ke Kepala
      [1, 2], // Capit kanan ke Kepala
      [2, 3], // Kepala ke Jantung
      [3, 4], // Jantung ke Badan
      [4, 5], // Badan ke Pangkal Ekor
      [5, 6], // Pangkal ke Lengkungan Ekor
      [6, 7], // Lengkungan ke Sengat
      [7, 7], // Garis Palsu (Biar genap 8 garis untuk animasi GSAP)
    ],
  },
  cygnus: {
    name: "Cygnus",
    subtitle: "Angsa (Salib Utara)",
    points: [
      { x: 0, y: 0.6 }, // Kepala Angsa (Albireo)
      { x: 0, y: 0 }, // Jantung / Dada (Sadr)
      { x: 0, y: -0.4 }, // Badan Tengah
      { x: 0, y: -0.7 }, // Ekor (Deneb)
      { x: -0.4, y: -0.1 }, // Sayap Kiri Dalam
      { x: -0.8, y: -0.3 }, // Sayap Kiri Luar
      { x: 0.4, y: -0.1 }, // Sayap Kanan Dalam
      { x: 0.8, y: -0.3 }, // Sayap Kanan Luar
    ],
    lines: [
      [0, 1], // Kepala ke Jantung
      [1, 2], // Jantung ke Badan
      [2, 3], // Badan ke Ekor
      [1, 4], // Jantung ke Sayap Kiri Dalam
      [4, 5], // Sayap Kiri Dalam ke Luar
      [1, 6], // Jantung ke Sayap Kanan Dalam
      [6, 7], // Sayap Kanan Dalam ke Luar
      [7, 7], // Garis Palsu
    ],
  },
  draco: {
    name: "Draco",
    subtitle: "Sang Naga",
    points: [
      { x: -0.4, y: -0.6 }, // Sudut Kepala 1
      { x: -0.7, y: -0.6 }, // Sudut Kepala 2
      { x: -0.6, y: -0.3 }, // Sudut Kepala 3
      { x: -0.3, y: -0.3 }, // Sudut Kepala 4
      { x: 0, y: -0.1 }, // Leher Naga
      { x: 0.5, y: -0.4 }, // Liukan Badan 1
      { x: 0.3, y: 0.3 }, // Liukan Badan 2
      { x: -0.2, y: 0.6 }, // Ujung Ekor Naga
    ],
    lines: [
      [0, 1], // Kepala atas
      [1, 2], // Kepala kiri
      [2, 3], // Kepala bawah
      [3, 0], // Kepala kanan (menutup kotak kepala)
      [3, 4], // Kepala ke Leher
      [4, 5], // Leher ke Liukan 1
      [5, 6], // Liukan 1 ke Liukan 2
      [6, 7], // Liukan 2 ke Ekor
    ],
  },
};

const ORDER = ["scorpius", "cygnus", "draco"];

export default function ConstellationCycler8({
  scale = 300,
  color = "#ffffff",
  intervalMs = 5000,
  className = "",
}) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isAnimating = useRef(false);
  const hasRevealed = useRef(false);

  const activeKey = ORDER[activeIndex];

  // Copy koordinat awal supaya bisa di-mutate oleh GSAP
  const pointsRef = useRef(
    CONSTELLATIONS[ORDER[0]].points.map((p) => ({ ...p })),
  );

  const lineRefs = useRef([]);
  const starRefs = useRef([]);
  const activeLinesRef = useRef(CONSTELLATIONS[activeKey].lines);

  // FUNGSI SUPER: Menggambar ulang Garis dan Titik
  const redraw = () => {
    const pts = pointsRef.current;

    // Gambar Garis
    activeLinesRef.current.forEach(([from, to], i) => {
      const lineEl = lineRefs.current[i];
      if (!lineEl) return;
      const p1 = pts[from];
      const p2 = pts[to];
      lineEl.setAttribute("x1", p1.x * scale);
      lineEl.setAttribute("y1", p1.y * scale);
      lineEl.setAttribute("x2", p2.x * scale);
      lineEl.setAttribute("y2", p2.y * scale);
    });

    // Gambar Titik Bintang
    pts.forEach((p, i) => {
      const starEl = starRefs.current[i];
      if (!starEl) return;
      starEl.setAttribute(
        "transform",
        `translate(${p.x * scale}, ${p.y * scale})`,
      );
    });
  };

  // Shuffle helper — biar urutan animasi titik beda tiap transisi
  const shuffledIndices = (length) => {
    const arr = Array.from({ length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ==========================================
  // ANIMASI REVEAL DENGAN SCROLL TRIGGER
  // ==========================================
  useLayoutEffect(() => {
    redraw();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 50%",
          once: true,
        },
        onComplete: () => {
          hasRevealed.current = true;
        },
      });

      tl.from(starRefs.current, {
        scale: 0,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(2)",
      }).from(
        lineRefs.current,
        {
          opacity: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.inOut",
        },
        "-=0.5",
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const morphTo = (nextIndex) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const nextKey = ORDER[nextIndex];
    const nextPoints = CONSTELLATIONS[nextKey].points;
    const pts = pointsRef.current;
    const order = shuffledIndices(pts.length);

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
      },
    });

    // Animasi titik bintang secara asinkron
    order.forEach((pointIdx, orderPos) => {
      const p = pts[pointIdx];
      const randomDelay =
        0.15 + orderPos * (0.35 / pts.length) + Math.random() * 0.15;
      const randomDuration = 0.7 + Math.random() * 0.4;

      tl.to(
        p,
        {
          x: nextPoints[pointIdx].x,
          y: nextPoints[pointIdx].y,
          duration: randomDuration,
          ease: "power2.inOut",
          onUpdate: redraw,
        },
        randomDelay,
      );
    });

    // Tukar pola garis di tengah-tengah transisi agar terlihat dinamis
    tl.call(
      () => {
        activeLinesRef.current = CONSTELLATIONS[nextKey].lines;
        setActiveIndex(nextIndex);
        requestAnimationFrame(redraw);
      },
      null,
      0.65,
    );
  };

  // ==========================================
  // SIKLUS MORPHING
  // ==========================================
  useEffect(() => {
    const timer = setInterval(() => {
      if (hasRevealed.current) {
        setActiveIndex((prev) => {
          const next = (prev + 1) % ORDER.length;
          morphTo(next);
          return prev;
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, []);

  const current = CONSTELLATIONS[activeKey];

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center ${className}`}
    >
      <svg
        viewBox={`${-scale - 40} ${-scale - 40} ${scale * 2 + 80} ${
          scale * 2 + 80
        }`}
        className="w-full max-w-md pointer-events-none"
      >
        {/* ==========================================
            GARIS RASI BINTANG
        ========================================== */}
        <g stroke={color} strokeWidth="1.5" opacity="0.8">
          {activeLinesRef.current.map((_, i) => (
            <line key={i} ref={(el) => (lineRefs.current[i] = el)} />
          ))}
        </g>

        {/* ==========================================
            TITIK BINTANG + GLOW
        ========================================== */}
        <g>
          {current.points.map((_, i) => (
            <g key={i} ref={(el) => (starRefs.current[i] = el)}>
              <circle r="4" fill={color} />
              <circle r="10" fill="none" opacity="0.5"/>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
