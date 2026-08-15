import { motion } from "framer-motion";
import { useState } from "react";
import SlicedWaves from "./../SlicedWaves";
import { openCloseStore } from "../../hooks/store.js";
import { RevealButton } from "../reveal-button.jsx";

export default function Main({ logo, name, status, storeId }) {
  const { mutate, isPending } = openCloseStore();
  const [errorMsg, setErrorMsg] = useState("");

  const isOpen = status === "buka";

  function handleToggle() {
    setErrorMsg("");
    const nextStatus = isOpen ? "CLOSED" : "OPEN";

    mutate(
      { status: nextStatus, storeId },
      {
        onError: (err) => {
          const message =
            err?.response?.data?.errors || "Gagal mengubah status toko.";
          setErrorMsg(message);
        },
      },
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden bg-white/5 lg:bg-gradient-to-b from-[#C0FE04]/0 to-[#C0FE04]/20 p-[16px] sm:p-[32px] w-full min-h-[128px] h-auto sm:h-[128px] flex items-center sm:block"
    >
      <div className="hidden sm:flex absolute top-0 opacity-20 left-0 w-full h-full items-center z-0">
        <SlicedWaves
          color1="#C0FE04"
          color2="#C0FE04"
          color3="#C0FE04"
          columns={40}
          rows={4}
          barThickness={0.2}
          speed={1.25}
          travel={0.7}
          waveSpread={3}
          rowOffset={3}
          softness={0.05}
          glow={0}
          brightness={1}
          contrast={2}
          opacity={0.5}
          orientation="vertical"
          alternate={false}
          mouseInteraction
          mouseStrength={2}
          mouseRadius={0.3}
          grain
          grainIntensity={0}
        />
      </div>
      {/* MOBILE */}
      <div className="relative z-10 w-full sm:hidden flex items-center justify-center">
        <div className="flex items-center gap-[16px] max-w-full">
          <img
            src={logo}
            alt=""
            className="h-[56px] w-[56px] rounded-md object-cover shrink-0"
          />
          <div className="flex flex-col justify-center gap-[6px] min-w-0">
            <p className="text-[24px] font-bold text-white break-words">
              {name}
            </p>
            <div className="flex items-center justify-center gap-[8px] flex-wrap">
              <div
                className={`flex items-center justify-center px-[8px] py-[4px] shrink-0 ${
                  isOpen
                    ? "bg-green-400/20 text-green-400"
                    : "bg-red-400/20 text-red-400"
                }`}
              >
                <p className="text-[12px] font-bold capitalize">{status}</p>
              </div>

              <button
                type="button"
                onClick={handleToggle}
                disabled={isPending}
                className="flex items-center bg-[#C0FE04] justify-center px-[16px] py-[4px] shrink-0 border border-white/10 text-[#1e1e1e] hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <p className="text-[12px] font-medium whitespace-nowrap">
                  {isPending
                    ? "Memproses..."
                    : isOpen
                      ? "Tutup Toko"
                      : "Buka Toko"}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:absolute sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:flex sm:flex-row items-center justify-center gap-[16px] z-10 text-left">
        <img
          src={logo}
          alt=""
          className="h-[88px] w-[88px] rounded-md object-cover"
        />
        <p className="text-[24px] font-bold text-white break-words max-w-full">
          {name}
        </p>

        <div
          className={`flex items-center justify-center px-[8px] py-[4px] shrink-0 ${
            isOpen
              ? "bg-green-400/20 text-green-400"
              : "bg-red-400/20 text-red-400"
          }`}
        >
          <p className="text-[16px] font-bold capitalize">{status}</p>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="flex items-center bg-[#C0FE04] justify-center px-[12px] py-[4px] shrink-0 border border-white/10 text-[#1e1e1e] hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <p className="text-[16px] font-medium">
            {isPending ? "Memproses..." : isOpen ? "Tutup Toko" : "Buka Toko"}
          </p>
        </button>
      </div>

      {errorMsg && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mt-[8px] text-center sm:text-left text-[12px] text-red-400"
        >
          {errorMsg}
        </motion.p>
      )}
    </motion.div>
  );
}
