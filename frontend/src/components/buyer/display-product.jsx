import { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelQueueBuyer,
  createQueue,
  getAllProducts,
  getQueue,
} from "../../lib/buyerApi.js";
import toast from "react-hot-toast";
import { t } from "i18next";
import { getGuestId } from "../../lib/guestHelper.js";
import { socket } from "../../lib/socket/socket.js";
import CountdownTimer from "./countdown.jsx";

const STATUS_STYLES = {
  BELUM_BAYAR: { bg: "#F1EFE9", fg: "#6B6558" },
  DIPROSES: { bg: "#FCEFDA", fg: "#9C6A16" },
  SELESAI: { bg: "#E7F3EC", fg: "#147356" },
  DIBATALKAN: { bg: "#FBEAE7", fg: "#B23A2E" },
};

export default function DisplayProduct() {
  const guestId = getGuestId();
  const { storeId } = useParams();
  const queryClient = useQueryClient();
  const backendUrl = import.meta.env.VITE_API_PATH.replace("/api", "");

  const [cart, setCart] = useState({});
  const [activeVariants, setActiveVariants] = useState({});
  const [selectedAddonsByProduct, setSelectedAddonsByProduct] = useState({});
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [note, setNote] = useState("");
  const [activeQueueId, setActiveQueueId] = useState(() => {
    return localStorage.getItem(`activeQueue_${storeId}`) || null;
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);

  const { data: store, isLoading: isStoreLoading } = useQuery({
    queryKey: ["store", storeId],
    queryFn: () => getAllProducts(storeId),
  });

  const { data: activeQueue } = useQuery({
    queryKey: ["queue", storeId, activeQueueId],
    queryFn: () => getQueue(storeId, activeQueueId),
    enabled: !!activeQueueId,
  });

  const createQueueMutation = useMutation({
    mutationFn: createQueue,
    onSuccess: (result) => {
      toast.success(`Pesanan berhasil dibuat!`);
      setCart({});
      setIsCartModalOpen(false);
      setActiveQueueId(result.id);
      localStorage.setItem(`activeQueue_${storeId}`, result.id);
      setIsQueueModalOpen(true);
      setNote("");
    },
    onError: (error) => {
      const message = error.response?.data?.errors || "Terjadi kesalahan.";
      toast.error(t(`api_errors.${message}`));
    },
  });

  const cancelQueueMutation = useMutation({
    mutationFn: (data) => cancelQueueBuyer(data),
    onSuccess: () => {
      toast.success("Pesanan berhasil dibatalkan.");
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal membatalkan pesanan.");
    },
  });

  useEffect(() => {
    if (
      activeQueue &&
      (activeQueue.status === "SELESAI" || activeQueue.status === "DIBATALKAN")
    ) {
      localStorage.removeItem(`activeQueue_${storeId}`);
      setActiveQueueId(null);
      setIsQueueModalOpen(false);
    }
  }, [activeQueue, storeId]);

  // ================= SOCKET.IO =================
  useEffect(() => {
    if (!socket || !activeQueueId) return;

    socket.emit("JOIN_QUEUE_ROOM", activeQueueId);

    const handleQueueUpdated = (updatedQueueData) => {
      queryClient.setQueryData(
        ["queue", storeId, activeQueueId],
        updatedQueueData,
      );

      if (updatedQueueData.status === "DIPROSES") {
        toast.success("Pesananmu sedang diproses!");
      }

      if (
        updatedQueueData.status === "SELESAI" ||
        updatedQueueData.status === "DIBATALKAN"
      ) {
        if (updatedQueueData.status === "SELESAI") {
          toast.success("Pesanan selesai! Silakan ambil pesananmu.");
        } else {
          toast.error("Pesanan dibatalkan oleh toko.");
        }
        localStorage.removeItem(`activeQueue_${storeId}`);
        setActiveQueueId(null);
        setIsQueueModalOpen(false);
      }
    };

    const handleQueueEdited = (updatedQueueData) => {
      queryClient.setQueryData(
        ["queue", storeId, activeQueueId],
        updatedQueueData,
      );

      if (updatedQueueData.status === "DIBATALKAN") {
        localStorage.removeItem(`activeQueue_${storeId}`);
        setActiveQueueId(null);
        setIsQueueModalOpen(false);
      }
    };

    socket.on("STATUS_UPDATED", handleQueueUpdated);
    socket.on("STATUS_EDITED", handleQueueEdited);

    return () => {
      socket.off("STATUS_UPDATED", handleQueueUpdated);
      socket.off("STATUS_EDITED", handleQueueEdited);
      socket.emit("LEAVE_QUEUE_ROOM", activeQueueId);
    };
  }, [queryClient, storeId, activeQueueId]);

  // ================= UTILS & KERANJANG =================
  useEffect(() => {
    if (isCartModalOpen || isQueueModalOpen || selectedProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isCartModalOpen, isQueueModalOpen, selectedProduct]);

  const getActiveVariantId = (product) => {
    if (Object.prototype.hasOwnProperty.call(activeVariants, product.id)) {
      return activeVariants[product.id];
    }
    return product.variants?.[0]?.id || "";
  };

  const getSelectedAddonsForProduct = (productId) => {
    return selectedAddonsByProduct[productId] || [];
  };

  const toggleAddonSelection = (productId, addonId) => {
    setSelectedAddonsByProduct((prev) => {
      const current = prev[productId] || [];
      const updated = current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId];
      return {
        ...prev,
        [productId]: updated,
      };
    });
  };

  const totalHarga = useMemo(() => {
    if (!store || !store.products) return 0;
    let total = 0;
    Object.values(cart).forEach((item) => {
      const product = store.products.find((p) => p.id === item.productId);
      if (product) {
        const variant = product.variants?.find((v) => v.id === item.variantId);
        const variantPrice = variant ? variant.additional_price : 0;

        const addonPrice = (item.selectedAddons || []).reduce(
          (sum, addonId) => {
            const addon = product.productAddonGroups
              .flatMap((pag) => pag.addon_group.addons)
              .find((a) => a.id === addonId);
            return sum + (addon?.price || 0);
          },
          0,
        );

        total += (product.price + variantPrice + addonPrice) * item.quantity;
      }
    });
    return total;
  }, [cart, store]);

  const totalItem = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const handleVariantSelect = (productId, variantId) => {
    setActiveVariants((prev) => ({ ...prev, [productId]: variantId }));
  };

  const addToCart = (product, qty = 1) => {
    // PROTEKSI: Kalau toko tiba-tiba tutup pas user mau nambah ke keranjang
    if (!store?.is_open) {
      return toast.error("Maaf, toko sedang tutup.");
    }
    if (activeQueueId) {
      return toast.error(
        "Selesaikan antrean aktifmu dulu sebelum memesan lagi.",
      );
    }

    const variantId = getActiveVariantId(product);
    const selectedAddons = getSelectedAddonsForProduct(product.id);
    const sortedAddonIds = [...selectedAddons].sort();
    const addonKey = sortedAddonIds.join(",");
    const cartKey = `${product.id}-${variantId || "base"}-${addonKey}`;

    setCart((prev) => ({
      ...prev,
      [cartKey]: {
        productId: product.id,
        variantId: variantId || null,
        selectedAddons: sortedAddonIds,
        quantity: (prev[cartKey]?.quantity || 0) + qty,
      },
    }));
  };

  const increase = (cartKey) => {
    setCart((prev) => {
      if (!prev[cartKey]) return prev;
      return {
        ...prev,
        [cartKey]: { ...prev[cartKey], quantity: prev[cartKey].quantity + 1 },
      };
    });
  };

  const decrease = (cartKey) => {
    setCart((prev) => {
      if (!prev[cartKey]) return prev;
      if (prev[cartKey].quantity <= 1) {
        const copy = { ...prev };
        delete copy[cartKey];
        if (Object.keys(copy).length === 0) setIsCartModalOpen(false);
        return copy;
      }
      return {
        ...prev,
        [cartKey]: { ...prev[cartKey], quantity: prev[cartKey].quantity - 1 },
      };
    });
  };

  const handleCreateQueue = () => {
    const items = Object.values(cart).map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      variant_id: item.variantId || undefined,
      selected_addons: item.selectedAddons?.length
        ? item.selectedAddons
        : undefined,
    }));
    createQueueMutation.mutate({
      public_id: storeId,
      items,
      guest_id: guestId,
      note: note,
    });
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setModalQuantity(1);
  };

  const modalUnitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    const variantId = getActiveVariantId(selectedProduct);
    const variant = selectedProduct.variants?.find((v) => v.id === variantId);
    const variantPrice = variant ? variant.additional_price : 0;

    const selectedAddons = getSelectedAddonsForProduct(selectedProduct.id);
    const addonPrice = selectedAddons.reduce((sum, addonId) => {
      const addon = selectedProduct.productAddonGroups
        ?.flatMap((pag) => pag.addon_group.addons)
        .find((a) => a.id === addonId);
      return sum + (addon?.price || 0);
    }, 0);

    return selectedProduct.price + variantPrice + addonPrice;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, activeVariants, selectedAddonsByProduct]);

  // ================= RENDER =================
  if (isStoreLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E1D8] border-t-[#C98A1F]" />
          <p className="text-sm text-[#8A8375]">Memuat menu…</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6] p-6">
        <p className="font-semibold text-[#B23A2E]">
          Gagal memuat menu atau toko tidak ditemukan.
        </p>
      </div>
    );
  }

  const currentVariantId = selectedProduct
    ? getActiveVariantId(selectedProduct)
    : "";
  const isStoreClosed = store.is_open === false; // <-- Variabel sakti baru

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6]">
      <div className="mx-auto max-w-6xl px-3 pb-32 pt-4 sm:p-6 sm:pb-40">
        {/* HEADER TOKO */}
        <div className="mb-2 flex items-center gap-3 px-1 sm:gap-4 sm:px-0">
          {store.logo_url && (
            <img
              src={`${backendUrl}${store.logo_url}`}
              alt="Logo Toko"
              className="h-10 w-10 rounded-full border border-[#E4E1D8] object-cover sm:h-12 sm:w-12"
            />
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#C98A1F] sm:text-xs">
              Katalog Menu
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-bold text-[#1C2321] sm:text-3xl">
                {store.name}
              </h1>
              {/* BADGE BUKA/TUTUP */}
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${isStoreClosed ? "bg-[#FBEAE7] text-[#B23A2E]" : "bg-[#E7F3EC] text-[#147356]"}`}
              >
                {isStoreClosed ? "Tutup" : "Buka"}
              </span>
            </div>
          </div>
        </div>

        {store.description && (
          <p className="px-1 text-xs text-[#8A8375] sm:px-0 sm:text-sm">
            {store.description}
          </p>
        )}

        {isStoreClosed && (
          <div className="mt-4 rounded-xl border border-[#F1CFC7] bg-[#FBEAE7] p-3 text-center shadow-sm">
            <p className="text-sm font-semibold text-[#B23A2E]">
              Mohon maaf, toko sedang tutup. Kamu belum bisa melakukan pemesanan
              saat ini.
            </p>
          </div>
        )}

        <div
          className="my-4 h-px w-full sm:my-6"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #D8D3C4 0 10px, transparent 10px 18px)",
          }}
          aria-hidden="true"
        />

        {/* GRID PRODUK */}
        {store.products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8D3C4] bg-white/60 p-10 text-center">
            <p className="text-[#8A8375]">Belum ada produk.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {store.products.map((product) => {
              const productCartItems = Object.entries(cart).filter(
                ([, item]) => item.productId === product.id,
              );
              const totalQtyInCart = productCartItems.reduce(
                (sum, [, item]) => sum + item.quantity,
                0,
              );
              const isSelected = totalQtyInCart > 0;

              // Cek ketersediaan: Kalo toko tutup, anggep aja ga bisa diklik (kayak sold out)
              const isSoldOut = product.is_available === false;
              const isUnclickable = isSoldOut || isStoreClosed;

              const hasOptions =
                (product.variants && product.variants.length > 0) ||
                (product.productAddonGroups &&
                  product.productAddonGroups.length > 0);

              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={isUnclickable ? -1 : 0}
                  onClick={() => {
                    if (isUnclickable) return; // Proteksi blokir klik
                    if (activeQueueId) {
                      toast.error(
                        "Selesaikan antrean aktifmu dulu sebelum memesan lagi.",
                      );
                      return;
                    }
                    openProductModal(product);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (isUnclickable) return;
                      if (activeQueueId) {
                        toast.error(
                          "Selesaikan antrean aktifmu dulu sebelum memesan lagi.",
                        );
                        return;
                      }
                      openProductModal(product);
                    }
                  }}
                  className={`group flex h-full flex-col overflow-hidden rounded-lg border bg-white transition ${
                    isUnclickable
                      ? "cursor-not-allowed select-none border-[#E4E1D8] bg-[#FAF9F6] opacity-60"
                      : isSelected
                        ? "cursor-pointer border-[#C98A1F] ring-1 ring-[#C98A1F]"
                        : "cursor-pointer border-[#E4E1D8] hover:border-[#C98A1F]/60"
                  }`}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-[#F1EFE9]">
                    {product.image_url ? (
                      <img
                        src={`${backendUrl}${product.image_url}`}
                        alt={product.name}
                        className={`h-full w-full object-cover transition ${!isUnclickable && "group-hover:scale-105"}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}

                    {isSelected && !isUnclickable && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#147356] text-[11px] font-bold text-white shadow">
                        {totalQtyInCart}
                      </span>
                    )}

                    {/* LABEL TUTUP / HABIS */}
                    {isStoreClosed ? (
                      <span className="absolute inset-x-0 bottom-0 bg-[#1C2321] py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white">
                        Toko Tutup
                      </span>
                    ) : isSoldOut ? (
                      <span className="absolute inset-x-0 bottom-0 bg-[#B23A2E] py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white">
                        Habis
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#1C2321] text-sm font-bold text-white shadow group-hover:bg-[#C98A1F]"
                      >
                        +
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
                    <h2 className="line-clamp-2 text-xs font-medium leading-snug text-[#1C2321] sm:text-sm">
                      {product.name}
                    </h2>
                    <p
                      className={`font-mono text-sm font-bold sm:text-base ${isUnclickable ? "text-[#8A8375]" : "text-[#147356]"}`}
                    >
                      {hasOptions ? "Mulai " : ""}Rp{" "}
                      {product.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETAIL PRODUK (Varian + Addon) */}
      {/* (Tidak ada perubahan di sini karena tombol produknya udah diblokir duluan dari luar) */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[65] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[#FAF9F6] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex justify-center pt-2 sm:hidden"
              aria-hidden="true"
            >
              <span className="h-1 w-10 rounded-full bg-[#E4E1D8]" />
            </div>

            <div className="flex items-center justify-between border-b border-[#E4E1D8] bg-white px-5 py-3.5">
              <h2 className="text-lg font-bold text-[#1C2321]">
                Detail Produk
              </h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-2 text-2xl font-bold leading-none text-[#8A8375] hover:text-[#B23A2E]"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-5 flex gap-3 rounded-xl border border-[#E4E1D8] bg-white p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F1EFE9] sm:h-24 sm:w-24">
                  {selectedProduct.image_url ? (
                    <img
                      src={`${backendUrl}${selectedProduct.image_url}`}
                      alt={selectedProduct.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">
                      🍽️
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center">
                  <h3 className="font-bold leading-snug text-[#1C2321]">
                    {selectedProduct.name}
                  </h3>
                  <p className="mt-1 font-mono text-lg font-bold text-[#147356]">
                    Rp {modalUnitPrice.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {selectedProduct.variants &&
                selectedProduct.variants.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8A8375]">
                      Pilih Varian
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            handleVariantSelect(selectedProduct.id, v.id)
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            currentVariantId === v.id
                              ? "border-[#C98A1F] bg-[#FCEFDA] text-[#9C6A16]"
                              : "border-[#E4E1D8] bg-white text-[#1C2321] hover:border-[#C98A1F]"
                          }`}
                        >
                          {v.name}
                          {v.additional_price > 0
                            ? ` +Rp ${v.additional_price.toLocaleString("id-ID")}`
                            : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {selectedProduct.productAddonGroups &&
                selectedProduct.productAddonGroups.length > 0 && (
                  <div className="space-y-4">
                    {selectedProduct.productAddonGroups.map((pag) => (
                      <div key={pag.addon_group.id}>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8A8375]">
                          {pag.addon_group.name}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {pag.addon_group.addons.map((addon) => {
                            const isChecked = getSelectedAddonsForProduct(
                              selectedProduct.id,
                            ).includes(addon.id);
                            return (
                              <label
                                key={addon.id}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] transition ${
                                  isChecked
                                    ? "border-[#147356] bg-[#E7F3EC]"
                                    : "border-[#E4E1D8] bg-white hover:bg-[#F7F7F7]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    toggleAddonSelection(
                                      selectedProduct.id,
                                      addon.id,
                                    )
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-[#147356] focus:ring-[#147356]"
                                />
                                <span className="leading-tight">
                                  {addon.name}{" "}
                                  {addon.price > 0
                                    ? `(+Rp ${addon.price.toLocaleString("id-ID")})`
                                    : ""}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="border-t border-[#E4E1D8] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1C2321]">Jumlah</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E4E1D8] bg-white text-lg font-bold text-[#1C2321] transition hover:bg-gray-50 active:scale-90"
                  >
                    –
                  </button>
                  <span className="w-6 text-center font-mono font-bold">
                    {modalQuantity}
                  </span>
                  <button
                    onClick={() => setModalQuantity((q) => q + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-[#147356] text-white text-lg font-bold transition hover:bg-[#0F5C44] active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  addToCart(selectedProduct, modalQuantity);
                  setSelectedProduct(null);
                }}
                className="w-full rounded-xl bg-[#1C2321] py-3.5 text-lg font-bold text-white transition hover:bg-[#333B38]"
              >
                Tambah ke Keranjang · Rp{" "}
                {(modalUnitPrice * modalQuantity).toLocaleString("id-ID")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KERANJANG */}
      {isCartModalOpen && !activeQueueId && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div
            className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-[#FAF9F6] shadow-2xl sm:rounded-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E4E1D8] bg-white px-5 py-4">
              <h2 className="text-lg font-bold text-[#1C2321]">
                Keranjang Pesanan
              </h2>
              <button
                onClick={() => setIsCartModalOpen(false)}
                className="text-[#8A8375] hover:text-[#B23A2E] text-2xl font-bold px-2 leading-none"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ul className="divide-y divide-[#E4E1D8]">
                {Object.entries(cart).map(([cartKey, item]) => {
                  const product = store.products.find(
                    (p) => p.id === item.productId,
                  );
                  if (!product) return null;
                  const variant = product.variants?.find(
                    (v) => v.id === item.variantId,
                  );
                  const addonPrice = (item.selectedAddons || []).reduce(
                    (sum, addonId) => {
                      const addon = product.productAddonGroups
                        .flatMap((pag) => pag.addon_group.addons)
                        .find((a) => a.id === addonId);
                      return sum + (addon?.price || 0);
                    },
                    0,
                  );
                  const itemPrice =
                    product.price +
                    (variant ? variant.additional_price : 0) +
                    addonPrice;
                  return (
                    <li key={cartKey} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-bold text-[#1C2321]">
                            {product.name}
                          </p>
                          <p className="text-sm font-semibold text-[#C98A1F] mt-0.5">
                            {variant ? `Varian: ${variant.name}` : "Original"}
                          </p>
                          {(item.selectedAddons || []).length > 0 && (
                            <p className="mt-1 text-xs text-[#8A8375]">
                              Add-on:{" "}
                              {item.selectedAddons
                                .map((addonId) => {
                                  const addon = product.productAddonGroups
                                    .flatMap((pag) => pag.addon_group.addons)
                                    .find((a) => a.id === addonId);
                                  return addon ? addon.name : addonId;
                                })
                                .join(", ")}
                            </p>
                          )}
                          <p className="mt-1 font-mono text-sm text-[#8A8375]">
                            Rp {itemPrice.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-mono font-bold text-[#147356]">
                            Rp{" "}
                            {(itemPrice * item.quantity).toLocaleString(
                              "id-ID",
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-auto">
                            <button
                              onClick={() => decrease(cartKey)}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E4E1D8] bg-white text-lg font-bold text-[#1C2321]"
                            >
                              –
                            </button>
                            <span className="w-5 text-center font-mono font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => increase(cartKey)}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#147356] text-white text-lg font-bold hover:bg-[#0F5C44]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="border-t border-[#E4E1D8] bg-white p-5">
              <div className="mb-5">
                <label className="text-xs font-bold text-[#1C2321] uppercase tracking-wide">
                  Catatan Pesanan
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Sambalnya dipisah, minumnya es dikit aja..."
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#E4E1D8] bg-[#FAF9F6] p-3 text-sm outline-none transition focus:border-[#C98A1F] focus:bg-white focus:ring-1 focus:ring-[#C98A1F]"
                  rows="2"
                />
              </div>
              <div className="mb-4 flex justify-between items-center">
                <p className="font-bold text-[#1C2321]">Total Bayar</p>
                <p className="font-mono text-2xl font-bold text-[#1C2321]">
                  Rp {totalHarga.toLocaleString("id-ID")}
                </p>
              </div>
              <button
                onClick={handleCreateQueue}
                disabled={createQueueMutation.isPending}
                className="w-full rounded-xl bg-[#147356] py-3.5 text-lg font-bold text-white transition hover:bg-[#0F5C44] disabled:opacity-50"
              >
                {createQueueMutation.isPending ? "Memesan…" : "Beli Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANTREAN (Tiket Aktif) */}
      {isQueueModalOpen && activeQueue && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E4E1D8] bg-[#FCFBF9] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#C98A1F]">
                  Tiket Aktif
                </p>
                <h2 className="text-lg font-bold text-[#1C2321]">
                  Antrean #{activeQueue.queue_number}
                </h2>
              </div>
              <button
                onClick={() => setIsQueueModalOpen(false)}
                className="text-[#8A8375] hover:text-[#B23A2E] text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 pb-8">
              <div className="mb-5 flex flex-col items-center rounded-xl bg-[#FAF9F6] p-4 text-center border border-[#E4E1D8]">
                <p className="mb-1 text-xs font-semibold uppercase text-[#8A8375]">
                  Status Pesanan
                </p>
                <span
                  className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor:
                      STATUS_STYLES[activeQueue.status]?.bg || "#eee",
                    color: STATUS_STYLES[activeQueue.status]?.fg || "#333",
                  }}
                >
                  {activeQueue.status.replace("_", " ")}
                </span>

                {activeQueue.status === "BELUM_BAYAR" && (
                  <div className="mt-3 border-t border-[#E4E1D8] pt-3 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase font-bold text-[#B23A2E]">
                        Batas Waktu Bayar
                      </p>
                      <CountdownTimer createdAt={activeQueue.created_at} />
                    </div>
                    <button
                      onClick={() => {
                        if (
                          window.confirm("Yakin mau membatalkan pesanan ini?")
                        ) {
                          cancelQueueMutation.mutate({
                            storeId,
                            queueId: activeQueue.id,
                          });
                        }
                      }}
                      className="w-full mt-2 rounded-lg border border-[#B23A2E] py-2 text-xs font-bold text-[#B23A2E] transition hover:bg-[#FBEAE7]"
                    >
                      Batalkan Pesanan
                    </button>
                  </div>
                )}
              </div>

              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1C2321]">
                Rincian Pesanan
              </h3>
              <ul className="divide-y divide-dashed divide-[#E4E1D8] border-y border-dashed border-[#E4E1D8]">
                {activeQueue.queueDetails?.map((item) => {
                  const addonPrice =
                    item.selected_addons?.reduce(
                      (sum, addon) => sum + (addon?.price || 0),
                      0,
                    ) || 0;
                  const itemPrice =
                    item.product.price +
                    (item.variant?.additional_price || 0) +
                    addonPrice;
                  return (
                    <li key={item.id} className="py-3 flex justify-between">
                      <div>
                        <p className="font-bold text-sm text-[#1C2321]">
                          {item.product.name}
                        </p>
                        {item.variant && (
                          <p className="text-xs font-semibold text-[#C98A1F]">
                            Varian: {item.variant.name}
                          </p>
                        )}
                        {item.selected_addons &&
                          item.selected_addons.length > 0 && (
                            <p className="text-xs text-[#8A8375] mt-1">
                              Add-on:{" "}
                              {item.selected_addons
                                .map((addon) => addon.name || addon.id)
                                .join(", ")}
                            </p>
                          )}
                        <p className="text-xs text-[#8A8375] mt-1">
                          {item.quantity} x Rp{" "}
                          {itemPrice.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-sm text-[#1C2321]">
                        Rp {(itemPrice * item.quantity).toLocaleString("id-ID")}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex justify-between items-center bg-[#1C2321] text-white p-4 rounded-xl">
                <p className="text-sm font-bold">Total</p>
                <p className="font-mono text-xl font-bold">
                  Rp {activeQueue.total_price.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BAR BAWAH */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E4E1D8] bg-white shadow-[0_-8px_24px_rgba(28,35,33,0.08)]">
        <div
          className="h-px w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #D8D3C4 0 10px, transparent 10px 18px)",
          }}
          aria-hidden="true"
        />

        {/* Prioritas 1: Kalo punya antrean aktif, WAJIB ditampilin (walaupun toko tiba-tiba tutup) */}
        {activeQueueId && activeQueue ? (
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl shadow-sm"
                style={{
                  backgroundColor: STATUS_STYLES[activeQueue.status]?.bg,
                }}
              >
                {activeQueue.status === "SELESAI"
                  ? "🎉"
                  : activeQueue.status === "DIBATALKAN"
                    ? "❌"
                    : "⏳"}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8A8375] sm:text-sm">
                  Antrean #{activeQueue.queue_number}
                </p>
                <h2
                  className="text-sm font-bold uppercase sm:text-lg"
                  style={{ color: STATUS_STYLES[activeQueue.status]?.fg }}
                >
                  {activeQueue.status.replace("_", " ")}
                </h2>
              </div>
            </div>
            <button
              onClick={() => setIsQueueModalOpen(true)}
              className="shrink-0 rounded-xl bg-[#1C2321] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#333B38] sm:px-8 sm:py-3 sm:text-lg"
            >
              Cek Tiket &gt;
            </button>
          </div>
        ) : // Prioritas 2: Kalo ada barang di keranjang dan toko BUKA
        totalItem > 0 && !isStoreClosed ? (
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="group flex items-center gap-3 transition-transform active:scale-95"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCEFDA] text-lg sm:h-12 sm:w-12 group-hover:bg-[#f3dbb3]">
                🛒
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#B23A2E] text-[11px] font-bold text-white">
                  {totalItem}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-[#8A8375] sm:text-sm">
                  Cek Pesanan &gt;
                </p>
                <h2 className="font-mono text-lg font-bold text-[#1C2321] sm:text-2xl">
                  Rp {totalHarga.toLocaleString("id-ID")}
                </h2>
              </div>
            </button>
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="shrink-0 rounded-xl bg-[#147356] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F5C44] sm:px-8 sm:py-3 sm:text-lg"
            >
              Lanjut Bayar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
