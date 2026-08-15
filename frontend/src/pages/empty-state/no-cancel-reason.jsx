// src/pages/empty-state/no-cancel-reason.jsx

import { RevealButton } from "../../components/reveal-button.jsx";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function EmptyCancelReasonState({ onCreate }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="flex min-h-full bg-[#1e1e1e] flex-col items-center justify-center gap-[16px] px-[16px] text-center">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex w-full max-w-[480px] flex-col gap-[16px] border border-white/10 p-[16px]"
      >
        <motion.div variants={itemVariants} className="space-y-[8px]">
          <h2 className="text-[24px] font-semibold text-white">
            Belum ada alasan pembatalan 👋
          </h2>

          <p className="text-[16px] text-muted-foreground leading-relaxed">
            Tambahkan alasan pembatalan agar proses pembatalan pesanan jadi
            lebih cepat dan rapi.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="h-[1px] w-full bg-white/10"
        />

        <motion.div variants={itemVariants}>
          <RevealButton
            type="button"
            label="Buat Alasan Pembatalan"
            icon={Plus}
            onClick={onCreate}
            className="w-full rounded-none"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
