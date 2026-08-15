import { useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import { RevealButton } from "../../components/reveal-button.jsx";
import ProductCreateModal from "../../components/product/product-form-modal.jsx";
import { getDashboard } from "../../hooks/dashboard.js";

export default function EmptyOrdersState() {
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = getDashboard();

  if (isLoading) {
    return null;
  }

  if (isError || !data?.data) {
    return null;
  }

  const dashboard = data.data;

  const publicId = dashboard.store?.public_id;
  const products = dashboard.lists?.latest_products ?? [];

  const hasProduct = products.length > 0;

  const catalogUrl = publicId
    ? `${window.location.origin}/catalog/${publicId}`
    : null;

  async function handleShare() {
    if (!catalogUrl) {
      toast.error("Link toko tidak tersedia.");
      return;
    }

    try {
      await navigator.clipboard.writeText(catalogUrl);

      setCopied(true);
      toast.success("Link toko berhasil disalin!");

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error("Gagal menyalin link toko.");
    }
  }

  const containerVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 18,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
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
          className="flex w-full max-w-[480px] flex-col gap-[16px] border border-white/10 p-[24px]"
        >
          <AnimatePresence mode="wait">
            {hasProduct ? (
              <motion.div
                key="has-product"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{
                  opacity: 0,
                  y: -10,
                  transition: { duration: 0.2 },
                }}
                className="flex flex-col gap-[16px]"
              >
                {/* Header */}
                <motion.div variants={itemVariants} className="space-y-[8px]">
                  <h2 className="text-[24px] font-semibold text-white">
                    Belum ada pesanan masuk nih 😁
                  </h2>

                  <p className="text-[16px] leading-relaxed text-white/50">
                    Produk kamu sudah siap dijual. Yuk bagikan toko kamu ke
                    pelanggan dan mulai dapatkan pesanan pertama!
                  </p>
                </motion.div>

                {/* Divider */}
                <motion.div
                  variants={itemVariants}
                  className="h-[1px] w-full bg-white/10"
                />

                {/* Button */}
                <motion.div variants={itemVariants}>
                  <RevealButton
                    type="button"
                    label={copied ? "Link Tersalin!" : "Bagikan Toko"}
                    icon={copied ? Check : Copy}
                    onClick={handleShare}
                    className="rounded-none w-full"
                  />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="no-product"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{
                  opacity: 0,
                  y: -10,
                  transition: { duration: 0.2 },
                }}
                className="flex flex-col gap-[16px]"
              >
                {/* Header */}
                <motion.div variants={itemVariants} className="space-y-[8px]">
                  <h2 className="text-[24px] font-semibold text-white">
                    Toko kamu masih kosong 👋
                  </h2>

                  <p className="text-[16px] leading-relaxed text-white/50">
                    Tambahkan produk terlebih dahulu supaya pelanggan bisa
                    melihat dan memesan dari toko kamu.
                  </p>
                </motion.div>

                {/* Divider */}
                <motion.div
                  variants={itemVariants}
                  className="h-[1px] w-full bg-white/10"
                />

                {/* Button */}
                <motion.div variants={itemVariants}>
                  <RevealButton
                    type="button"
                    label="Tambah Produk"
                    icon={Plus}
                    onClick={() => setCreating(true)}
                    className="rounded-none w-full"
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
