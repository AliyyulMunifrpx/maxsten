// src/components/product/product-create-modal.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, Sparkles, Plus, Trash2, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateProduct } from "../../hooks/product.js";
import ImageCropperModal from "../image-cropper-modal.jsx";
import AddonGroupPicker from "../addon/addon-groups.jsx";
import { useGenerateDescription } from "../../hooks/ai.js";
import { RevealButton } from "../reveal-button.jsx";
import FieldLabel from "../field-label.jsx";

export default function ProductCreateModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState([]);
  const [addonGroupIds, setAddonGroupIds] = useState([]);

  const [pendingImageSrc, setPendingImageSrc] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const [recommendations, setRecommendations] = useState(null);

  const createProduct = useCreateProduct();
  const generateDescription = useGenerateDescription();

  function resetForm() {
    setName("");
    setPrice("");
    setDescription("");
    setVariants([]);
    setAddonGroupIds([]);
    setImageBlob(null);
    setImagePreviewUrl(null);
    setRecommendations(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    setPendingImageSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  function handleCropConfirm(blob) {
    setImageBlob(blob);
    setImagePreviewUrl(URL.createObjectURL(blob));
    setPendingImageSrc(null);
  }
  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        // Ganti C0FE04UUID() dengan ini biar aman di HP:
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
        onError: (err) => {
          toast.error(err.message || "Gagal membuat rekomendasi deskripsi.");
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

    // FieldLabel menangani error required dari browser.
    // Foto tidak bisa pakai required karena yang divalidasi adalah Blob,
    // jadi tetap kita handle manual.
    if (!imageBlob) {
      toast.error("Foto produk wajib diisi!");
      return;
    }

    const formData = new FormData();

    formData.append("name", name.trim());
    formData.append("price", Number(price));

    if (description.trim()) {
      formData.append("description", description.trim());
    }

    const cleanVariants = variants
      .filter((v) => v.name.trim())
      .map(({ name, additional_price }) => ({
        name: name.trim(),
        additional_price: Number(additional_price) || 0,
      }));

    if (cleanVariants.length > 0) {
      formData.append("variants", JSON.stringify(cleanVariants));
    }

    if (addonGroupIds.length > 0) {
      formData.append("addon_group_ids", JSON.stringify(addonGroupIds));
    }

    formData.append("image", imageBlob, "product.png");

    createProduct.mutate(formData, {
      onSuccess: (data) => {
        const created = data?.data;

        toast.success("Produk berhasil ditambahkan!");

        resetForm();
        onCreated?.(created);
      },

      onError: (err) => {
        toast.error(err.message || "Gagal menambahkan produk. Coba lagi.");
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
          onClick={handleClose}
          className="fixed inset-0 z-[55] flex flex-col justify-end sm:justify-center sm:items-center backdrop-blur-md bg-black/70 sm:p-[16px]"
        >
          <motion.div
            initial={{
              opacity: 0,
              y: "100%",
              scale: 1,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: "100%",
              scale: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 28,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-[480px] max-h-[90vh] sm:max-h-[85vh] bg-[#1e1e1e] border-t sm:border border-white/10 rounded-t-[16px] sm:rounded-none flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 z-40 sm:hidden w-[36px] h-[4px] bg-white/40 rounded-full" />

            {/* HEADER */}
            <div className="shrink-0 flex items-center justify-between p-[16px] pt-[28px] sm:pt-[16px] border-b border-white/10 bg-[#1e1e1e] relative z-30">
              <p className="text-white text-[24px] font-bold">Tambah Produk</p>

              <button
                type="button"
                onClick={handleClose}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-[16px] flex flex-col gap-[16px]"
            >
              {/* ==================== */}
              {/* FOTO PRODUK */}
              {/* ==================== */}
              <div className="flex flex-col gap-[6px]">
                <FieldLabel htmlFor="product-image" required>
                  Foto Produk
                </FieldLabel>

                <label
                  htmlFor="product-image"
                  className="relative w-[120px] aspect-square bg-white/5 border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#C0FE04]/50 transition-colors overflow-hidden"
                >
                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-[4px] text-white/40">
                      <ImagePlus size={20} />
                      <p className="text-[12px]">Unggah</p>
                    </div>
                  )}

                  <input
                    id="product-image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* ==================== */}
              {/* NAMA */}
              {/* ==================== */}
              <div className="flex flex-col gap-[6px]">
                <FieldLabel htmlFor="product-name" required>
                  Nama Produk
                </FieldLabel>

                <input
                  id="product-name"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Nasi Goreng Spesial"
                  className="bg-white/5 border border-white/10 text-white text-[12px] px-[12px] py-[8px] focus:outline-none focus:border-[#C0FE04]"
                />
              </div>

              {/* ==================== */}
              {/* HARGA */}
              {/* ==================== */}
              <div className="flex flex-col gap-[6px]">
                <FieldLabel htmlFor="product-price" required>
                  Harga
                </FieldLabel>

                <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-[#C0FE04]">
                  <span className="px-[12px] text-white/50 text-[12px]">
                    Rp
                  </span>

                  <input
                    id="product-price"
                    name="price"
                    required
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-white text-[12px] py-[8px] pr-[12px] focus:outline-none"
                  />
                </div>
              </div>

              {/* ==================== */}
              {/* DESKRIPSI */}
              {/* ==================== */}
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-center justify-between">
                  <FieldLabel>Deskripsi</FieldLabel>

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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    name.trim()
                      ? "Tulis deskripsi, atau pakai Generate dengan AI"
                      : "Isi nama produk dulu buat pakai Generate dengan AI"
                  }
                  className="bg-white/5 border border-white/10 text-white text-[12px] px-[12px] py-[8px] focus:outline-none focus:border-[#C0FE04] resize-none"
                />

                {generateDescription.isPending && (
                  <p className="text-[12px] text-white/40">
                    Sedang membuat rekomendasi deskripsi, bisa sampai 1 menit...
                  </p>
                )}

                <AnimatePresence>
                  {recommendations && recommendations.length > 0 && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        height: 0,
                      }}
                      animate={{
                        opacity: 1,
                        height: "auto",
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                      }}
                      className="flex flex-col gap-[8px] overflow-hidden"
                    >
                      {recommendations.map((rec, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => pickRecommendation(rec.text)}
                          className="text-left p-[10px] bg-white/5 border border-white/10 hover:border-[#C0FE04]/50 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-[4px]">
                            <span className="text-[12px] font-bold text-[#C0FE04] tracking-wide">
                              Rekomendasi {i + 1}
                            </span>

                            <span className="text-[12px] font-bold px-[6px] py-[1px] rounded-full bg-[#C0FE04]/20 text-[#C0FE04]">
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

              {/* ==================== */}
              {/* VARIAN */}
              {/* ==================== */}
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
                  const variantId = variant._tempId;

                  return (
                    <div key={variantId} className="flex items-end gap-[16px]">
                      <div className="flex-1 min-w-0">
                        <FieldLabel
                          htmlFor={`variant-name-${variantId}`}
                          required
                          className={`mb-[8px]`}
                        >
                          Nama Varian
                        </FieldLabel>

                        <input
                          id={`variant-name-${variantId}`}
                          name={`variant-name-${variantId}`}
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(index, "name", e.target.value)
                          }
                          placeholder="Nama varian"
                          required
                          className="w-full bg-white/5 border border-white/10 text-white text-[12px] px-[8px] py-[8px] focus:outline-none focus:border-[#C0FE04]"
                        />
                      </div>

                      <div className="flex flex-col gap-[4px]">
                        <FieldLabel
                          htmlFor={`variant-price-${variantId}`}
                          required
                          className={`mb-[8px]`}
                        >
                          Harga Tambahan
                        </FieldLabel>

                        <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-[#C0FE04]">
                          <span className="pl-[8px] text-white/40 text-[12px]">
                            +Rp
                          </span>

                          <input
                            id={`variant-price-${variantId}`}
                            name={`variant-price-${variantId}`}
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
                        className="mb-[8px] text-red-500/70 shrink-0 hover:text-red-500 transition-colors"
                        aria-label="Hapus varian"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="h-[1px] w-full shrink-0 bg-white/10" />

              {/* ==================== */}
              {/* GRUP ADDON */}
              {/* ==================== */}
              <div className="flex flex-col gap-[8px]">
                <FieldLabel>Grup Addon</FieldLabel>

                <AddonGroupPicker
                  selectedIds={addonGroupIds}
                  onChange={setAddonGroupIds}
                />
              </div>

              {/* ==================== */}
              {/* AKSI */}
              {/* ==================== */}
              <div className="flex gap-[16px] mt-[4px] shrink-0">
                <RevealButton
                  label="batal"
                  type="button"
                  bgAfter="bg-red-500"
                  textAfter="text-white"
                  onClick={handleClose}
                  disable={createProduct.isPending}
                  className="rounded-none"
                />

                <RevealButton
                  label={
                    createProduct.isPending ? "Menyimpan..." : "Tambah Produk"
                  }
                  type="submit"
                  bgBefore="bg-[#C0FE04]"
                  bgAfter="bg-white"
                  textBefore="text-[#1e1e1e]"
                  disabled={createProduct.isPending}
                  className="rounded-none w-full"
                />
              </div>
            </form>
          </motion.div>

          <div onClick={(e) => e.stopPropagation()}>
            <ImageCropperModal
              imageSrc={pendingImageSrc}
              onCancel={() => setPendingImageSrc(null)}
              onConfirm={handleCropConfirm}
              isUploading={false}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
