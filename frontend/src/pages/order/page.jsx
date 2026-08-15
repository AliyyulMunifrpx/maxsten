// src/pages/orders/orders-page.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquareOff,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  useStoreQueues,
  useUpdateQueueStatus,
  fetchQueuesPage,
} from "../../hooks/order.js";
import { useSocket } from "../../hooks/socket.js";
import QueueCard from "../../components/orders/queue-card.jsx";
import CancelQueueModal from "../../components/orders/cancel-queue-modal.jsx";
import EmptyStoreState from "../empty-state/no-store.jsx";
import QueuePageLoading from "../loading-state/order-page-loading.jsx";
import EmptyOrdersState from "../empty-state/no-order.jsx";
import toast from "react-hot-toast";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

const HIGHLIGHT_DURATION_MS = 3200;

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardData = queryClient.getQueryData(["dashboard"]);
  const storeId = dashboardData?.data?.store?.public_id;
  const serverTime = dashboardData?.data?.server_time;

  const [page, setPage] = useState(1);
  const [pinnedId, setPinnedId] = useState(null);
  const { data, isLoading, isError, error, isFetching, publicId } =
    useStoreQueues(page);

  const updateStatus = useUpdateQueueStatus();

  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionError, setActionError] = useState("");

  const [highlightId, setHighlightId] = useState(
    location.state?.highlightId ?? null,
  );
  const cardRefs = useRef({});
  const [isLocatingHighlight, setIsLocatingHighlight] = useState(false);

  // PERUBAHAN: pindah ke atas, sebelum early return apapun, biar urutan hooks konsisten
  const queues = data?.data?.currentPage || [];
  const pagination = data?.data?.pagination;
  const isOpen = data?.data?.storeStatus?.is_open;
  useDocumentTitle("Kelola Pesanan");
  const orderedQueues = useMemo(() => {
    if (!pinnedId) return queues;
    const idx = queues.findIndex((q) => q.id === pinnedId);
    if (idx <= 0) return queues;
    const copy = [...queues];
    const [pinned] = copy.splice(idx, 1);
    return [pinned, ...copy];
  }, [queues, pinnedId]);

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

  useEffect(() => {
    if (!highlightId) return;
    if (isLoading) return;
    if (!publicId) return;

    const alreadyOnPage = queues.some((q) => q.id === highlightId);
    if (alreadyOnPage) return;

    let cancelled = false;

    async function locateHighlight() {
      setIsLocatingHighlight(true);
      try {
        let currentPage = 1;
        const totalPages = pagination?.totalPages ?? 1;

        while (currentPage <= totalPages) {
          const res = await fetchQueuesPage(publicId, currentPage);
          const items = res?.data?.currentPage || [];

          if (items.some((q) => q.id === highlightId)) {
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

  useEffect(() => {
    setPinnedId(null);
  }, [page]);

  // Early return SETELAH semua hooks di atas kepanggil
  if (isLoading) {
    return <QueuePageLoading></QueuePageLoading>;
  }
  console.log(error);
  if (isError && error.message === "Toko tidak ditemukan") {
    return <EmptyStoreState />;
  }

  function handleAdvance(queue) {
    const nextStatus = queue.status === "BELUM_BAYAR" ? "DIPROSES" : "SELESAI";
    setActionError("");
    updateStatus.mutate(
      { queueId: queue.id, storeId, status: nextStatus },
      {
        onError: (err) => toast.error(err?.message),
      },
    );
  }

  function handleCancelConfirm(reason) {
    setActionError("");
    updateStatus.mutate(
      { queueId: cancelTarget.id, storeId, status: "DIBATALKAN", reason },
      {
        onSuccess: () => setCancelTarget(null),
        onError: (err) =>
          toast.error(err?.message || "Gagal membatalkan antrean."),
      },
    );
  }

  if (!isLoading && !isError && queues.length === 0) {
    return <EmptyOrdersState></EmptyOrdersState>;
  }

  return (
    <div className="bg-[#1e1e1e] min-h-full w-full p-[16px] flex flex-col gap-[16px]">
      <div className="flex items-center justify-between flex-wrap gap-[8px]">
        <div>
          <p className="text-[20px] font-bold text-white">Antrean</p>
          <p className="text-[13px] text-white/50">
            {isOpen ? "Toko sedang buka" : "Toko sedang tutup"} · antrean tetap
            tampil walau toko tutup.
          </p>
        </div>
        <RevealButton
          path="/cancel-reasons"
          label="Kelola Alasan Batal"
          icon={MessageSquareOff}
          className="rounded-none"
        />
      </div>
      <div className="h-[1px] w-full bg-white/10"></div>

      {isLocatingHighlight && (
        <p className="text-[12px] text-white/40">Mencari antrean...</p>
      )}

      {queues.length > 1 && (
        <div className="flex flex-col gap-[4px]">
          <p className="text-[11px] text-white/40">Lompat ke antrean:</p>
          <div className="flex gap-[6px] overflow-x-auto pb-[4px]">
            {queues.map((q) => (
              <button
                key={q.id}
                onClick={() => setPinnedId(pinnedId === q.id ? null : q.id)}
                className={`shrink-0 h-[32px] min-w-[32px] px-[8px] flex items-center justify-center text-[12px] font-bold transition-colors ${
                  pinnedId === q.id
                    ? "bg-[#C0FE04] text-[#1e1e1e]"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {String(q.queue_number ?? 0).padStart(3, "0")}
              </button>
            ))}
          </div>
        </div>
      )}

      {orderedQueues.length > 0 && (
        <div className="grid md:grid-cols-2 sm:grid-cols-1 lg:grid-cols-4 gap-[16px]">
          <AnimatePresence>
            {orderedQueues.map((queue) => (
              <div
                key={queue.id}
                ref={(el) => {
                  cardRefs.current[queue.id] = el;
                }}
              >
                <QueueCard
                  queue={queue}
                  serverTime={serverTime}
                  isPinned={pinnedId === queue.id}
                  isHighlighted={highlightId === queue.id}
                  onAdvance={() => handleAdvance(queue)}
                  onCancel={() => setCancelTarget(queue)}
                  isMutating={updateStatus.isPending}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-[12px] mt-[8px]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center justify-center h-[32px] w-[32px] bg-white/10 text-white disabled:opacity-30 hover:bg-white/20"
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
            className="flex items-center justify-center h-[32px] w-[32px] bg-white/10 text-white disabled:opacity-30 hover:bg-white/20"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <CancelQueueModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        isPending={updateStatus.isPending}
      />
    </div>
  );
}
