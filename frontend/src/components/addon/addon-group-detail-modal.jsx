// src/components/addon/addon-group-detail-modal.jsx
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash2, Loader2, Layers } from "lucide-react";
import { useState } from "react";
import { useAddonGroupDetail } from "../../hooks/addon.js";
import ConfirmDialog from "../confirm-dialog.jsx";
import { RevealButton } from "../reveal-button.jsx";

export default function AddonGroupDetailModal({
  addonGroupId,
  onClose,
  onEdit,
  onDelete,
  isDeleting,
}) {
  const { data, isLoading, isError, error } = useAddonGroupDetail(addonGroupId);

  const group = data?.data;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleConfirmDelete() {
    setShowDeleteConfirm(false);
    onDelete?.(group);
  }

  return (
    <>
      <AnimatePresence>
        {addonGroupId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center bg-black/70 p-[16px]"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 28,
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[400px] max-h-[85vh] overflow-y-auto bg-[#1e1e1e] border border-white/10"
            >
              <div className="flex items-center justify-between p-[16px] border-b border-white/10">
                <div className="flex items-center gap-[8px] min-w-0">
                  <div className="h-[32px] w-[32px] bg-[#C0FE04]/10 flex items-center justify-center shrink-0">
                    <Layers className="h-[16px] w-[16px] text-[#C0FE04]" />
                  </div>

                  <p className="text-white text-[16px] font-bold truncate">
                    {group?.name || "Detail Grup"}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="text-white/50 hover:text-white transition-colors shrink-0"
                  aria-label="Tutup"
                >
                  <X size={20} />
                </button>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center h-[160px]">
                  <p className="text-[14px] text-white/50">Memuat...</p>
                </div>
              )}

              {isError && (
                <div className="flex items-center justify-center h-[160px] px-[16px] text-center">
                  <p className="text-[14px] text-red-500">
                    {error?.response?.data?.errors ||
                      "Gagal memuat grup addon."}
                  </p>
                </div>
              )}

              {group && (
                <div className="p-[16px] flex flex-col gap-[16px]">
                  <div className="flex flex-col gap-[8px]">
                    {group.addons?.length > 0 ? (
                      group.addons.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between text-[13px] px-[10px] py-[8px] bg-white/5"
                        >
                          <p className="text-white">{addon.name}</p>

                          <p className="text-white/50">
                            {addon.price > 0
                              ? `+Rp${Number(addon.price).toLocaleString(
                                  "id-ID",
                                )}`
                              : "Gratis"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[12px] text-white/30">
                        Belum ada addon di grup ini.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-[8px]">
                    <RevealButton
                      type="button"
                      onClick={() => onEdit?.(group)}
                      label="Edit Grup"
                      bgBefore="bg-white/10"
                      textBefore="text-white"
                      bgAfter="bg-white"
                      textAfter="text-[#1e1e1e]"
                      className="flex-1 rounded-none "
                    />

                    <RevealButton
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disable={isDeleting}
                      label={isDeleting ? "Menghapus..." : "Hapus Grup"}
                      icon={
                        isDeleting
                          ? (props) => (
                              <Loader2 {...props} className="animate-spin" />
                            )
                          : Trash2
                      }
                      bgBefore="bg-red-500/20"
                      textBefore="text-red-500"
                      bgAfter="bg-red-500"
                      textAfter="text-white"
                      // Kalau mau ukurannya bagi rata dengan tombol Edit, tambahkan class "flex-1" di bawah ini
                      className="rounded-none flex-1"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Hapus grup addon?"
        description={
          group
            ? `Grup "${group.name}" akan dihapus. Tindakan ini gak bisa dibatalkan.`
            : "Grup addon ini akan dihapus. Tindakan ini gak bisa dibatalkan."
        }
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
