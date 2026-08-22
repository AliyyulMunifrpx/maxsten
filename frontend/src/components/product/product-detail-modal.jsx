// src/components/product/product-detail-modal.jsx
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash2, ImageOff, Pencil } from "lucide-react";
import {
  getProductDetail,
  useUpdateProductImage,
} from "../../hooks/product.js";
import { useRef, useState } from "react";
import ImageCropperModal from "../image-cropper-modal.jsx";
import ProductEditModal from "./product-edit-modal.jsx";
import ConfirmDialog from "../confirm-dialog.jsx";
import { RevealButton } from "../reveal-button.jsx";

export default function ProductDetailModal({
  productId,
  onClose,
  onEdit,
  onDelete,
  onToggleAvailability,
}) {
  const { data, isLoading, isError, error } = getProductDetail(productId);
  const product = data?.data;
  const fileInputRef = useRef(null);
  const [pendingImageSrc, setPendingImageSrc] = useState(null);
  const updateImage = useUpdateProductImage();
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formattedPrice = product
    ? `Rp${Number(product.price ?? 0).toLocaleString("id-ID")}`
    : "";
  const accentColor = product?.is_available ? "#C0FE04" : "#ef4444";

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImageSrc(URL.createObjectURL(file));
    e.target.value = ""; // biar bisa pilih file yang sama lagi kalau batal
  }

  function handleCropConfirm(blob) {
    updateImage.mutate(
      { productId: product.id, imageBlob: blob },
      {
        onSuccess: () => setPendingImageSrc(null),
      },
    );
  }

  return (
    <AnimatePresence>
      {productId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/70 sm:p-[16px] backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: "100%", scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: "100%", scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            // PERUBAHAN: Ganti overflow-y-auto menjadi overflow-hidden di kontainer induk
            className="relative w-full sm:max-w-[420px] max-h-[90vh] sm:max-h-[85vh] bg-[#1e1e1e] border-t sm:border border-white/10 rounded-t-[16px] sm:rounded-none flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Indikator Laci (Drag Handle) - Hanya tampil di Mobile */}
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 z-40 sm:hidden w-[36px] h-[4px] bg-white/40 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />

            {/* HEADER FIXED (Tidak ikut kescroll) */}
            <div className="shrink-0 flex items-center justify-between p-[16px] pt-[28px] sm:pt-[16px] border-b border-white/10 bg-[#1e1e1e] relative z-30">
              <p className="text-white text-[16px] font-bold">Detail Produk</p>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* BODY SCROLLABLE (Hanya bagian ini yang bisa di-scroll) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative">
              {isLoading && (
                <div className="flex items-center justify-center h-[320px]">
                  <p className="text-[14px] text-white/50">Memuat...</p>
                </div>
              )}

              {isError && (
                <div className="flex items-center justify-center h-[320px] px-[16px] text-center">
                  <p className="text-[14px] text-red-500">
                    {error?.response?.data?.errors ||
                      "Gagal memuat detail produk."}
                  </p>
                </div>
              )}

              {product && (
                <>
                  {/* Gambar */}
                  <div className="relative w-full aspect-square bg-white/5 shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="absolute inset-0 w-full p-[16px] h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageOff className="text-white/30" size={32} />
                      </div>
                    )}

                    {!product.is_available && (
                      <span className="absolute top-[12px] left-[12px] text-[11px] font-bold px-[8px] py-[2px] rounded-full bg-red-500/90 text-white z-30">
                        Habis
                      </span>
                    )}

                    {/* Tombol edit gambar */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-[12px] right-[12px] flex items-center gap-[6px] px-[10px] py-[6px] rounded-full bg-black/60 text-white text-[12px] font-medium hover:bg-black/80 transition-colors z-30"
                    >
                      <Pencil size={14} />
                      Ganti Foto
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Konten Detail */}
                  <div className="p-[16px] flex flex-col gap-[8px]">
                    {/* Info utama */}
                    <div className="flex flex-col gap-[4px]">
                      <p className="font-bold text-white capitalize text-[18px]">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="text-white/50 text-[12px]">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="h-[1px] w-full bg-white/10" />

                    <div className="flex items-end justify-between">
                      <p
                        className="font-bold text-[16px]"
                        style={{ color: accentColor }}
                      >
                        {formattedPrice}
                      </p>
                      {product.total_sold > 0 && (
                        <p className="text-white/40 text-[12px]">
                          {product.total_sold} terjual
                        </p>
                      )}
                    </div>

                    {/* Toggle ketersediaan */}
                    <div className="flex items-center justify-between py-[8px] border-y border-white/10">
                      <p className="text-white text-[12px]">
                        Status Ketersediaan
                      </p>
                      <button
                        onClick={() =>
                          onToggleAvailability?.(
                            product.id,
                            !product.is_available,
                          )
                        }
                        className={`flex items-center h-[24px] w-[44px] rounded-full transition-colors ${
                          product.is_available ? "bg-green-500" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                            product.is_available
                              ? "translate-x-[22px]"
                              : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Varian */}
                    {product.variants?.length > 0 && (
                      <div className="flex flex-col">
                        <p className="text-[12px] text-white/50">Varian:</p>
                        <div className="flex flex-col">
                          {product.variants.map((variant) => (
                            <div
                              key={variant.id}
                              className="flex items-center justify-between text-[12px]"
                            >
                              <p className="text-white">{variant.name}</p>
                              <p className="text-white/50">
                                +Rp
                                {Number(
                                  variant.additional_price,
                                ).toLocaleString("id-ID")}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Addon Groups */}
                    {product.productAddonGroups?.length > 0 && (
                      <div className="flex flex-col">
                        <p className="text-[12px] text-white/50">Addon:</p>
                        {product.productAddonGroups.map(({ addon_group }) => (
                          <div key={addon_group.id} className="flex flex-col">
                            <p className="text-[12px] font-medium text-white">
                              {addon_group.name}
                            </p>
                            <div className="flex flex-col pl-[8px] border-l border-white/10">
                              {addon_group.addons.map((addon) => (
                                <div
                                  key={addon.id}
                                  className="flex items-center justify-between text-[12px]"
                                >
                                  <p className="text-white/70">{addon.name}</p>
                                  <p className="text-white/40">
                                    {addon.price > 0
                                      ? `+Rp${Number(addon.price).toLocaleString("id-ID")}`
                                      : "Gratis"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Aksi */}
                    <div className="flex gap-[8px] mt-[8px]">
                      <RevealButton
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        label="Edit Produk"
                        bgBefore="bg-white/10"
                        textBefore="text-white"
                        bgAfter="bg-white"
                        textAfter="text-[#1e1e1e]"
                        className="flex-1 rounded-none"
                      />

                      <RevealButton
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        label="Hapus Produk"
                        icon={Trash2}
                        bgBefore="bg-red-400/20"
                        textBefore="text-red-400"
                        bgAfter="bg-red-500"
                        textAfter="text-white"
                        className="flex-1 px-0 shrink-0 rounded-none"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <ImageCropperModal
        imageSrc={pendingImageSrc}
        onCancel={() => setPendingImageSrc(null)}
        onConfirm={handleCropConfirm}
        isUploading={updateImage.isPending}
      />
      <ProductEditModal
        key={editingProduct?.id}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Hapus produk?"
        description={`Produk "${product?.name}" akan dihapus. Tindakan ini gak bisa dibatalkan.`}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete?.(product.id);
        }}
      />
    </AnimatePresence>
  );
}
