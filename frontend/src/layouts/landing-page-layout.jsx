import { Outlet } from "react-router-dom";

import Silk from "./../components/Silk";
import Navbar from "../components/landing-page/navbar.jsx";
import MouseTrail from "../components/mouse-trail.jsx";
import SmoothScroll from "../components/smoothscroll.jsx";

function GridBox({ side = "center", className = "" }) {
  const hideLeft = side === "left";
  const hideRight = side === "right";

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* TOP */}
      <div className="absolute left-0 right-0 top-0 flex items-center">
        {side === "left" ? (
          <>
            <div className="h-[1px] flex-1 bg-white/10" />
            <div className="w-[8px]" />
            <div className="h-[1px] w-[8px] bg-white/70" />
          </>
        ) : side === "right" ? (
          <>
            <div className="h-[1px] w-[8px] bg-white/70" />
            <div className="w-[8px]" />
            <div className="h-[1px] flex-1 bg-white/10" />
          </>
        ) : (
          <>
            <div className="h-[1px] w-[8px] bg-white/70" />
            <div className="w-[8px]" />
            <div className="h-[1px] flex-1 bg-white/10" />
            <div className="w-[8px]" />
            <div className="h-[1px] w-[8px] bg-white/70" />
          </>
        )}
      </div>

      {/* BOTTOM */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center">
        {side === "left" ? (
          <>
            <div className="h-[1px] flex-1 bg-white/10" />
            <div className="w-[8px]" />
            <div className="h-[1px] w-[8px] bg-white/70" />
          </>
        ) : side === "right" ? (
          <>
            <div className="h-[1px] w-[8px] bg-white/70" />
            <div className="w-[8px]" />
            <div className="h-[1px] flex-1 bg-white/10" />
          </>
        ) : (
          <>
            <div className="h-[1px] w-[8px] bg-white/70" />
            <div className="w-[8px]" />
            <div className="h-[1px] flex-1 bg-white/10" />
            <div className="w-[8px]" />
            <div className="h-[1px] w-[8px] bg-white/70" />
          </>
        )}
      </div>

      {/* LEFT */}
      {!hideLeft && (
        <div className="absolute bottom-0 left-0 top-0 flex flex-col items-center">
          <div className="h-[8px] w-px bg-white/70" />
          <div className="h-[8px]" />
          <div className="w-px flex-1 bg-white/10" />
          <div className="h-[8px]" />
          <div className="h-[8px] w-px bg-white/70" />
        </div>
      )}

      {/* RIGHT */}
      {!hideRight && (
        <div className="absolute bottom-0 right-0 top-0 flex flex-col items-center">
          <div className="h-[8px] w-px bg-white/70" />
          <div className="h-[8px]" />
          <div className="w-px flex-1 bg-white/10" />
          <div className="h-[8px]" />
          <div className="h-[8px] w-px bg-white/70" />
        </div>
      )}
    </div>
  );
}

export default function LandingPageLayout() {
  // Kembali ke 15 cell karena di desktop tetap 5 kolom
  const cells = Array.from({ length: 15 });

  return (
    <div className="relative min-h-[100vh] lg:min-h-[100dvh] w-full overflow-hidden bg-[#1e1e1e]">
      <MouseTrail />
      <SmoothScroll />

      {/* ================================
          BACKGROUND
      ================================= */}
      <div className="fixed absolute inset-0 z-0 opacity-50">
        {/* MOLTEN */}
        <div className="absolute inset-0 opacity-20">
          <Silk
            speed={6}
            scale={0.7}
            color="#C0FE04"
            noiseIntensity={10}
            rotation={3.31}
          />
        </div>

        {/* GRID */}
        {/* grid mobile diubah jadi 4 track, desktop tetap 5 */}
        <div
          className="
            pointer-events-none
            absolute inset-0
            z-10
            grid
            grid-cols-[0.1fr_1fr_1fr_0.1fr]
            md:grid-cols-[0.1fr_1fr_1fr_1fr_0.1fr]
            grid-rows-3
          "
        >
          {cells.map((_, index) => {
            const column = index % 5;
            let side = "center";

            if (column === 0) side = "left";
            if (column === 4) side = "right";

            // Sembunyikan SATU kolom aja di mobile (kolom tengah index 2)
            // Jadi di mobile, grid cuma nerima elemen dari index: 0, 1, 3, dan 4. Pas jadi 4 kolom!
            const hideOnMobile = column === 2;

            return (
              <GridBox
                key={index}
                side={side}
                className={hideOnMobile ? "hidden md:block" : "block"}
              />
            );
          })}
        </div>
      </div>

      {/* ================================
          CONTENT
      ================================= */}
      <div className="relative z-20 min-h-[100dvh]">
        {/* NAVBAR */}
        <Navbar />

        {/* PAGE */}
        <main className="relative z-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
