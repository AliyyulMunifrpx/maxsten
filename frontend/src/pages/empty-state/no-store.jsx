import { useNavigate } from "react-router-dom";
import { RevealButton } from "../../components/reveal-button.jsx";
import { motion } from "framer-motion"; // ✅ Import framer-motion

export default function EmptyStoreState() {
  // 1. Variasi animasi untuk kontainer utama (mengatur jeda antar anak/elemen)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15, // Memberikan jeda 0.15 detik antar elemen saat muncul
        delayChildren: 0.1, // Tunggu 0.1 detik sebelum mulai animasi
      },
    },
  };

  // 2. Variasi animasi untuk setiap elemen di dalamnya (bergerak dari bawah ke atas)
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="flex min-h-full bg-[#1e1e1e] flex-col items-center justify-center gap-[16px] px-[16px] text-center">
      {/* Ubah div box menjadi motion.div dan pasang variant kontainer */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col border border-white/10 p-[16px] gap-[16px]"
      >
        {/* Elemen 1: Teks Header & Paragraf */}
        <motion.div variants={itemVariants} className="space-y-[8px]">
          <h2 className="text-[24px] font-semibold text-white">
            Yuk, mulai bangun tokomu 👋{" "}
          </h2>
          <p className="max-w-[384px] text-[16px] text-muted-foreground">
            Buat toko kamu dan mulai jual produk ke lebih banyak pelanggan lewat
            Maxsten{" "}
          </p>
        </motion.div>

        {/* Elemen 2: Garis Pembatas */}
        <motion.div
          variants={itemVariants}
          className="h-[1px] bg-white/10 w-full"
        />

        {/* Elemen 3: Tombol */}
        <motion.div variants={itemVariants}>
          <RevealButton
            label="Buat Toko"
            path="/store/create"
            className="w-full border-none rounded-none"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
