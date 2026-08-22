import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 2, // Gue balikin normal, 3 kelamaan bro wkwk
      smoothWheel: true,
    });

    // ==========================================
    // JURUS 1: EXPOSE KE WINDOW
    // Biar komponen lain (kayak Navbar) bisa manggil Lenis ini
    // ==========================================
    window.lenis = lenis;

    // ==========================================
    // JURUS 2: KAWINKAN LENIS SAMA GSAP (WAJIB)
    // Biar efek Pin & Parallax lu nggak patah-patah
    // ==========================================
    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    // Matiin lag smoothing GSAP biar nggak berantem sama Lenis
    gsap.ticker.lagSmoothing(0, 0);

    return () => {
      lenis.destroy();
      window.lenis = null; // Bersihin dari memory pas unmount
    };
  }, []);

  return null;
}
