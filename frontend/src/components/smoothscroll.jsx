import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  useEffect(() => {
    // 1. Deteksi apakah ini layar HP (kurang dari 768px)
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    // 2. MATIKAN LENIS DI HP! Biarkan hardware native yang kerja
    if (isMobile) {
      // Bikin Lenis palsu (Mock API) biar tombol navigasi lu nggak error pas manggil window.lenis.scrollTo()
      window.lenis = {
        scrollTo: (target) => {
          // Arahkan langsung pakai fungsi scroll bawaan browser yang super ringan
          window.scrollTo({ 
            top: target, 
            behavior: "smooth" 
          });
        }
      };
      
      // STOP EKSEKUSI DI SINI! Jangan biarkan engine berat di bawah nyala di HP
      return; 
    }

    // ==========================================
    // 3. ENGINE ASLI KHUSUS DESKTOP & TABLET
    // ==========================================
    const lenis = new Lenis({
      duration: 1.2, // Gue potong jadi 1.2 biar responsif dan nggak ngeberatin render
      smoothWheel: true,
      smoothTouch: false, // Tegasin haram di touch screen
    });

    window.lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0, 0);

    return () => {
      lenis.destroy();
      window.lenis = null;
    };
  }, []);

  return null;
}
