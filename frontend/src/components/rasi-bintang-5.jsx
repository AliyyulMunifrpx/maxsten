"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// DATA KOORDINAT RASI BINTANG (Semua 5 Titik)
// ==========================================
const CONSTELLATIONS_5 = {
  cassiopeia: {
    points: [
      { x: -0.8, y: -0.6 },
      { x: -0.4, y: 0.3 },
      { x: 0.0, y: -0.2 },
      { x: 0.4, y: 0.4 },
      { x: 0.8, y: -0.5 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  delphinus: {
    points: [
      { x: 0.0, y: -0.6 },
      { x: 0.4, y: -0.2 },
      { x: 0.1, y: 0.3 },
      { x: -0.3, y: -0.1 },
      { x: -0.7, y: 0.6 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
    ],
  },
  cepheus: {
    points: [
      { x: 0.0, y: -0.8 },
      { x: 0.5, y: -0.2 },
      { x: 0.4, y: 0.6 },
      { x: -0.4, y: 0.6 },
      { x: -0.5, y: -0.2 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [1, 4],
    ],
  },
};

const ORDER_5 = ["cassiopeia", "delphinus", "cepheus"];
const MAX_LINES_5 = Math.max(
  ...ORDER_5.map((k) => CONSTELLATIONS_5[k].lines.length),
);

export default function ConstellationCycler5({
  scale = 300,
  color = "#ffffff",
  intervalMs = 5000,
  className = "",
}) {
  const containerRef = useRef(null); // Ref untuk nyangkutin ScrollTrigger
  const [activeIndex, setActiveIndex] = useState(0);
  const isAnimating = useRef(false);
  const hasRevealed = useRef(false); // Penanda biar setInterval jalan SETELAH reveal

  const activeKey = ORDER_5[activeIndex];
  const pointsRef = useRef(
    CONSTELLATIONS_5[ORDER_5[0]].points.map((p) => ({ ...p })),
  );

  const lineRefs = useRef([]);
  const starRefs = useRef([]);
  const activeLinesRef = useRef(CONSTELLATIONS_5[activeKey].lines);

  const redraw = () => {
    const pts = pointsRef.current;

    for (let i = 0; i < MAX_LINES_5; i++) {
      const lineEl = lineRefs.current[i];
      if (!lineEl) continue;

      const connection = activeLinesRef.current[i];
      if (connection) {
        const p1 = pts[connection[0]];
        const p2 = pts[connection[1]];
        lineEl.setAttribute("x1", p1.x * scale);
        lineEl.setAttribute("y1", p1.y * scale);
        lineEl.setAttribute("x2", p2.x * scale);
        lineEl.setAttribute("y2", p2.y * scale);
        lineEl.style.opacity = "0.8";
      } else {
        lineEl.style.opacity = "0";
      }
    }

    pts.forEach((p, i) => {
      const starEl = starRefs.current[i];
      if (!starEl) return;
      starEl.setAttribute(
        "transform",
        `translate(${p.x * scale}, ${p.y * scale})`,
      );
    });
  };

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
    // Siapin posisinya dulu (tapi ngumpet)
    redraw();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 50%", // Mulai pas bagian atas komponen ini nyentuh 50% viewport
          once: true, // Jalan sekali aja
        },
        onComplete: () => {
          hasRevealed.current = true; // Tandai reveal udah selesai
        },
      });

      // Bintang pop-up
      tl.from(starRefs.current, {
        scale: 0,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(2)",
      })
        // Garis muncul nyusul
        .from(
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

    const nextKey = ORDER_5[nextIndex];
    const nextPoints = CONSTELLATIONS_5[nextKey].points;
    const pts = pointsRef.current;
    const order = shuffledIndices(pts.length);

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
      },
    });

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

    tl.call(
      () => {
        activeLinesRef.current = CONSTELLATIONS_5[nextKey].lines;
        setActiveIndex(nextIndex);
        requestAnimationFrame(redraw);
      },
      null,
      0.65,
    );
  };

  // ==========================================
  // SIKLUS MORPHING (Jalan cuma kalau udah Reveal)
  // ==========================================
  useEffect(() => {
    const timer = setInterval(() => {
      // Cek dulu, kalau belum ke-reveal (belum di-scroll), jangan ganti rasi
      if (hasRevealed.current) {
        setActiveIndex((prev) => {
          const next = (prev + 1) % ORDER_5.length;
          morphTo(next);
          return prev;
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, []);

  const current = CONSTELLATIONS_5[activeKey];

  return (
    <div
      ref={containerRef} // Pasang ref untuk ScrollTrigger di sini
      className={`relative flex flex-col items-center justify-center ${className}`}
    >
      <svg
        viewBox={`${-scale - 40} ${-scale - 40} ${scale * 2 + 80} ${scale * 2 + 80}`}
        className="w-full max-w-md pointer-events-none"
      >
        <g stroke={color} strokeWidth="1.5">
          {Array.from({ length: MAX_LINES_5 }).map((_, i) => (
            <line
              key={i}
              ref={(el) => (lineRefs.current[i] = el)}
              style={{ transition: "opacity 0.3s ease" }}
            />
          ))}
        </g>
        <g>
          {current.points.map((_, i) => (
            <g key={i} ref={(el) => (starRefs.current[i] = el)}>
              <circle r="4" fill={color} />
              <circle r="10" fill="none" opacity="0.5" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
