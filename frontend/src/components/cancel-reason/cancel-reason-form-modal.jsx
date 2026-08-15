import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

import {
  useCreateCancelReason,
  useUpdateCancelReason,
} from "../../hooks/cancel-reason.js";

import FieldLabel from "../field-label.jsx";
import { RevealButton } from "./../reveal-button";

export default function CancelReasonFormModal({
  open,
  mode = "create",
  reason,
  onClose,
}) {
  const isEdit = mode === "edit";

  const [value, setValue] = useState("");

  const createReason = useCreateCancelReason();
  const updateReason = useUpdateCancelReason();

  const isPending = createReason.isPending || updateReason.isPending;

  useEffect(() => {
    if (open) {
      setValue(isEdit ? reason?.reason || "" : "");
    }
  }, [open, isEdit, reason]);

  function handleSubmit(e) {
    e.preventDefault();

    if (isEdit) {
      updateReason.mutate(
        {
          reasonId: reason.id,
          reason: value.trim(),
        },
        {
          onSuccess: () => {
            toast.success("Alasan pembatalan berhasil diperbarui.");
            onClose();
          },

          onError: (err) => {
            toast.error(err.message);
          },
        },
      );

      return;
    }

    createReason.mutate(value.trim(), {
      onSuccess: () => {
        toast.success("Alasan pembatalan berhasil ditambahkan.");
        onClose();
      },

      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[55] flex items-center justify-center backdrop-blur-md bg-black/70 p-[16px]"
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 16,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 16,
              scale: 0.97,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 28,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] bg-[#1e1e1e] border border-white/10"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between p-[16px] border-b border-white/10">
              <p className="text-white text-[16px] font-bold">
                {isEdit ? "Edit Alasan Pembatalan" : "Tambah Alasan Pembatalan"}
              </p>

              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="text-white/50 hover:text-white transition-colors disabled:opacity-50"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="p-[16px] flex flex-col gap-[16px]"
            >
              <div className="flex flex-col gap-[8px]">
                <FieldLabel htmlFor="cancel-reason" required>
                  Alasan Pembatalan
                </FieldLabel>

                <input
                  id="cancel-reason"
                  name="reason"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="misal: Stok bahan habis"
                  required
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 text-white text-[14px] px-[12px] py-[10px] focus:outline-none focus:border-[#C0FE04]"
                />
              </div>

              <div className="h-[1px] w-full bg-white/10" />

              {/* ACTION */}
              <div className="flex gap-[8px]">
                <RevealButton
                  type="button"
                  label="batal"
                  bgAfter="bg-red-500"
                  textAfter="text-white"
                  onClick={onClose}
                  disable={isPending}
                  className="rounded-none w-full flex-1"
                ></RevealButton>

                <RevealButton
                  type="submit"
                  disable={isPending}
                  // 1. Teks diatur secara dinamis lewat props label
                  label={
                    isPending
                      ? "Menyimpan..."
                      : isEdit
                        ? "Simpan Perubahan"
                        : "Tambah Alasan"
                  }
                  // 2. Ikon dinamis. Kita kirim komponen fungsi agar bisa menyisipkan class 'animate-spin'
                  icon={
                    isPending
                      ? (props) => (
                          <Loader2 {...props} className="animate-spin" />
                        )
                      : null
                  }
                  // 3. Warna sebelum di-hover
                  bgBefore="bg-[#C0FE04]"
                  textBefore="text-[#1e1e1e]"
                  // 4. Warna setelah di-hover (efek reveal) - Sesuaikan dengan desainmu
                  bgAfter="bg-white"
                  textAfter="text-[#1e1e1e]"
                  // 5. Bersihkan className dari warna background agar efeknya berfungsi
                  className="flex-1 w-full rounded-none"
                />
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
