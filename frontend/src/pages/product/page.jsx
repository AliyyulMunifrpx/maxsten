import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Store } from "lucide-react";
import ProductCard from "../../components/product/product-card.jsx";
import {
  useAllProducts,
  useDeleteProduct,
  useUpdateProductAvailability,
  fetchProductsPage, // PERUBAHAN
} from "../../hooks/product.js";
import ProductDetailModal from "../../components/product/product-detail-modal.jsx";
import ProductCreateModal from "../../components/product/product-form-modal.jsx";
import EmptyStoreState from "../empty-state/no-store.jsx";
import ProductPageLoading from "../loading-state/product-page-loading.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { RevealButton } from "../../components/reveal-button.jsx";
import toast from "react-hot-toast";
import { useDocumentTitle } from "../../hooks/use-document-title.js";
import EmptyProductsState from "../empty-state/no-product.jsx";

const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};
const HIGHLIGHT_DURATION_MS = 3200;

export default function ProductPage() {
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const cardRefs = useRef({});
  const [page, setPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    publicId, // PERUBAHAN: dibutuhin buat manggil fetchProductsPage manual
  } = useAllProducts(page);
  const onToggleAvailability = useUpdateProductAvailability();
  const products = data?.data?.currentPage || [];
  const pagination = data?.data?.pagination;
  const deleteProduct = useDeleteProduct();
  const [deleteError, setDeleteError] = useState("");
  const [highlightId, setHighlightId] = useState(
    location.state?.highlightId ?? null,
  );
  const [isLocatingHighlight, setIsLocatingHighlight] = useState(false); // PERUBAHAN
  useDocumentTitle("Kelola Produk");
  useEffect(() => {
    if (!location.state?.highlightId) return;
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state?.highlightId, location.pathname, navigate]);

  useEffect(() => {
    if (!highlightId) return;
    const timeout = setTimeout(
      () => setHighlightId(null),
      HIGHLIGHT_DURATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [highlightId]);

  // PERUBAHAN: cari halaman yang bener kalau highlightId belum ada di page saat ini
  useEffect(() => {
    if (!highlightId) return;
    if (isLoading) return;
    if (!publicId) return; // tunggu publicId siap dulu

    const alreadyOnPage = products.some((p) => p.id === highlightId);
    if (alreadyOnPage) return;

    let cancelled = false;

    async function locateHighlight() {
      setIsLocatingHighlight(true);
      try {
        let currentPage = 1;
        const totalPages = pagination?.totalPages ?? 1;

        while (currentPage <= totalPages) {
          const res = await fetchProductsPage(publicId, currentPage);
          const items = res?.data?.currentPage || [];

          if (items.some((p) => p.id === highlightId)) {
            if (!cancelled) setPage(currentPage);
            break;
          }
          currentPage++;
        }
      } finally {
        if (!cancelled) setIsLocatingHighlight(false);
      }
    }

    locateHighlight();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, publicId]);

  useEffect(() => {
    if (!highlightId || isLocatingHighlight) return;
    const el = cardRefs.current[highlightId];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, data, isLocatingHighlight]);

  if (isLoading) {
    return <ProductPageLoading></ProductPageLoading>;
  }

  if (isError && error.message === "Toko tidak ditemukan") {
    return <EmptyStoreState />;
  }

  if (products.length === 0) {
    return <EmptyProductsState></EmptyProductsState>;
  }
  function handleDelete(productId) {
    setDeleteError("");
    deleteProduct.mutate(productId, {
      onSuccess: () => setSelectedProductId(null),
      onError: (err) => {
        toast.error(err?.message || "gagal menghapus produk");
      },
    });
  }
  return (
    <div className="bg-[#1e1e1e] min-h-full w-full p-[16px] flex flex-col gap-[16px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
        <div>
          <p className="text-[20px] font-bold text-white">Produk</p>
          <p className="text-[13px] text-white/50">
            Kelola semua produk yang toko anda miliki.
          </p>
        </div>

        <RevealButton
          type="button"
          onClick={() => setCreating(true)}
          label="Tambah Produk"
          icon={Plus}
          bgBefore="bg-[#C0FE04]"
          textBefore="text-[#1e1e1e]"
          bgAfter="bg-white"
          textAfter="text-[#1e1e1e]"
          className="w-full sm:w-auto rounded-none"
        />
      </div>
      <div className="h-[1px] w-full bg-white/10"></div>

      {isLocatingHighlight && (
        <p className="text-[12px] text-white/40">Mencari produk...</p>
      )}

      <motion.div
        key={page}
        variants={gridVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[16px]"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onOpenDetail={setSelectedProductId}
            isHighlighted={highlightId === product.id}
            onToggleAvailability={(id, next) =>
              onToggleAvailability.mutate({ productId: id, is_available: next })
            }
          />
        ))}
      </motion.div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-[12px] mt-[8px]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center justify-center h-[32px] w-[32px] rounded-md bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>

          <p className="text-[13px] text-white/50">
            Halaman {pagination.currentPage} dari {pagination.totalPages}
            {isFetching && <span className="text-white/30"> · memuat...</span>}
          </p>

          <button
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages}
            className="flex items-center justify-center h-[32px] w-[32px] rounded-md bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      <ProductDetailModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onDelete={handleDelete}
        onToggleAvailability={(id, next) =>
          onToggleAvailability.mutate({ productId: id, is_available: next })
        }
      />
      <ProductCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => setCreating(false)}
      />
    </div>
  );
}
