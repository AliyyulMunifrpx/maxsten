// src/components/buyer/checkout-modal.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ImageOff, X } from "lucide-react";
import { useCart } from "../../context/cart-context.jsx";
import { useCreateQueue } from "../../hooks/buyer.js";
import { saveLastOrderId } from "../../lib/order-history.js";
import { RevealButton } from "../reveal-button.jsx";
import { useSocket } from "../../hooks/socket.js";
import toast from "react-hot-toast";

export default function CheckoutModal({ onClose, onSuccess }) {
  const { storeId } = useParams();
  const { items, removeItem, updateQuantity, clearCart, totalPrice } =
    useCart();
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState("");
  const createQueue = useCreateQueue(storeId);
  const socket = useSocket();

  function handleSubmit() {
    setSubmitError("");

    // ✅ PAYLOAD DIKIRIM KE BACKEND (Pastikan key sesuai dengan Backend!)
    const payload = {
      ...(note.trim() ? { note: note.trim() } : {}),

      items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,

        ...(i.variant?.id
          ? {
              variant_id: i.variant.id,
            }
          : {}),

        ...(i.selected_addons?.length
          ? {
              selected_addons: i.selected_addons.map((a) => a.id),
            }
          : {}),
      })),
    };
    createQueue.mutate(payload, {
      onSuccess: (res) => {
        const queue = res?.data;

        saveLastOrderId(storeId, queue.id);
        clearCart();

        onSuccess?.(queue);
        toast.success("Pesanan berhasil dibuat, silahkan menunggu");
      },
      onError: (err) => {
        toast.error(err.message || "gagal membuat pesanan");
      },
    });
  }

  useEffect(() => {
    if (items.length === 0) {
      onClose();
    }
  }, [items.length, onClose]);

  if (items.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col justify-end lg:justify-center backdrop-blur-md lg:items-center bg-black/70 p-0 lg:p-[40px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full flex flex-col bg-[#1e1e1e] h-[90vh] lg:h-auto lg:max-h-[85vh] lg:max-w-[40%] rounded-t-[20px] lg:rounded-xl overflow-hidden shadow-2xl relative"
      >
        <div className="flex items-center justify-between px-[16px] pt-[16px] pb-[12px] lg:px-[24px] lg:pt-[24px] border-b border-white/10 shrink-0 bg-[#1e1e1e] z-10">
          <p className="text-[18px] font-bold text-white">Checkout Pesanan</p>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-[32px] w-[32px] bg-white/10 text-white hover:bg-white/20 transition-colors rounded-full"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-[16px] p-[16px] lg:p-[24px] overflow-y-auto">
          {submitError && (
            <div className="px-[12px] py-[8px] bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] rounded shrink-0">
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-[10px]">
            <AnimatePresence>
              {items.map((item) => {
                // ✅ RENDER HARGA PER ITEM TERMASUK VARIANT & ADDON
                const unitPrice =
                  item.price +
                  (item.variant?.additional_price || 0) +
                  (item.selected_addons?.reduce((s, a) => s + a.price, 0) || 0);
                const subtotal = unitPrice * item.quantity;

                return (
                  <motion.div
                    key={item.cartItemId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-[12px] bg-white/5 border border-white/10 p-[12px] rounded-none"
                  >
                    <div className="h-[64px] w-[64px] shrink-0 bg-white/10 overflow-hidden rounded">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageOff className="text-white/30" size={18} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="text-[14px] font-bold text-white truncate capitalize">
                          {item.name}
                        </p>
                        {/* Menampilkan Teks Varian */}
                        {item.variant && (
                          <p className="text-[12px] text-white/50">
                            {item.variant.name}
                          </p>
                        )}
                        {/* Menampilkan Teks Addons */}
                        {item.selected_addons?.length > 0 && (
                          <p className="text-[11px] text-white/30 truncate">
                            +{" "}
                            {item.selected_addons.map((a) => a.name).join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-[8px]">
                        <div className="flex items-center gap-[8px]">
                          <button
                            onClick={() =>
                              updateQuantity(item.cartItemId, item.quantity - 1)
                            }
                            className="flex items-center justify-center h-[24px] w-[24px] bg-[#C0FE04]/20 text-[#C0FE04] hover:bg-[#C0FE04]/30 transition-colors rounded"
                          >
                            <Minus size={14} />
                          </button>
                          <p className="text-[13px] font-bold text-white w-[20px] text-center">
                            {item.quantity}
                          </p>
                          <button
                            onClick={() =>
                              updateQuantity(item.cartItemId, item.quantity + 1)
                            }
                            className="flex items-center justify-center h-[24px] w-[24px] bg-[#C0FE04]/20 text-[#C0FE04] hover:bg-[#C0FE04]/30 transition-colors rounded"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="text-[14px] font-bold text-[#C0FE04]">
                          Rp{Number(subtotal).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      className="text-red-500/70 hover:text-red-500 transition-colors self-start p-[4px] -mr-[4px] -mt-[4px]"
                      aria-label="Hapus item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-[8px] mt-[8px]">
            <label className="text-[12px] text-white/50">
              Catatan untuk Toko (opsional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="misal: jangan pedes ya bang, banyakin kuahnya..."
              className="bg-white/5 border border-white/10 text-white text-[14px] px-[12px] py-[10px] focus:outline-none focus:border-[#C0FE04] resize-none rounded-none transition-colors shrink-0"
            />
          </div>
        </div>

        <div className="bg-[#1e1e1e] border-t border-white/10 p-[16px] lg:p-[20px] flex items-center justify-between gap-[16px] shrink-0 z-10">
          <div>
            <p className="text-[12px] text-white/50">Total Pembayaran</p>
            <p className="text-[20px] font-bold text-[#C0FE04]">
              Rp{Number(totalPrice).toLocaleString("id-ID")}
            </p>
          </div>

          <RevealButton
            type="button"
            onClick={handleSubmit}
            disable={createQueue.isPending}
            label={createQueue.isPending ? "Memproses..." : "Pesan Sekarang"}
            bgBefore="bg-[#C0FE04]"
            textBefore="text-[#1e1e1e]"
            bgAfter="bg-white"
            textAfter="text-[#1e1e1e]"
            className="rounded-lg shadow-lg flex-1"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
