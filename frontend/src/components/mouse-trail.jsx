import { useEffect, useRef, useState, useCallback } from "react";

const TRAIL_COLOR = "#ffffff";
const MAX_POINTS = 10;
const MAX_WIDTH = 2; // Tebal ekor awal
const SMOOTHING = 0.5;

export default function MouseTrail() {
  // ==========================================
  // STATE PENYELAMAT PERFORMA
  // ==========================================
  const [hasMouse, setHasMouse] = useState(false);

  const pointsRef = useRef([]);
  const cursorPos = useRef({ x: -100, y: -100 });
  const smoothPos = useRef({ x: -100, y: -100 });
  const pathRef = useRef(null);
  const headRef = useRef(null);
  const ringRef = useRef(null);
  const rafRef = useRef(null);

  const [isHovering, setIsHovering] = useState(false);

  // ==========================================
  // DETEKSI HARDWARE MOUSE / POINTER PRESISI
  // ==========================================
  useEffect(() => {
    // any-pointer: fine bakal bernilai TRUE kalau ada mouse/trackpad yang konek
    const mediaQuery = window.matchMedia("(any-pointer: fine)");
    
    // Set status awal pas komponen dimuat
    setHasMouse(mediaQuery.matches);

    // Listener ini ngebaca kalau user tiba-tiba nyolok/nyabut mouse di tengah jalan
    const handlePointerChange = (e) => setHasMouse(e.matches);
    mediaQuery.addEventListener("change", handlePointerChange);

    return () => mediaQuery.removeEventListener("change", handlePointerChange);
  }, []);

  const handleMouseMove = useCallback((e) => {
    cursorPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseOver = useCallback((e) => {
    const target = e.target.closest("a, button, [role='button'], .cursor-pointer");
    if (target) setIsHovering(true);
  }, []);

  const handleMouseOut = useCallback((e) => {
    const target = e.target.closest("a, button, [role='button'], .cursor-pointer");
    if (target) setIsHovering(false);
  }, []);

  // ==========================================
  // ENGINE ANIMASI (Cuma nyala kalau hasMouse == true)
  // ==========================================
  useEffect(() => {
    // Kalau nggak ada mouse, stop eksekusi di sini! (Hemat CPU & RAM)
    if (!hasMouse) return;

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    const tick = () => {
      smoothPos.current.x += (cursorPos.current.x - smoothPos.current.x) * SMOOTHING;
      smoothPos.current.y += (cursorPos.current.y - smoothPos.current.y) * SMOOTHING;

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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseOver, handleMouseOut, hasMouse]); // <- hasMouse ditambahin ke dependency array

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
      rightSide.slice().reverse().map((p) => `${p.x},${p.y}`).join(" L ") +
      " Z";

    pathRef.current.setAttribute("d", pathData);

    if (headRef.current && ringRef.current) {
      headRef.current.setAttribute("cx", cursorPos.current.x);
      headRef.current.setAttribute("cy", cursorPos.current.y);
      ringRef.current.setAttribute("cx", cursorPos.current.x);
      ringRef.current.setAttribute("cy", cursorPos.current.y);
    }
  };

  // ==========================================
  // RENDER PINTAR (Bypass DOM kalau layar sentuh)
  // ==========================================
  if (!hasMouse) return null; // Elemen SVG sama sekali nggak dikirim ke HTML!

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

      <path ref={pathRef} fill={TRAIL_COLOR} opacity="0.4" filter="url(#cometBlur)" />

      <circle
        ref={ringRef}
        r="10"
        fill="transparent"
        stroke={TRAIL_COLOR}
        strokeWidth="3"
        className="transition-all duration-300 ease-out origin-center"
        style={{
          opacity: isHovering ? 1 : 0,
          transform: isHovering ? "scale(1)" : "scale(0.5)",
          transformOrigin: `${cursorPos.current.x}px ${cursorPos.current.y}px`,
        }}
      />

      <circle ref={headRef} r="5" fill={TRAIL_COLOR} style={{ filter: `drop-shadow(0 0 4px ${TRAIL_COLOR})` }} />
    </svg>
  );
}
