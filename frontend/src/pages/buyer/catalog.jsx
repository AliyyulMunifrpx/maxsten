import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  MapPin,
  Store as StoreIcon,
  PackageX,
  ShoppingCart,
  Ticket,
  Loader2,
  ChevronDown, // ✅ IMPORT BARU
} from "lucide-react";
import { useStoreCatalog, useQueueDetail } from "../../hooks/buyer.js";
import { useCart } from "../../context/cart-context.jsx";
import ProductCard from "../../components/buyer/product-card.jsx";
import { getLastOrderId } from "../../lib/order-history.js";
import CheckoutModal from "./../../components/buyer/checkout-modal";
import ProductDetailModal from "../../components/buyer/product-detail-modal.jsx";
import OrderDetailModal from "../../components/buyer/order-detail-modal.jsx";
import CatalogPageLoading from "../loading-state/catalog-page-loading.jsx";
import { RevealButton } from "../../components/reveal-button.jsx";
import { getGuestId } from "../../lib/guest-axios.js";
import { useSocket } from "../../hooks/socket.js";
import { useQueryClient } from "@tanstack/react-query";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

function Perforation({ className = "" }) {
  return <div className={`h-[1px] w-full bg-white/10 ${className}`} />;
}

export default function StoreCatalogPage() {
  const { storeId } = useParams();
  const [page, setPage] = useState(1);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  // ✅ STATE BARU: Untuk kontrol expand/collapse deskripsi toko di mobile
  const [isExpanded, setIsExpanded] = useState(false);

  const [activeQueueId, setActiveQueueId] = useState(() => {
    return getLastOrderId(storeId) || null;
  });

  const [sampleNames, setSampleNames] = useState([]);
  const [placeholderText, setPlaceholderText] = useState("Cari produk...");

  const { data: activeQueueRes } = useQueueDetail(storeId, activeQueueId);
  const { totalItems } = useCart();

  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const { data, isLoading, isError, error, isFetching } = useStoreCatalog(
    storeId,
    { page, keyword },
  );

  const store = data?.data?.store;
  const products = data?.data?.currentPage || [];

  useDocumentTitle(store?.name ? `Katalog ${store.name}` : "Katalog Toko");

  const fullAddress = store
    ? [store.street_address, store.district, store.city, store.province]
        .filter(Boolean)
        .join(", ")
    : "";

  useEffect(() => {
    if (activeQueueRes?.data) {
      const status = activeQueueRes.data.status;
      if (status === "SELESAI" || status === "DIBATALKAN") {
        setActiveQueueId(null);
        localStorage.removeItem(`last_order_${storeId}`);
      }
    }
  }, [activeQueueRes, storeId]);

  useEffect(() => {
    if (!socket || !activeQueueId) return;

    console.log("📡 [GLOBAL] Mengirim JOIN_QUEUE_ROOM...");
    socket.emit("JOIN_QUEUE_ROOM", activeQueueId);

    socket.on("ROOM_ERROR", (err) => {
      console.error("❌ Gagal join queue room:", err);
    });

    function handleStatusUpdated(payload) {
      queryClient.invalidateQueries({
        queryKey: ["buyer-queue-detail", storeId, activeQueueId],
      });

      const statusMap = {
        DIPROSES: {
          title: "Pesanan sedang diproses",
          message: "Pesanan kamu sedang dikerjakan oleh penjual.",
        },
        SELESAI: {
          title: "Pesanan selesai",
          message: "Pesanan kamu telah selesai. Terima kasih sudah memesan!",
        },
      };

      if (payload.status === "DIBATALKAN") {
        const triggeredByMap = {
          system: "sistem",
          seller: "penjual",
          buyer: "kamu",
        };

        const reasonMap = {
          "queue is expired": "waktu pembayaran telah habis",
          "cancelled by seller": "dibatalkan oleh penjual",
          "cancelled by buyer": "dibatalkan oleh kamu",
        };

        const triggeredBy =
          triggeredByMap[payload.triggered_by] || payload.triggered_by;
        const reason = reasonMap[payload.reason] || payload.reason;

        toast((t) => (
          <div className="flex flex-col gap-2">
            <div>
              <p className="font-semibold">Pesanan telah dibatalkan</p>
              <p className="text-sm text-muted-foreground">
                Oleh {triggeredBy}. Alasan: {reason}
              </p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="self-end rounded-md bg-black px-3 py-1.5 text-sm text-white"
            >
              Baiklah
            </button>
          </div>
        ));

        return;
      }

      const status = statusMap[payload.status];

      if (status) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <div>
              <p className="font-semibold">{status.title}</p>
              <p className="text-sm text-muted-foreground">{status.message}</p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="self-end rounded-md bg-black px-3 py-1.5 text-sm text-white"
            >
              Baiklah
            </button>
          </div>
        ));
      }
    }

    socket.on("STATUS_UPDATED", handleStatusUpdated);

    return () => {
      socket.off("STATUS_UPDATED", handleStatusUpdated);
    };
  }, [socket, queryClient, storeId, activeQueueId]);

  useEffect(() => {
    if (products.length > 0 && sampleNames.length === 0 && !keywordInput) {
      setSampleNames(products.slice(0, 5).map((p) => p.name));
    }
  }, [products, keywordInput, sampleNames.length]);

  useEffect(() => {
    if (sampleNames.length === 0) {
      setPlaceholderText("Cari produk...");
      return;
    }

    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;

    const type = () => {
      const currentWord = sampleNames[wordIndex];
      if (isDeleting) charIndex--;
      else charIndex++;

      setPlaceholderText(`Contoh: '${currentWord.substring(0, charIndex)}'`);

      let delay = isDeleting ? 40 : 100;
      if (!isDeleting && charIndex === currentWord.length) {
        delay = 2500;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % sampleNames.length;
        delay = 500;
      }
      timeoutId = setTimeout(type, delay);
    };

    timeoutId = setTimeout(type, 1000);
    return () => clearTimeout(timeoutId);
  }, [sampleNames]);

  if (isLoading && !store) {
    return <CatalogPageLoading />;
  }

  if (isError && error?.message === "Toko tidak ditemukan") {
    return (
      <div className="bg-[#1e1e1e] min-h-screen w-full flex items-center justify-center p-[16px]">
        <div className="flex flex-col items-center justify-center p-[40px] text-center border border-dashed border-white/10 w-full max-w-md">
          <StoreIcon size={48} className="text-white/20 mb-[16px]" />
          <h3 className="text-white font-bold text-[18px] mb-[8px]">
            Toko Tidak Ditemukan
          </h3>
          <p className="text-white/50 text-[14px]">
            Toko yang kamu cari mungkin sudah dihapus atau link-nya tidak valid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e1e] min-h-screen w-full">
      {store && (
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-[80px] left-[20px] h-[220px] w-[220px] rounded-full bg-[#C0FE04]/10 blur-[80px]" />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative p-[20px] sm:p-[28px] pb-[24px] flex items-start gap-[16px]"
          >
            <div className="relative h-[76px] w-[76px] sm:h-[88px] sm:w-[88px] shrink-0">
              <div className="h-full w-full overflow-hidden bg-white/[0.06] border border-white/10">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <StoreIcon className="text-white/30" size={28} />
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-[8px]">
              <div className="flex items-center gap-[16px] flex-wrap">
                <h1 className="text-[24px] font-bold text-white truncate leading-tight">
                  {store.name}
                </h1>
                <span
                  className={`flex items-center gap-[8px] text-[12px] font-bold px-[8px] rounded-full border ${
                    store.is_open
                      ? "border-green-400/30 bg-green-400/10 text-green-400"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}
                >
                  <span
                    className={`h-[6px] w-[6px] rounded-full ${
                      store.is_open
                        ? "bg-green-400 animate-pulse"
                        : "bg-red-500"
                    }`}
                  />
                  {store.is_open ? "Buka" : "Tutup"}
                </span>
              </div>

              {/* 👇 PERUBAHAN: Tampil di desktop, Sembunyi di mobile jika belum di-expand */}
              <div
                className={`flex-col gap-[8px] ${isExpanded ? "flex" : "hidden sm:flex"}`}
              >
                {store.description && (
                  <p className="text-[16px] text-white/60 line-clamp-2 leading-relaxed max-w-[520px]">
                    {store.description}
                  </p>
                )}

                {fullAddress && (
                  <a
                    href={
                      store.latitude && store.longitude
                        ? `https://www.google.com/maps?q=${store.latitude},${store.longitude}`
                        : undefined
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-start gap-[8px] group ${
                      store.latitude && store.longitude
                        ? "cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <MapPin
                      size={13}
                      className="text-white/40 group-hover:text-[#C0FE04] shrink-0 mt-[2px] transition-colors"
                    />
                    <p className="text-[12px] text-white/40 group-hover:text-white/60 line-clamp-2 leading-relaxed capitalize transition-colors">
                      {fullAddress}
                    </p>
                  </a>
                )}
              </div>

              {/* 👇 PERUBAHAN: Tombol Expand HANYA tampil di mobile (sm:hidden) jika deskripsi/alamat ada */}
              {(store.description || fullAddress) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex sm:hidden items-center gap-[4px] text-[12px] text-[#C0FE04] font-medium mt-[4px] w-fit opacity-80 hover:opacity-100 transition-opacity"
                >
                  {isExpanded ? "Sembunyikan Detail" : "Lihat Detail Toko"}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          </motion.div>
          <Perforation />
        </div>
      )}

      <div className="p-[16px] flex flex-col gap-[24px]">
        {/* ================= KOLOM PENCARIAN ================= */}
        <div className="relative lg:w-[60%] mx-auto w-full">
          <div className="absolute -top-[9px] left-[16px] px-[6px] bg-[#1e1e1e] text-[12px] font-bold tracking-[0.15em] text-white/30">
            Cari Menu
          </div>
          <Search
            size={16}
            className="absolute left-[14px] top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={placeholderText}
            className="w-full bg-white/[0.04] border border-white/15 text-white text-[16px] pl-[38px] py-[12px] focus:outline-none focus:border-[#C0FE04] focus:bg-[#C0FE04]/[0.04] rounded-none transition-colors"
          />
        </div>

        {/* ================= GRID PRODUK ================= */}
        {isFetching ? (
          <div className="flex flex-col items-center justify-center text-white/50 gap-[4px]">
            <Loader2 className="animate-spin" size={22} />
            <p className="text-[16px]">Mencari produk...</p>
          </div>
        ) : products.length > 0 ? (
          <motion.div
            key={`${page}-${keyword}`}
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[12px]"
          >
            {products.map((product) => (
              <motion.div
                key={product.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={`relative ${store && !store.is_open ? "opacity-60 grayscale-[30%]" : ""}`}
              >
                {store && !store.is_open && (
                  <div
                    className="absolute inset-0 z-50 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toast("Maaf, toko sudah tutup", { icon: "🔒" });
                    }}
                  />
                )}
                <ProductCard
                  product={product}
                  onOpenProduct={setSelectedProductId}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-[70px] text-center border border-dashed border-white/10">
            <PackageX size={40} className="text-white/20 mb-[16px]" />
            <h3 className="text-white font-bold text-[16px]">
              Produk tidak ditemukan
            </h3>
          </div>
        )}
      </div>

      {/* ================= FLOATING BAR ================= */}
      <AnimatePresence mode="wait">
        {activeQueueId ? (
          <motion.div
            key="queue-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="fixed bottom-[16px] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] lg:w-[40%]"
          >
            <div className="relative">
              <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 h-[16px] w-[16px] rounded-full bg-[#1e1e1e] z-10" />
              <RevealButton
                label="Lihat Antrean"
                onClick={() => setIsOrderDetailOpen(true)}
                bgBefore="bg-blue-500"
                textBefore="text-white"
                bgAfter="bg-white"
                textAfter="text-[#1e1e1e]"
                className="w-full shadow-lg rounded-none"
                icon={Ticket}
                animateIcon={{
                  animate: { scale: [1, 1.2, 1], rotate: [0, -10, 10, -10, 0] },
                  transition: {
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 3,
                  },
                }}
              />
            </div>
          </motion.div>
        ) : totalItems > 0 ? (
          <motion.div
            key="cart-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="fixed bottom-[16px] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] lg:w-[40%]"
          >
            <div className="relative">
              <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 h-[16px] w-[16px] rounded-full bg-[#1e1e1e] z-10" />
              <RevealButton
                label="Lihat Keranjang"
                onClick={() => setIsCheckoutOpen(true)}
                bgBefore="bg-[#C0FE04]"
                textBefore="text-[#1e1e1e]"
                bgAfter="bg-[#ffffff]"
                textAfter="text-[#1e1e1e]"
                className="w-full shadow-lg rounded-none"
                icon={ShoppingCart}
                badge={
                  <span className="absolute -top-[8px] -right-[10px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-600 px-[4px] text-[9px] font-bold text-white leading-none border border-[#1e1e1e]">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                }
                animateIcon={{
                  animate: {
                    y: [0, -6, -6, -6, 0],
                    rotate: [0, -15, 15, -15, 0],
                  },
                  transition: {
                    duration: 0.6,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 4,
                  },
                }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {activeQueueId && totalItems > 0 && (
          <motion.button
            key="floating-cart"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={() => setIsCheckoutOpen(true)}
            className="fixed bottom-[100px] lg:bottom-[16px] right-[16px] z-40 flex items-center justify-center h-[56px] w-[56px] rounded-full bg-[#C0FE04] text-[#1e1e1e] shadow-lg"
            aria-label="Lihat keranjang"
          >
            <ShoppingCart size={22} />
            <span className="absolute -top-[4px] -right-[4px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-red-600 px-[4px] text-[12px] font-bold text-white leading-none border-2 border-[#1e1e1e]">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <ProductDetailModal
        storeId={storeId}
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />

      <AnimatePresence>
        {isCheckoutOpen && (
          <CheckoutModal
            onClose={() => setIsCheckoutOpen(false)}
            onSuccess={(queue) => {
              setIsCheckoutOpen(false);
              setActiveQueueId(queue.id);

              if (socket) {
                const newGuestId = getGuestId();

                if (newGuestId && socket.auth?.guestId !== newGuestId) {
                  socket.disconnect();

                  setTimeout(() => {
                    socket.auth = {
                      ...socket.auth,
                      guestId: newGuestId,
                    };

                    socket.connect();
                    console.log(
                      "🔄 Socket Reconnected dengan guestId baru:",
                      newGuestId,
                    );
                  }, 300);
                }
              }
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOrderDetailOpen && activeQueueId && (
          <OrderDetailModal
            queueId={activeQueueId}
            onClose={() => setIsOrderDetailOpen(false)}
            onCanceled={() => {
              setIsOrderDetailOpen(false);
              setActiveQueueId(null);
              localStorage.removeItem(`last_order_${storeId}`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
