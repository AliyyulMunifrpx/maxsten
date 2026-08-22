import { useRef, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
gsap.registerPlugin(ScrollTrigger);
export default function MainSection() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);

  // =====================================
  // REFS UNTUK MOUSE PARALLAX
  // =====================================
  const leftMouseRef = useRef(null);
  const rightMouseRef = useRef(null);
  const titleMouseRef = useRef(null);
  const buttonMouseRef = useRef(null);

  // Dummy proxy buat animasi scroll 3D (dikasih 0 biar statis)
  const staticModelProgress = useRef({ value: 0 });

  // Proxy buat nangkep koordinat mouse ke 3D
  const mouseParallax = useRef({ x: 0, y: 0 });
  const quickSettersRef = useRef([]);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${window.innerHeight}`, // Nahan sejauh 1 layar
        pin: true,
        pinSpacing: false, // Kunci biar bisa ditimpa section Problem
        invalidateOnRefresh: true,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);
  useEffect(() => {
    const section = sectionRef.current;
    // Cek pointer fine biar parallax mouse cuma nyala di PC/Laptop (bukan layar sentuh)
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!section || !isFinePointer) return;

    const layers = [
      { el: titleMouseRef.current, strength: 35 },
      { el: leftMouseRef.current, strength: 10 },
      { el: rightMouseRef.current, strength: 10 },
      { el: buttonMouseRef.current, strength: 10 },
    ].filter((l) => l.el);

    quickSettersRef.current = layers.map(({ el, strength }) => ({
      x: gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" }),
      strength,
    }));

    const handleMouseMove = (e) => {
      const rect = section.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;

      // Gerakin DOM (Teks & Tombol)
      quickSettersRef.current.forEach(({ x, y, strength }) => {
        x(relX * strength);
        y(relY * strength);
      });

      // Oper koordinat ke objek 3D
      mouseParallax.current.x = relX;
      mouseParallax.current.y = relY;
    };

    const handleMouseLeave = () => {
      quickSettersRef.current.forEach(({ x, y }) => {
        x(0);
        y(0);
      });
      mouseParallax.current.x = 0;
      mouseParallax.current.y = 0;
    };

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      className="relative h-[100vh] lg:h-[100dvh] w-full pointer-events-none absolute inset-0 z-10 grid grid-cols-[0.1fr_1fr_1fr_1fr_0.1fr] grid-rows-3"
    >
     
      {/* TITLE */}
      <div className="col-start-2 col-end-5 row-start-2 flex items-center justify-center">
        <div ref={titleMouseRef}>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="text-center font-science text-xl lg:text-5xl text-white pointer-events-auto"
          >
            Kasir Digital Cerdas Untuk
            <br />
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.2,
              }}
              className="inline-block font-bold text-[#C0FE04]"
            >
              UMKM Naik Kelas.
            </motion.span>
          </motion.p>
        </div>
      </div>

      <div className="col-start-3 col-end-4 z-30 row-start-3 flex items-center justify-center gap-4">
        <div
          ref={buttonMouseRef}
          className="pointer-events-auto flex items-center"
        >
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover="hover"
            whileTap={{ scale: 0.96 }}
            className="group relative flex items-center whitespace-nowrap gap-2 font-science text-lg text-white"
            onClick={() => navigate("/login")}
          >
            {/* TEXT */}
            <motion.span
              variants={{
                hover: {
                  x: -3,
                },
              }}
              transition={{
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              Coba Gratis
            </motion.span>

            {/* UNDERLINE */}
            <motion.span
              className="absolute -bottom-1 left-0 h-px w-full origin-left bg-white"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            {/* ARROW */}
            <motion.span
              variants={{
                hover: {
                  x: 5,
                  rotate: 8,
                },
              }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <ArrowUpRight size={20} strokeWidth={1.8} />
            </motion.span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
