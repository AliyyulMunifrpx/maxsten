import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Minus,
  Plus,
  ImageOff,
  Loader2,
  ShoppingCart,
  Check,
  ChevronDown,
} from "lucide-react";
import { useProductDetail } from "../../hooks/buyer.js";
import { useCart } from "../../context/cart-context.jsx";
import toast from "react-hot-toast";
import { RevealButton } from "../reveal-button.jsx";

export default function ProductDetailModal({ storeId, productId, onClose }) {
  const { addItem } = useCart();
  const { data, isLoading, isError } = useProductDetail(storeId, productId);
  const product = data?.data;

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);

  // ✅ STATE UNTUK MELACAK GRUP ADDON EXPAND/COLLAPSE DAN BUDGET TAMPIL
  const [expandedGroups, setExpandedGroups] = useState({});
  const [previewCounts, setPreviewCounts] = useState({});

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedVariant(product.variants?.[0] || null);
      setSelectedAddons([]);
    }
  }, [product]);

  // ✅ LOGIC BUDGETING (Maksimal tampil 3 addon di awal)
  useEffect(() => {
    if (product?.addon_groups) {
      const newExpanded = {};
      const newPreviews = {};
      let budget = 3; // Jatah maksimal addon yang tampil

      product.addon_groups.forEach((group) => {
        const count = group.addons.length;

        if (budget >= count) {
          // Budget cukup buat nampilin full 1 grup -> Otomatis expand
          newExpanded[group.id] = true;
          newPreviews[group.id] = 0; // 0 karena gak ada sisa buat expand
          budget -= count;
        } else if (budget > 0) {
          if (budget === 3) {
            // Grup PERTAMA, tapi isinya lebih dari 3 (misal 4) -> Tampil 3 dulu
            newExpanded[group.id] = false;
            newPreviews[group.id] = 3;
            budget = 0;
          } else {
            // Nanggung (budget sisa 1/2, tapi grup isinya banyak) -> Tutup Total biar ga aneh
            newExpanded[group.id] = false;
            newPreviews[group.id] = 0;
            budget = 0;
          }
        } else {
          // Budget udah habis -> Tutup Total
          newExpanded[group.id] = false;
          newPreviews[group.id] = 0;
        }
      });

      setExpandedGroups(newExpanded);
      setPreviewCounts(newPreviews);
    }
  }, [product]);

  if (!productId) return null;

  function handleAddonToggle(addon) {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  }

  // Fungsi untuk buka/tutup grup addon
  function toggleGroup(groupId) {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

  const basePrice = product?.price || 0;
  const variantPrice = selectedVariant?.additional_price || 0;
  const addonsPrice = selectedAddons.reduce(
    (sum, a) => sum + (a.price || 0),
    0,
  );
  const unitPrice = basePrice + variantPrice + addonsPrice;
  const totalPrice = unitPrice * quantity;

  function handleAddToCart() {
    if (!product) return;

    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity: quantity,
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            additional_price: selectedVariant.additional_price,
          }
        : null,
      selected_addons: selectedAddons.map((a) => ({
        id: a.id,
        name: a.name,
        price: a.price,
      })),
    });

    toast.success("Berhasil ditambahkan ke keranjang!");
    onClose();
  }

  return (
    <AnimatePresence>
      {productId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col backdrop-blur-md justify-end lg:justify-center lg:items-center bg-black/70 p-0 lg:p-[40px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col bg-[#1e1e1e] max-h-[90vh] lg:h-auto lg:max-h-[85vh] lg:max-w-[500px] rounded-t-[20px] lg:rounded-xl overflow-hidden shadow-2xl relative"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-[16px] pt-[16px] pb-[12px] lg:px-[24px] lg:pt-[24px] border-b border-white/10 shrink-0 bg-[#1e1e1e] z-10">
              <p className="text-[18px] font-bold text-white">Detail Produk</p>
              <button
                onClick={onClose}
                className="flex items-center justify-center h-[32px] w-[32px] bg-white/10 text-white hover:bg-white/20 transition-colors rounded-full"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Konten Scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[16px] p-[16px] lg:p-[24px]">
              {isLoading ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                  <Loader2 className="animate-spin text-[#C0FE04]" size={32} />
                </div>
              ) : isError || !product ? (
                <div className="flex min-h-[30vh] items-center justify-center text-center">
                  <p className="text-[14px] text-red-500">
                    Gagal memuat detail produk.
                  </p>
                </div>
              ) : (
                <>
                  {/* Gambar Produk */}
                  <div className="relative w-full aspect-square shrink-0 bg-white/10 overflow-hidden rounded-none">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageOff className="text-white/30" size={32} />
                      </div>
                    )}
                  </div>

                  {/* Informasi Dasar */}
                  <div className="flex flex-col gap-[4px]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[18px] font-bold text-white capitalize">
                        {product.name}
                      </h2>
                      <span className="text-[16px] font-bold text-[#C0FE04]">
                        Rp{Number(product.price).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-[13px] text-white/60 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="h-[1px] w-full bg-white/10" />

                  {/* VARIANT SECTION (TETAP TAMPIL PENUH) */}
                  {product.variants?.length > 0 && (
                    <div className="flex flex-col gap-[8px]">
                      <div className="flex flex-col gap-[8px]">
                        {product.variants.map((variant) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          return (
                            <button
                              key={variant.id}
                              onClick={() => setSelectedVariant(variant)}
                              className={`flex items-center justify-between p-[12px] rounded-lg border transition-all text-left ${
                                isSelected
                                  ? "bg-[#C0FE04]/10 border-[#C0FE04] text-white font-bold"
                                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-[12px]">
                                <div
                                  className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "border-[#C0FE04]"
                                      : "border-white/30"
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="w-[10px] h-[10px] rounded-full bg-[#C0FE04]" />
                                  )}
                                </div>
                                <span className="text-[14px]">
                                  {variant.name}
                                </span>
                              </div>
                              {variant.additional_price > 0 && (
                                <span className="text-[13px] text-[#C0FE04]">
                                  +Rp
                                  {Number(
                                    variant.additional_price,
                                  ).toLocaleString("id-ID")}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ✅ ADDON SECTION DENGAN ACCORDION & BUDGETING */}
                  {product.addon_groups?.length > 0 && (
                    <div className="flex flex-col gap-[16px]">
                      {product.addon_groups.map((group) => {
                        const isExpanded = expandedGroups[group.id];
                        const previewCount = previewCounts[group.id] || 0;

                        // Hitung jumlah addon yang sudah terpilih di dalam grup ini
                        const selectedInGroup = group.addons.filter((a) =>
                          selectedAddons.some((sa) => sa.id === a.id),
                        ).length;

                        // Pisah addon yang preview dan remaining
                        const previewAddons = group.addons.slice(
                          0,
                          previewCount,
                        );
                        const remainingAddons =
                          group.addons.slice(previewCount);

                        // Helper render item
                        const renderAddonButton = (addon) => {
                          const isSelected = selectedAddons.some(
                            (a) => a.id === addon.id,
                          );
                          return (
                            <button
                              key={addon.id}
                              onClick={() => handleAddonToggle(addon)}
                              className={`flex items-center justify-between p-[12px] rounded-lg border transition-all text-left ${
                                isSelected
                                  ? "bg-[#C0FE04]/10 border-[#C0FE04] text-white font-bold"
                                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-[12px]">
                                <div
                                  className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-[#C0FE04] border-[#C0FE04]"
                                      : "border-white/30"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check
                                      size={12}
                                      className="text-[#1e1e1e] stroke-[3]"
                                    />
                                  )}
                                </div>
                                <span className="text-[14px]">
                                  {addon.name}
                                </span>
                              </div>
                              {addon.price > 0 && (
                                <span className="text-[13px] text-[#C0FE04]">
                                  +Rp
                                  {Number(addon.price).toLocaleString("id-ID")}
                                </span>
                              )}
                            </button>
                          );
                        };

                        return (
                          <div key={group.id} className="flex flex-col">
                            {/* Tombol Header Grup */}
                            <button
                              onClick={() => toggleGroup(group.id)}
                              className="group flex items-center justify-between py-[4px] w-full text-left focus:outline-none"
                            >
                              <div className="flex items-center gap-[8px]">
                                <span className="text-[12px] text-white/50 group-hover:text-white/80 capitalize font-bold transition-colors">
                                  {group.name}
                                </span>
                                {/* Indikator jika ada yang dipilih */}
                                {selectedInGroup > 0 && (
                                  <span className="bg-[#C0FE04] text-[#1e1e1e] text-[10px] font-bold px-[6px] py-[2px] rounded-full">
                                    {selectedInGroup} Terpilih
                                  </span>
                                )}
                              </div>
                              {/* Munculin panah cuma kalau ada sisa addon yang nunggu di-expand */}
                              {remainingAddons.length > 0 && (
                                <ChevronDown
                                  size={16}
                                  className={`text-white/50 transition-transform duration-300 ${
                                    isExpanded ? "rotate-180" : "rotate-0"
                                  }`}
                                />
                              )}
                            </button>

                            {/* PREVIEW ADDON (Yang tampil duluan) */}
                            {previewAddons.length > 0 && (
                              <div className="flex flex-col gap-[8px] pt-[8px]">
                                {previewAddons.map(renderAddonButton)}
                              </div>
                            )}

                            {/* DAFTAR ADDON SISA (Animasi Expand/Collapse) */}
                            <AnimatePresence initial={false}>
                              {isExpanded && remainingAddons.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: 0.25,
                                    ease: "easeInOut",
                                  }}
                                  className="overflow-hidden"
                                >
                                  <div className="flex flex-col gap-[8px] pt-[8px]">
                                    {remainingAddons.map(renderAddonButton)}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Kuantitas */}
                  <div className="flex items-center justify-between pt-[4px]">
                    <span className="text-[14px] font-bold text-white">
                      Jumlah
                    </span>
                    <div className="flex items-center gap-[12px]">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="flex items-center justify-center h-[32px] w-[32px] bg-white/10 text-white hover:bg-white/20 transition-colors rounded-lg disabled:opacity-30"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-[16px] font-bold text-white w-[24px] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="flex items-center justify-center h-[32px] w-[32px] bg-white/10 text-white hover:bg-white/20 transition-colors rounded-lg"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Modal */}
            {product && !isLoading && (
              <div className="bg-[#1e1e1e] border-t border-white/10 p-[16px] lg:p-[20px] flex items-center justify-between gap-[16px] shrink-0 z-10">
                <div>
                  <p className="text-[12px] text-white/50">Total Harga</p>
                  <p className="text-[20px] font-bold text-[#C0FE04]">
                    Rp{Number(totalPrice).toLocaleString("id-ID")}
                  </p>
                </div>

                <RevealButton
                  type="button"
                  onClick={handleAddToCart}
                  disable={!product.is_available}
                  label={
                    product.is_available ? "Tambah ke Keranjang" : "Stok Habis"
                  }
                  icon={ShoppingCart}
                  bgBefore="bg-[#C0FE04]"
                  textBefore="text-[#1e1e1e]"
                  bgAfter="bg-white"
                  textAfter="text-[#1e1e1e]"
                  className="rounded-lg shadow-lg flex-1"
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
