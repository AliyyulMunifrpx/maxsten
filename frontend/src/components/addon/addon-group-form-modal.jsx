// src/components/addon/addon-group-form-modal.jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateAddonGroup, useUpdateAddonGroup } from "../../hooks/addon.js";
import FieldLabel from "../field-label.jsx";
import { RevealButton } from "../reveal-button.jsx";

export default function AddonGroupFormModal({
  open,
  mode = "create",
  group,
  onClose,
}) {
  const isEdit = mode === "edit";

  const [name, setName] = useState(group?.name || "");
  const [addons, setAddons] = useState(
    group?.addons?.map((a) => ({ ...a })) || [],
  );

  const createGroup = useCreateAddonGroup();
  const updateGroup = useUpdateAddonGroup();

  const isPending = createGroup.isPending || updateGroup.isPending;
  function addAddonRow() {
    setAddons((prev) => [
      ...prev,
      {
        // Pakai kombinasi waktu sekarang + angka acak (pasti unik)
        _tempId: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: "",
        price: 0,
      },
    ]);
  }

  function updateAddonRow(index, field, value) {
    setAddons((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    );
  }

  function removeAddonRow(index) {
    setAddons((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const cleanAddons = addons
      .filter((a) => a.name.trim())
      .map(({ _tempId, ...a }) => ({
        ...(a.id ? { id: a.id } : {}),
        name: a.name,
        price: Number(a.price) || 0,
      }));

    const payload = {
      name: name.trim(),
      addons: cleanAddons,
    };

    if (isEdit) {
      updateGroup.mutate(
        {
          addonGroupId: group.id,
          payload,
        },
        {
          onSuccess: () => {
            toast.success("Grup addon berhasil diperbarui.");
            onClose();
          },

          onError: (err) => {
            toast.error(
              err?.message || "Gagal menyimpan perubahan grup addon.",
            );
          },
        },
      );
    } else {
      createGroup.mutate(payload, {
        onSuccess: () => {
          toast.success("Grup addon berhasil dibuat.");
          onClose();
        },

        onError: (err) => {
          toast.error(err?.message || "Gagal membuat grup addon.");
        },
      });
    }
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
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 28,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] max-h-[85vh] overflow-y-auto bg-[#1e1e1e] border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-[16px] border-b border-white/10">
              <p className="text-white text-[16px] font-bold">
                {isEdit ? "Edit Grup Addon" : "Tambah Grup Addon"}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-[16px] flex flex-col gap-[16px]"
            >
              {/* Nama Grup */}
              <div className="flex flex-col gap-[8px]">
                <FieldLabel htmlFor="addon-group-name" required>
                  Nama Grup
                </FieldLabel>

                <input
                  id="addon-group-name"
                  name="name"
                  value={name}
                  required
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Topping Minuman"
                  className="bg-white/5 border border-white/10 text-white text-[14px] px-[12px] py-[8px] focus:outline-none focus:border-[#C0FE04]"
                />
              </div>

              <div className="h-[1px] w-full bg-white/10" />

              {/* Addon */}
              <div className="flex flex-col gap-[8px]">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-white/50 tracking-wide">
                    Addon
                  </label>

                  <button
                    type="button"
                    onClick={addAddonRow}
                    className="flex items-center gap-[4px] text-[12px] font-medium text-[#C0FE04] hover:text-[#C0FE04]/80 transition-colors"
                  >
                    <Plus size={14} />
                    Tambah
                  </button>
                </div>

                {addons.length === 0 && (
                  <p className="text-[12px] text-white/30">Belum ada addon.</p>
                )}

                {addons.map((addon, index) => (
                  <div
                    key={addon.id ?? addon._tempId}
                    className="flex items-end gap-[8px]"
                  >
                    {/* Nama Addon */}
                    <div className="flex-1 ">
                      <FieldLabel
                        htmlFor={`addon-name-${addon.id ?? addon._tempId}`}
                        required
                      >
                        Nama Addon
                      </FieldLabel>

                      <input
                        id={`addon-name-${addon.id ?? addon._tempId}`}
                        name={`addon-${index}-name`}
                        value={addon.name}
                        required
                        onChange={(e) =>
                          updateAddonRow(index, "name", e.target.value)
                        }
                        placeholder="Nama addon"
                        className="w-full bg-white/5 border mt-[8px]  border-white/10 text-white text-[12px] px-[8px] py-[8px] focus:outline-none focus:border-[#C0FE04]"
                      />
                    </div>

                    {/* Harga */}
                    <div className="flex flex-col">
                      <FieldLabel
                        htmlFor={`addon-price-${addon.id ?? addon._tempId}`}
                        required
                      >
                        Harga
                      </FieldLabel>

                      <div className="flex items-center bg-white/5 border mt-[8px]  border-white/10 focus-within:border-[#C0FE04]">
                        <span className="pl-[8px] text-white/40 text-[12px]">
                          Rp
                        </span>

                        <input
                          id={`addon-price-${addon.id ?? addon._tempId}`}
                          type="number"
                          min="0"
                          value={addon.price}
                          required
                          onChange={(e) =>
                            updateAddonRow(index, "price", e.target.value)
                          }
                          className="w-[80px] bg-transparent text-white text-[12px] py-[8px] px-[8px] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Hapus */}
                    <button
                      type="button"
                      onClick={() => removeAddonRow(index)}
                      className="mb-[6px] text-red-500/70 hover:text-red-500 transition-colors"
                      aria-label="Hapus addon"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="flex gap-[8px] mt-[4px]">
                <RevealButton
                  type="button"
                  onClick={onClose}
                  disable={isPending}
                  label="Batal"
                  bgBefore="bg-white/10"
                  textBefore="text-white"
                  bgAfter="bg-red-500"
                  textAfter="text-white"
                  className="flex-1 rounded-none "
                />

                <RevealButton
                  type="submit"
                  disable={isPending}
                  label={
                    isPending
                      ? "Menyimpan..."
                      : isEdit
                        ? "Simpan Perubahan"
                        : "Buat Grup"
                  }
                  icon={
                    isPending
                      ? (props) => (
                          <Loader2 {...props} className="animate-spin" />
                        )
                      : null
                  }
                  bgBefore="bg-[#C0FE04]"
                  textBefore="text-[#1e1e1e]"
                  bgAfter="bg-white"
                  textAfter="text-[#1e1e1e]"
                  className="flex-1 rounded-none"
                />
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
