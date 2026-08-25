"use client";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function NotFound() {
  const navigate = useNavigate();
  useDocumentTitle("Halaman Tidak Ditemukan");

  // Lebar batang barcode acak tapi stabil (biar gak reflow tiap render)
  const barcodeBars = [
    3, 1, 2, 4, 1, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 4, 1, 2, 3,
  ];

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#4105F7] px-6 py-16">
      {/* Ambient glow tipis di belakang, senada sama ambient effect section lain */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full " />
      <div className="pointer-events-none absolute left-1/3 top-1/4 h-[300px] w-[300px] rounded-full" />

      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* KARTU TIKET */}
        <div className="relative rounded-2xl border border-white/10 bg-[#ffffff] px-8 pt-8 pb-10 ">
          {/* Notch sobekan kiri & kanan, ala karcis */}
          <div className="absolute left-0 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4105F7]" />
          <div className="absolute right-0 top-1/2 h-8 w-8 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4105F7]" />

          {/* Eyebrow */}
          <p className="text-center font-science text-xs font-bold uppercase tracking-[0.3em] text-[#1e1e1e]">
            Eits... anda nyasar
          </p>

          {/* Nomor antrean raksasa */}
          <p className="mt-6 text-center font-science text-8xl font-black leading-none text-[#4105F7]">
            404
          </p>
          <p className="mt-2 text-center font-mono text-xs uppercase tracking-[0.25em] text-[#1e1e1e]">
            Halaman Tidak Ditemukan{" "}
          </p>

          {/* Garis putus horizontal ala perforasi struk */}
          <div className="my-6 border-t border-dashed border-[#1e1e1e]" />

          {/* Body copy */}
          <p className="mt-4 text-center font-sans text-sm leading-relaxed text-[#1e1e1e]">
            Halaman yang lo tuju nggak ada. Cek lagi link-nya, atau balik ke
            menu utama.
          </p>

          {/* CTA */}
          <button
            onClick={() => navigate("/")}
            className="mt-8 w-full rounded-full bg-[#4105F7] py-3 font-science text-sm font-bold uppercase tracking-widest text-[#C0FE04] transition-transform active:scale-95"
          >
            Balik ke Beranda
          </button>

          {/* Barcode dekoratif + ref code, footer struk */}
          <div className="mt-8 flex items-end justify-center gap-[3px]">
            {barcodeBars.map((w, i) => (
              <span
                key={i}
                className="bg-[#1e1e1e]"
                style={{ width: `${w}px`, height: "24px" }}
              />
            ))}
          </div>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#1e1e1e]">
            ref: 0x404-not-found
          </p>
        </div>

        {/* Link sekunder, di luar kartu */}
        <p className="mt-6 text-center font-sans text-xs text-[#ffffff]/70">
          Link-nya rusak?{" "}
          <a
            href="mailto:aliyyulmunif780@gmail.com"
            className="text-[#ffffff] underline underline-offset-2 hover:text-[#4105F7]"
          >
            Laporin ke kami
          </a>
        </p>
      </motion.div>
    </div>
  );
}
