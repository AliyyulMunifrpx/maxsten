import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import QueueCard from "../components/seller/queue-card.jsx";
import { useEffect, useState, useMemo } from "react";
import { socket } from "../../lib/socket/socket.js";
import CetakQR from "./qrCode.jsx";
import { getAllQueue, openCloseStore } from "../../lib/sellerApi.js";
import ProductCard from "../components/seller/product-card.jsx";
import { getDashboard } from "../../lib/dashboardApi.js";

const displayFont = { fontFamily: "'Fraunces', Georgia, serif" };

function TearLine() {
  return (
    <div
      className="my-5 h-px w-full"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, #D8D3C4 0 10px, transparent 10px 18px)",
      }}
      aria-hidden="true"
    />
  );
}

function StatusPill({ isOpen }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        isOpen ? "bg-[#E7F3EC] text-[#147356]" : "bg-[#FBEAE7] text-[#B23A2E]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-[#147356]" : "bg-[#B23A2E]"}`}
      />
      {isOpen ? "Buka" : "Tutup"}
    </span>
  );
}

function StatMetric({ label, value }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 px-5 py-3.5 first:pl-6 last:pr-6">
      <span className="font-mono text-xl font-bold leading-none text-[#1C2321]">
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-[#8A8375]">
        {label}
      </span>
    </div>
  );
}

const TABS = [
  { key: "queues", label: "Antrean" },
  { key: "products", label: "Produk" },
  { key: "addons", label: "Addon" },
  { key: "qr", label: "QR Meja" },
];

export default function DashboardSeller() {
  const queryClient = useQueryClient();
  const backendUrl = import.meta.env.VITE_API_PATH.replace("/api", "");

  const [pinnedQueueId, setPinnedQueueId] = useState(null);
  const [activeTab, setActiveTab] = useState("queues");

  const {
    data: dashboardData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboardStoreMe"],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  });

  const {
    data: queues,
    isLoading: isQueuesLoading,
    isError: isQueuesError,
    error: queuesError,
  } = useQuery({
    queryKey: ["queues", dashboardData?.public_id],
    queryFn: () => getAllQueue(dashboardData?.public_id),
    enabled: !!dashboardData?.public_id,
  });

  const products = dashboardData?.products || [];
  const addonGroups = dashboardData?.addon_groups || [];

  // ================= SOCKET.IO =================
  useEffect(() => {
    if (!socket || !dashboardData?.public_id) return;

    const bellSound = new Audio("/sounds/bell.mp3");
    bellSound.load();

    socket.emit("JOIN_STORE_ROOM", dashboardData.public_id);

    const handleNewQueue = (dataPesananBaru) => {
      queryClient.setQueryData(
        ["queues", dashboardData.public_id],
        (oldData) => {
          if (!oldData) return [dataPesananBaru];
          return [...oldData, dataPesananBaru];
        },
      );

      try {
        bellSound.currentTime = 0;
        const playPromise = bellSound.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) =>
            console.warn("Autoplay ditahan browser.", err),
          );
        }
      } catch (error) {
        console.error("Gagal memutar suara:", error);
      }

      toast.success(
        `🎉 PESANAN BARU: Antrean #${dataPesananBaru.queue_number}`,
      );
    };

    const handleQueueEdited = (updatedQueueData) => {
      if (updatedQueueData.status === "DIBATALKAN") {
        toast.error(
          `Antrean #${updatedQueueData.queue_number} dibatalkan oleh pembeli.`,
        );
        queryClient.setQueryData(
          ["queues", dashboardData.public_id],
          (oldData) => {
            return oldData
              ? oldData.filter((q) => q.id !== updatedQueueData.id)
              : [];
          },
        );
        queryClient.invalidateQueries({
          queryKey: ["queues", dashboardData.public_id],
        });

        queryClient.invalidateQueries({ queryKey: ["dashboardStoreMe"] });
        return;
      }

      queryClient.setQueryData(
        ["queues", dashboardData.public_id],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((q) =>
            q.id === updatedQueueData.id ? updatedQueueData : q,
          );
        },
      );
    };

    const handleQueueUpdated = (updatedQueueData) => {
      if (
        updatedQueueData.status === "SELESAI" ||
        updatedQueueData.status === "DIBATALKAN"
      ) {
        // Otomatis refresh omzet saat ada yang selesai/batal
        queryClient.invalidateQueries({ queryKey: ["dashboardStoreMe"] });

        queryClient.setQueryData(
          ["queues", dashboardData.public_id],
          (oldData) => {
            return oldData
              ? oldData.filter((q) => q.id !== updatedQueueData.id)
              : [];
          },
        );
        queryClient.invalidateQueries({
          queryKey: ["queues", dashboardData.public_id],
        });
        return;
      }

      queryClient.setQueryData(
        ["queues", dashboardData.public_id],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((q) =>
            q.id === updatedQueueData.id ? updatedQueueData : q,
          );
        },
      );
    };

    socket.on("NEW_QUEUE", handleNewQueue);
    socket.on("STATUS_EDITED", handleQueueEdited);
    socket.on("STATUS_UPDATED", handleQueueUpdated);

    return () => {
      socket.off("NEW_QUEUE", handleNewQueue);
      socket.off("STATUS_EDITED", handleQueueEdited);
      socket.off("STATUS_UPDATED", handleQueueUpdated);
    };
  }, [queryClient, dashboardData?.public_id]);

  const { mutate: mutateStoreStatus, isPending } = useMutation({
    mutationFn: openCloseStore,
    onSuccess: () => {
      toast.success("Status toko berhasil diubah");
      queryClient.invalidateQueries({ queryKey: ["dashboardStoreMe"] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.errors || "Gagal mengubah status toko.",
      );
    },
  });

  const displayQueues = useMemo(() => {
    if (!queues) return [];
    if (!pinnedQueueId) return queues;

    const pinned = queues.find((q) => q.id === pinnedQueueId);
    const others = queues.filter((q) => q.id !== pinnedQueueId);

    if (!pinned) return queues;
    return [pinned, ...others];
  }, [queues, pinnedQueueId]);

  useEffect(() => {
    if (queues && pinnedQueueId) {
      const stillExists = queues.some((q) => q.id === pinnedQueueId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!stillExists) setPinnedQueueId(null);
    }
  }, [queues, pinnedQueueId]);

  // ================= RENDER =================
  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E1D8] border-t-[#C98A1F]" />
      </div>
    );

  if (isError)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] p-6">
        <div className="w-full max-w-md rounded-2xl border border-dashed border-[#D8D3C4] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5EDD9] text-3xl">
            🏪
          </div>
          <h1
            style={displayFont}
            className="text-xl font-semibold text-[#1C2321] sm:text-2xl"
          >
            Belum Ada Toko
          </h1>
          <p className="mt-2 text-sm text-[#8A8375]">
            Kamu belum punya toko terdaftar. Buat toko dulu buat mulai jualan
            dan kelola antrean, produk, sampai addon dari sini.
          </p>
          <Link
            to="/seller/create-store"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#1C2321] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#333B38] sm:w-auto sm:px-8"
          >
            + Buat Toko
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        {/* ================= HEADER TOKO ================= */}
        <header className="mb-6 overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              {dashboardData.logo_url ? (
                <img
                  src={`${backendUrl}${dashboardData.logo_url}`}
                  alt="Logo Toko"
                  className="h-16 w-16 rounded-full border border-[#E4E1D8] object-cover sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5EDD9] text-3xl sm:h-20 sm:w-20">
                  🏪
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#C98A1F]">
                    Dashboard Penjual
                  </p>
                  <StatusPill isOpen={dashboardData.is_open} />
                </div>

                <h1
                  style={displayFont}
                  className="mt-1 text-2xl font-semibold text-[#1C2321] sm:text-3xl"
                >
                  {dashboardData.name}
                </h1>

                {dashboardData.description && (
                  <p className="mt-1 line-clamp-2 max-w-md text-sm text-[#545A58]">
                    {dashboardData.description}
                  </p>
                )}
                {dashboardData.address && (
                  <p className="mt-1 text-xs text-[#8A8375]">
                    📍 {dashboardData.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 mt-4 sm:mt-0">
              <Link
                to="edit-store"
                className="rounded-lg border border-[#E4E1D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C2321] transition hover:border-[#C98A1F]"
              >
                Edit Toko
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  mutateStoreStatus(dashboardData.public_id);
                }}
                disabled={isPending}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  dashboardData.is_open
                    ? "bg-[#B23A2E] hover:bg-[#9B3126]"
                    : "bg-[#147356] hover:bg-[#0F5C44]"
                }`}
              >
                {isPending
                  ? "Memproses…"
                  : dashboardData.is_open
                    ? "Tutup Toko"
                    : "Buka Toko"}
              </button>
            </div>
          </div>

          <div className="flex divide-x divide-[#E4E1D8] border-t border-[#E4E1D8] bg-[#FCFBF9]">
            <StatMetric
              label="Total Produk"
              value={dashboardData.total_products || 0}
            />
            <StatMetric label="Antrean Aktif" value={queues?.length ?? 0} />
            <StatMetric
              label="Grup Addon"
              value={dashboardData.total_addon_groups || 0}
            />
          </div>
        </header>

        {/* ================= PANEL RINGKASAN PENJUALAN HARI INI ================= */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm">
            <div className="absolute right-0 top-0 h-full w-1.5 bg-[#147356]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#8A8375]">
              Omzet Hari Ini
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-[#147356] sm:text-3xl">
              Rp{" "}
              {(dashboardData.sales_today?.omzet || 0).toLocaleString("id-ID")}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm">
            <div className="absolute right-0 top-0 h-full w-1.5 bg-[#C98A1F]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#8A8375]">
              Pesanan Selesai
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-bold text-[#1C2321] sm:text-3xl">
                {dashboardData.sales_today?.pesanan_selesai || 0}
              </p>
              <span className="text-sm font-semibold text-[#8A8375]">
                transaksi
              </span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm">
            <div className="absolute right-0 top-0 h-full w-1.5 bg-[#B23A2E]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#8A8375]">
              Pesanan Batal
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-bold text-[#B23A2E] sm:text-3xl">
                {dashboardData.sales_today?.pesanan_batal || 0}
              </p>
              <span className="text-sm font-semibold text-[#8A8375]">
                transaksi
              </span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="mb-6 inline-flex w-full gap-1 overflow-x-auto rounded-xl border border-[#E4E1D8] bg-white p-1 shadow-sm sm:w-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === "queues" ? queues?.length : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#1C2321] text-white shadow"
                    : "text-[#8A8375] hover:text-[#1C2321]"
                }`}
              >
                {tab.label}
                {!!count && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#F1EFE9] text-[#8A8375]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB: ANTREAN */}
        {activeTab === "queues" && (
          <section>
            {queues && queues.length > 0 && (
              <div className="mb-4 rounded-2xl border border-[#E4E1D8] bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8375]">
                  Navigasi Cepat
                </h2>
                <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                  {pinnedQueueId && (
                    <button
                      onClick={() => setPinnedQueueId(null)}
                      className="shrink-0 rounded-full border border-[#E4E1D8] bg-white px-3 py-1.5 text-xs font-semibold text-[#8A8375] hover:bg-gray-50"
                    >
                      &times; Reset Urutan
                    </button>
                  )}
                  {queues.map((q) => {
                    const isPinned = pinnedQueueId === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setPinnedQueueId(isPinned ? null : q.id);
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
                        className={`shrink-0 rounded-full px-4 py-1.5 font-mono text-sm font-bold shadow-sm transition-all ${
                          isPinned
                            ? "scale-105 bg-[#C98A1F] text-white ring-2 ring-[#C98A1F] ring-offset-2"
                            : "border border-[#E4E1D8] bg-[#FAF9F6] text-[#1C2321] hover:border-[#C98A1F] hover:bg-white"
                        }`}
                      >
                        #{q.queue_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <h2
                  style={displayFont}
                  className="text-lg font-semibold text-[#1C2321]"
                >
                  Antrean Aktif
                </h2>
                <span className="font-mono text-sm text-[#8A8375]">
                  {queues?.length > 0 ? queues.length : 0} tiket
                </span>
              </div>
              <TearLine />

              {isQueuesLoading ? (
                <p className="text-sm text-[#8A8375]">Memuat antrean…</p>
              ) : isQueuesError ? (
                <div className="rounded-xl border border-[#F1CFC7] bg-[#FBEAE7] p-4">
                  <p className="text-sm font-medium text-[#B23A2E]">
                    {queuesError?.response?.data?.errors ||
                      queuesError?.message ||
                      "Gagal memuat antrean."}
                  </p>
                </div>
              ) : !queues || queues.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D8D3C4] bg-white/60 p-8 text-center">
                  <p className="text-[#8A8375]">Belum ada antrean aktif.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {displayQueues.map((queue) => (
                    <QueueCard
                      key={queue.id}
                      queue={queue}
                      storeId={dashboardData.public_id}
                      isPinned={pinnedQueueId === queue.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB: PRODUK */}
        {activeTab === "products" && (
          <section className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2
                style={displayFont}
                className="text-lg font-semibold text-[#1C2321]"
              >
                Daftar Produk
              </h2>
              <div className="flex gap-3 text-sm">
                <Link
                  to={`/seller/all-products/${dashboardData.public_id}`}
                  className="flex items-center text-[#C98A1F] hover:underline"
                >
                  Semua Produk
                </Link>
                <Link
                  to="/seller/create-product"
                  className="rounded-lg bg-[#1C2321] px-4 py-2 font-semibold text-white transition hover:bg-[#333B38]"
                >
                  + Tambah
                </Link>
              </div>
            </div>
            <p className="mb-5 text-sm text-[#8A8375]">
              Menampilkan {products.length} produk terakhir dari total{" "}
              {dashboardData.total_products}.
            </p>
            <TearLine />

            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D8D3C4] bg-white/60 p-8 text-center">
                <p className="text-[#8A8375]">Belum ada produk.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    backendUrl={backendUrl}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB: ADDON */}
        {activeTab === "addons" && (
          <section className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2
                style={displayFont}
                className="text-lg font-semibold text-[#1C2321]"
              >
                Grup Addon
              </h2>
              <div className="flex gap-3 text-sm">
                <Link
                  to={`/seller/all-addons/${dashboardData.public_id}`}
                  className="flex items-center text-[#C98A1F] hover:underline"
                >
                  Semua Addon
                </Link>
                <Link
                  to="/seller/create-addon"
                  className="rounded-lg bg-[#1C2321] px-4 py-2 font-semibold text-white transition hover:bg-[#333B38]"
                >
                  + Tambah
                </Link>
              </div>
            </div>
            <p className="mb-5 text-sm text-[#8A8375]">
              Menampilkan {addonGroups.length} grup terakhir dari total{" "}
              {dashboardData.total_addon_groups}.
            </p>
            <TearLine />

            {!addonGroups || addonGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D8D3C4] bg-white/60 p-8 text-center">
                <p className="text-[#8A8375]">Belum ada grup addon.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {addonGroups.map((group) => (
                  <div
                    key={group.id}
                    className="overflow-hidden rounded-xl border border-[#E4E1D8]"
                  >
                    <div className="flex items-center justify-between border-b border-[#E4E1D8] bg-[#FCFBF9] px-4 py-3">
                      <h3 className="font-semibold text-[#1C2321]">
                        {group.name}
                      </h3>
                      <span className="rounded-full bg-[#F1EFE9] px-2 py-0.5 text-[11px] font-semibold text-[#8A8375]">
                        {group.addons?.length || 0} pilihan
                      </span>
                    </div>
                    <ul className="divide-y divide-[#E4E1D8]">
                      {group.addons && group.addons.length > 0 ? (
                        group.addons.map((addon) => (
                          <li
                            key={addon.id}
                            className="flex items-center justify-between px-4 py-2.5 text-sm"
                          >
                            <span className="text-[#1C2321]">{addon.name}</span>
                            <span className="font-mono font-semibold text-[#147356]">
                              +Rp {addon.price.toLocaleString("id-ID")}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="px-4 py-3 text-sm text-[#8A8375]">
                          Belum ada pilihan addon.
                        </li>
                      )}
                    </ul>
                    <Link
                      to={`/seller/edit-addon-group/${group.id}`}
                      className="block border-t border-[#E4E1D8] px-4 py-2.5 text-center text-xs font-semibold text-[#8A8375] transition hover:bg-[#FAF9F6] hover:text-[#1C2321]"
                    >
                      Edit Grup Addon
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB: QR MEJA */}
        {activeTab === "qr" && (
          <section className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6">
            <h2
              style={displayFont}
              className="mb-1 text-lg font-semibold text-[#1C2321]"
            >
              QR Code Meja
            </h2>
            <p className="mb-5 text-sm text-[#8A8375]">
              Cetak dan tempel di meja biar pembeli bisa langsung scan buat
              pesan.
            </p>
            <TearLine />
            <CetakQR
              storeId={dashboardData.public_id}
              storeName={dashboardData.name}
            />
          </section>
        )}
      </div>
    </div>
  );
}
