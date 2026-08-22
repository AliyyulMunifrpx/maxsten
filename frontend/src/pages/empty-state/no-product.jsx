import { RevealButton } from "../../components/reveal-button.jsx";
import { useState } from "react";
import { motion } from "framer-motion";
import ProductCreateModal from "../../components/product/product-form-modal.jsx";

export default function EmptyProductsState() {
  const [creating, setCreating] = useState(false);

  const containerVariants = {
    hidden: {
      opacity: 0,
    },
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
    <>
      <div className="flex min-h-full bg-[#1e1e1e] flex-col items-center justify-center gap-[16px] px-[16px] text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex w-full max-w-[480px] flex-col border border-white/10 p-[16px] gap-[16px]"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="space-y-[8px]">
            <h2 className="text-[24px] font-semibold text-white">
              Kamu belum punya produk nih 👋
            </h2>

            <p className="text-[16px] text-muted-foreground leading-relaxed">
              Tambahkan produk pertama kamu dan mulai tawarkan jualanmu ke
              pelanggan.
            </p>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="h-[1px] bg-white/10 w-full"
          />

          {/* Button */}
          <motion.div variants={itemVariants}>
            <RevealButton
              label="Buat Produk"
              onClick={() => setCreating(true)}
              className="rounded-none w-full"
            />
          </motion.div>
        </motion.div>
      </div>

      <ProductCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => setCreating(false)}
      />
    </>
  );
}
