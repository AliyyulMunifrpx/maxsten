import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  useCancelReasons,
  useDeleteCancelReason,
} from "../../hooks/cancel-reason.js";

import EmptyStoreState from "../empty-state/no-store.jsx";
import CancelReasonPageLoading from "../loading-state/cancel-reason-page-loading.jsx";
import CancelReasonFormModal from "../../components/cancel-reason/cancel-reason-form-modal.jsx";
import ConfirmDialog from "../../components/confirm-dialog.jsx";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";
import EmptyCancelReasonState from "../empty-state/no-cancel-reason.jsx";

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const rowVariants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
};

export default function CancelReasonsPage() {
  const { data, isLoading, isError, error } = useCancelReasons();
  const reasons = data?.data || [];

  const deleteReason = useDeleteCancelReason();

  const [creating, setCreating] = useState(false);
  const [editingReason, setEditingReason] = useState(null);

  // Alasan yang sedang dimintai konfirmasi untuk dihapus
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  useDocumentTitle("Kelola Alasan Pembatalan");
  function handleDelete(item) {
    setDeleteConfirm(item);
  }

  function handleConfirmDelete() {
    if (!deleteConfirm) return;

    const id = deleteConfirm.id;

    // Tutup dialog dulu
    setDeleteConfirm(null);

    deleteReason.mutate(id, {
      onSuccess: () => {
        toast.success("Alasan pembatalan berhasil dihapus.");
      },

      onError: (err) => {
        toast.error(
          err?.response?.data?.errors ||
            err?.message ||
            "Gagal menghapus alasan pembatalan.",
        );
      },
    });
  }

  if (isLoading) {
    return <CancelReasonPageLoading />;
  }

  if (isError && error.message === "Toko tidak ditemukan") {
    return <EmptyStoreState />;
  }

  return (
    <>
      <div className="bg-[#1e1e1e] min-h-screen w-full p-[16px] flex flex-col gap-[16px]">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
          <div>
            <p className="text-[20px] font-bold text-white">
              Alasan Pembatalan
            </p>

            <p className="text-[13px] text-white/50">
              Template alasan cepat buat dipilih pas membatalkan antrean, gak
              perlu ngetik manual tiap kali.
            </p>
          </div>

          <RevealButton
            type="button"
            onClick={() => setCreating(true)}
            label="Tambah Alasan"
            icon={Plus}
            bgBefore="bg-[#C0FE04]"
            textBefore="text-[#1e1e1e]"
            bgAfter="bg-white"
            textAfter="text-[#1e1e1e]"
            // Tambahan w-full di mobile, dan sm:w-auto di layar besar
            className="w-full sm:w-auto rounded-none"
          />
        </div>
        <div className="w-full h-[1px] bg-white/10" />

        {/* ERROR LOAD */}
        {isError && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-[14px] text-red-500">
              {error?.message || "Gagal memuat alasan."}
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isError && reasons.length === 0 && (
          <EmptyCancelReasonState onCreate={() => setCreating(true)} />
        )}

        {/* DATA */}
        {!isError && reasons.length > 0 && (
          <div className="max-w-[720px] mx-auto w-full flex flex-col gap-[16px] bg-white/5 border border-white/10 p-[16px]">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b  border-white/10 text-white/40 text-[13px]">
                    <th className="pb-[12px]  px-[8px] font-medium w-full">
                      Alasan
                    </th>

                    <th className="pb-[12px]  px-[8px] font-medium whitespace-nowrap text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <motion.tbody
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {reasons.map((item) => (
                    <motion.tr
                      key={item.id}
                      variants={rowVariants}
                      className="border-b border-white/10 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="py-[12px]  px-[8px] text-[14px] text-white">
                        {item.reason}
                      </td>

                      <td className=" px-[8px] whitespace-nowrap text-right w-[80px]">
                        <div className="flex items-center justify-end gap-[12px]">
                          {/* EDIT */}
                          <button
                            type="button"
                            onClick={() => setEditingReason(item)}
                            className="text-white/40 hover:text-white transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil size={16} />
                          </button>

                          {/* DELETE */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deleteReason.isPending}
                            className="text-red-500/70 hover:text-red-500 transition-colors disabled:opacity-50"
                            aria-label="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CREATE */}
      <CancelReasonFormModal
        open={creating}
        mode="create"
        onClose={() => setCreating(false)}
      />

      {/* MODAL EDIT */}
      <CancelReasonFormModal
        open={!!editingReason}
        mode="edit"
        reason={editingReason}
        onClose={() => setEditingReason(null)}
      />

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Hapus alasan pembatalan?"
        description={
          deleteConfirm
            ? `"${deleteConfirm.reason}" akan dihapus. Tindakan ini gak bisa dibatalkan.`
            : ""
        }
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
