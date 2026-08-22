// components/MouseTrail.jsx
import { useEffect, useRef, useState, useCallback } from "react";

const TRAIL_COLOR = "#ffffff";
const MAX_POINTS = 10;
const MAX_WIDTH = 2; // Tebal ekor awal
const SMOOTHING = 0.5;

export default function MouseTrail() {
  const pointsRef = useRef([]);
  const cursorPos = useRef({ x: -100, y: -100 });
  const smoothPos = useRef({ x: -100, y: -100 });
  const pathRef = useRef(null);

  // Ref untuk bagian kepala (bulatan 10px) dan ring hover
  const headRef = useRef(null);
  const ringRef = useRef(null);
  const rafRef = useRef(null);

  // State buat ngatur apakah lagi hover tombol/link atau nggak
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e) => {
    cursorPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Mengecek apakah elemen yang di-hover adalah interaktif
  const handleMouseOver = useCallback((e) => {
    // Cari tahu apakah elemen target atau parent-nya adalah link/button
    const target = e.target.closest(
      "a, button, [role='button'], .cursor-pointer",
    );
    if (target) {
      setIsHovering(true);
    }
  }, []);

  const handleMouseOut = useCallback((e) => {
    const target = e.target.closest(
      "a, button, [role='button'], .cursor-pointer",
    );
    if (target) {
      setIsHovering(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    // Pasang listener di dokumen buat deteksi hover secara global
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    const tick = () => {
      smoothPos.current.x +=
        (cursorPos.current.x - smoothPos.current.x) * SMOOTHING;
      smoothPos.current.y +=
        (cursorPos.current.y - smoothPos.current.y) * SMOOTHING;

      pointsRef.current.unshift({ ...smoothPos.current });
      if (pointsRef.current.length > MAX_POINTS) {
        pointsRef.current.pop();
      }

      drawTail();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseOver, handleMouseOut]);

  const drawTail = () => {
    const pts = pointsRef.current;
    if (pts.length < 2 || !pathRef.current) return;

    const leftSide = [];
    const rightSide = [];

    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[i + 1] || pts[i - 1] || curr;
      const prev = pts[i - 1] || curr;

      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      const nx = -dy / len;
      const ny = dx / len;

      const t = i / (pts.length - 1);
      const width = MAX_WIDTH * Math.pow(1 - t, 1.6);

      leftSide.push({ x: curr.x + nx * width, y: curr.y + ny * width });
      rightSide.push({ x: curr.x - nx * width, y: curr.y - ny * width });
    }

    const pathData =
      "M " +
      leftSide.map((p) => `${p.x},${p.y}`).join(" L ") +
      " L " +
      rightSide
        .slice()
        .reverse()
        .map((p) => `${p.x},${p.y}`)
        .join(" L ") +
      " Z";

    pathRef.current.setAttribute("d", pathData);

    // Posisikan Custom Cursor (Kepala dan Cincin) mengikuti mouse
    // Gue ngambilnya dari cursorPos.current (posisi instan) biar ring-nya nggak kerasa ngelag pas nge-klik
    if (headRef.current && ringRef.current) {
      headRef.current.setAttribute("cx", cursorPos.current.x);
      headRef.current.setAttribute("cy", cursorPos.current.y);
      ringRef.current.setAttribute("cx", cursorPos.current.x);
      ringRef.current.setAttribute("cy", cursorPos.current.y);
    }
  };

  return (
    <svg
      className="pointer-events-none fixed mix-blend-difference inset-0 z-[9999] h-screen w-screen"
      style={{ position: "fixed", top: 0, left: 0 }}
    >
      <defs>
        <filter id="cometBlur">
          <feGaussianBlur stdDeviation="1" />
        </filter>
      </defs>

      {/* Badan ekor komet, meruncing halus */}
      <path
        ref={pathRef}
        fill={TRAIL_COLOR}
        opacity="0.4"
        filter="url(#cometBlur)"
      />

      {/* 
        RING HOVER: Muncul melingkari cursor kalau isHovering = true.
        Jari-jari (r): Karena cursor r=5, jarak 5px, berarti cincinnya r=10.
        Tebal garis (strokeWidth): 3px.
      */}
      <circle
        ref={ringRef}
        r="10"
        fill="transparent"
        stroke={TRAIL_COLOR}
        strokeWidth="3"
        // CSS Transition buat bikin efek cincin mekar masuk dan nge-zoom out pas hilang
        className="transition-all duration-300 ease-out origin-center"
        style={{
          opacity: isHovering ? 1 : 0,
          transform: isHovering ? "scale(1)" : "scale(0.5)",
          transformOrigin: `${cursorPos.current.x}px ${cursorPos.current.y}px`,
        }}
      />

      {/* 
        KURSOR CUSTOM (Bulatan 10px): Menggantikan panah mouse.
        Radius r=5 artinya diameter 10px.
      */}
      <circle
        ref={headRef}
        r="5"
        fill={TRAIL_COLOR}
        style={{ filter: `drop-shadow(0 0 4px ${TRAIL_COLOR})` }}
      />
    </svg>
  );
}
