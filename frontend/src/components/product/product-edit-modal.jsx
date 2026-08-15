// src/components/product/product-edit-modal.jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Plus, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useUpdateProduct } from "../../hooks/product.js";
import { useGenerateDescription } from "../../hooks/ai.js";
import AddonGroupPicker from "../addon/addon-groups.jsx";
import FieldLabel from "../field-label.jsx";
import { RevealButton } from "../reveal-button.jsx";

export default function ProductEditModal({ product, onClose }) {
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(product?.price || 0);
  const [description, setDescription] = useState(product?.description || "");

  const [variants, setVariants] = useState(
    product?.variants?.map((v) => ({ ...v })) || [],
  );

  const [recommendations, setRecommendations] = useState(null);

  const updateProduct = useUpdateProduct();
  const generateDescription = useGenerateDescription();

  const [addonGroupIds, setAddonGroupIds] = useState(
    product?.productAddonGroups?.map((pag) => pag.addon_group.id) || [],
  );

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        // Ganti C0FE04UUID() jadi ini:
        _tempId: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: "",
        additional_price: 0,
      },
    ]);
  }
  function updateVariant(index, field, value) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  }

  function removeVariant(index) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleGenerateDescription() {
    if (!name.trim()) return;

    setRecommendations(null);

    generateDescription.mutate(
      { productName: name },
      {
        onSuccess: (data) => {
          setRecommendations(data?.data?.recommendations || []);
        },
      },
    );
  }

  function pickRecommendation(text) {
    setDescription(text);
    setRecommendations(null);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      price: Number(price),
      description,
      variants: variants.map(({ _tempId, product_id, is_delete, ...v }) => v),
      addon_group_ids: addonGroupIds,
    };

    updateProduct.mutate(
      {
        productId: product.id,
        payload,
      },
      {
        onSuccess: () => {
          toast.success("Produk berhasil diperbarui!");
          onClose();
        },

        onError: (err) => {
          toast.error(err?.message || "Gagal menyimpan perubahan. Coba lagi.");
        },
      },
    );
  }

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[55] flex flex-col justify-end sm:justify-center sm:items-center backdrop-blur-md bg-black/70 sm:p-[16px]"
        >
          <motion.div
            initial={{ opacity: 0, y: "100%", scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: "100%", scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 28,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-[480px] max-h-[90vh] sm:max-h-[85vh] bg-[#1e1e1e] border-t sm:border border-white/10 rounded-t-[16px] sm:rounded-none flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Drag Handle */}
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 z-40 sm:hidden w-[36px] h-[4px] bg-white/40 rounded-full" />

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between p-[16px] pt-[28px] sm:pt-[16px] border-b border-white/10 bg-[#1e1e1e] relative z-30">
              <p className="text-white text-[16px] font-bold">Edit Produk</p>

              <button
                type="button"
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* BODY */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-[16px] flex flex-col gap-[16px]"
            >
              {/* Nama */}
              <div className="flex flex-col gap-[6px]">
                <FieldLabel htmlFor="edit-product-name" required>
                  Nama Produk
                </FieldLabel>

                <input
                  id="edit-product-name"
                  name="name"
                  value={name}
                  required
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Nasi Goreng Spesial"
                  className="bg-white/5 border border-white/10 text-white text-[14px] px-[12px] py-[8px] focus:outline-none focus:border-[#C0FE04]"
                />
              </div>

              {/* Harga */}
              <div className="flex flex-col gap-[6px]">
                <FieldLabel htmlFor="edit-product-price" required>
                  Harga
                </FieldLabel>

                <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-[#C0FE04]">
                  <span className="px-[12px] text-white/50 text-[14px]">
                    Rp
                  </span>

                  <input
                    id="edit-product-price"
                    name="price"
                    type="number"
                    min="0"
                    value={price}
                    required
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-white text-[14px] py-[8px] pr-[12px] focus:outline-none"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="edit-product-description">
                    Deskripsi
                  </FieldLabel>

                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generateDescription.isPending || !name.trim()}
                    className="flex items-center gap-[4px] text-[12px] font-medium text-[#C0FE04] hover:text-[#C0FE04]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {generateDescription.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    Generate dengan AI
                  </button>
                </div>

                <textarea
                  id="edit-product-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Tulis deskripsi produk..."
                  className="bg-white/5 border border-white/10 text-white text-[14px] px-[12px] py-[8px] focus:outline-none focus:border-[#C0FE04] resize-none"
                />

                {generateDescription.isPending && (
                  <p className="text-[12px] text-white/40">
                    Sedang membuat rekomendasi deskripsi, bisa sampai 1 menit...
                  </p>
                )}

                <AnimatePresence>
                  {recommendations && recommendations.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-[8px] overflow-hidden"
                    >
                      {recommendations.map((rec, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => pickRecommendation(rec.text)}
                          className="text-left p-[10px] bg-white/5 border border-white/10 hover:border-[#C0FE04]/50 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-[4px]">
                            <span className="text-[10px] font-bold text-[#C0FE04] uppercase tracking-wide">
                              Rekomendasi {i + 1}
                            </span>

                            <span className="text-[10px] font-bold px-[6px] py-[1px] rounded-full bg-[#C0FE04]/20 text-[#C0FE04]">
                              {rec.score} poin
                            </span>
                          </div>

                          <p className="text-[12px] text-white/80">
                            {rec.text}
                          </p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-[1px] w-full shrink-0 bg-white/10" />

              {/* Varian */}
              <div className="flex flex-col gap-[8px]">
                <div className="flex items-center justify-between">
                  <FieldLabel>Varian</FieldLabel>

                  <button
                    type="button"
                    onClick={addVariant}
                    className="flex items-center gap-[4px] text-[12px] font-medium text-[#C0FE04] hover:text-[#C0FE04]/80 transition-colors"
                  >
                    <Plus size={14} />
                    Tambah
                  </button>
                </div>

                {variants.length === 0 && (
                  <p className="text-[12px] text-white/30">Belum ada varian.</p>
                )}

                {variants.map((variant, index) => {
                  const variantKey = variant.id ?? variant._tempId;

                  return (
                    <div key={variantKey} className="flex items-end gap-[8px]">
                      <div className="flex-1 min-w-0">
                        <FieldLabel
                          htmlFor={`edit-variant-name-${variantKey}`}
                          className={`mb-[8px]`}
                          required
                        >
                          Nama Varian
                        </FieldLabel>

                        <input
                          id={`edit-variant-name-${variantKey}`}
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(index, "name", e.target.value)
                          }
                          required
                          placeholder="Nama varian"
                          className="w-full min-w-0 bg-white/5 border border-white/10 text-white text-[12px] px-[8px] py-[8px] focus:outline-none focus:border-[#C0FE04]"
                        />
                      </div>

                      <div>
                        <FieldLabel
                          htmlFor={`edit-variant-price-${variantKey}`}
                          className={`mb-[8px]`}
                          required
                        >
                          Harga Tambahan
                        </FieldLabel>

                        <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-[#C0FE04]">
                          <span className="pl-[8px] text-white/40 text-[12px]">
                            +Rp
                          </span>

                          <input
                            id={`edit-variant-price-${variantKey}`}
                            type="number"
                            min="0"
                            value={variant.additional_price}
                            onChange={(e) =>
                              updateVariant(
                                index,
                                "additional_price",
                                e.target.value,
                              )
                            }
                            required
                            className="w-[80px] bg-transparent text-white text-[12px] py-[8px] px-[8px] focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="mb-[4px] text-red-500/70 shrink-0 hover:text-red-500 transition-colors"
                        aria-label="Hapus varian"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Addon */}
              <div className="flex flex-col gap-[8px]">
                <FieldLabel>Grup Addon</FieldLabel>

                <AddonGroupPicker
                  selectedIds={addonGroupIds}
                  onChange={setAddonGroupIds}
                />
              </div>

              {/* Aksi */}
              <div className="flex gap-[8px] mt-[8px] shrink-0">
                <RevealButton
                  type="button"
                  onClick={onClose}
                  disable={updateProduct.isPending}
                  label="Batal"
                  bgBefore="bg-white/10"
                  textBefore="text-white"
                  bgAfter="bg-red-500"
                  textAfter="text-white"
                  className="flex-1 rounded-none"
                />

                <RevealButton
                  type="submit"
                  disable={updateProduct.isPending}
                  label={
                    updateProduct.isPending
                      ? "Menyimpan..."
                      : "Simpan Perubahan"
                  }
                  icon={
                    updateProduct.isPending
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
