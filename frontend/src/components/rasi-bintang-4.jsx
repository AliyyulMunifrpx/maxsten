"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// DATA KOORDINAT RASI BINTANG (Semua Set ke 4 Titik & 4 Garis)
// ==========================================
const CONSTELLATIONS = {
  corvus: {
    name: "Corvus",
    subtitle: "Sang Gagak (Bentuk Layar)",
    points: [
      { x: -0.4, y: -0.5 }, // Kiri Atas
      { x: 0.5, y: -0.3 }, // Kanan Atas
      { x: 0.3, y: 0.6 }, // Kanan Bawah
      { x: -0.5, y: 0.3 }, // Kiri Bawah
    ],
    lines: [
      [0, 1], // Atas
      [1, 2], // Kanan
      [2, 3], // Bawah
      [3, 0], // Kiri
    ],
  },
  lyra: {
    name: "Lyra",
    subtitle: "Sang Harpa (Jajar Genjang)",
    points: [
      { x: -0.3, y: -0.6 }, // Kiri Atas
      { x: 0.4, y: -0.4 }, // Kanan Atas
      { x: 0.6, y: 0.5 }, // Kanan Bawah
      { x: -0.1, y: 0.3 }, // Kiri Bawah
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
  reticulum: {
    name: "Reticulum",
    subtitle: "Jaring (Bentuk Diamond)",
    points: [
      { x: 0, y: -0.7 }, // Puncak Atas
      { x: 0.6, y: 0 }, // Sudut Kanan
      { x: 0, y: 0.7 }, // Puncak Bawah
      { x: -0.6, y: 0 }, // Sudut Kiri
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
};

const ORDER = ["corvus", "lyra", "reticulum"];

export default function ConstellationCycler4({
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
              <circle r="10" fill="none" opacity="0.5" stroke={color} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
