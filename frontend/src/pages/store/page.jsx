// src/pages/store/store-page.jsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Pencil,
  Store,
  Trash2,
  AlertTriangle,
  MapPin,
  Clock,
  ClipboardClock,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useStoreProfile,
  useUpdateStoreLogo,
  useDeleteStore,
} from "../../hooks/store.js";
import EditStoreModal from "../../components/store/edit-store-modal.jsx";
import StorePageLoading from "../loading-state/store-page-loading.jsx";
import { RevealButton } from "../../components/reveal-button.jsx";
import ImageCropperModal from "../../components/image-cropper-modal.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

const DAYS_LABEL = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

const cardTitleCls =
  "text-[16px] font-bold text-white flex items-center gap-[8px]";

export default function StorePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useStoreProfile();
  const store = data?.data;
  const updateLogo = useUpdateStoreLogo();
  const deleteStore = useDeleteStore();
  useDocumentTitle(`Kelola Toko ${store?.name}`);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fileInputRef = useRef(null);
  const [pendingImageSrc, setPendingImageSrc] = useState(null);

  // State Hapus Toko
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImageSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  function handleCropConfirm(blob) {
    updateLogo.mutate(blob, {
      onSuccess: () => {
        setPendingImageSrc(null);
        toast.success("Logo toko berhasil diunggah!");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleDelete() {
    deleteStore.mutate(undefined, {
      onSuccess: () => navigate("/store/create"),
      onError: (err) => {
        toast.error(err?.message || "Gagal menghapus toko.");
        setConfirmingDelete(false);
        setDeleteConfirmText("");
      },
    });
  }

  if (isError && error.message === "Toko tidak ditemukan") {
    return navigate("create");
  }

  if (isLoading || !store) {
    return <StorePageLoading />;
  }

  return (
    <div className="min-h-full bg-[#1e1e1e] p-[16px] sm:p-[16px]">
      <div className="mx-auto w-full flex flex-col gap-[16px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]"
        >
          <div>
            <h1 className="text-[24px] font-bold text-white">Detail Toko</h1>
            <p className="mt-[8px] text-[12px] text-white/50">
              Lihat detail profil dan kelola toko kamu.
            </p>
          </div>
          <RevealButton
            type="button"
            label="Edit Data Toko"
            onClick={() => setIsEditModalOpen(true)}
            bgBefore="bg-[#C0FE04]"
            bgAfter="bg-white"
            textBefore="text-[#1e1e1e]"
            className="rounded-none"
            icon={Pencil}
          ></RevealButton>
        </motion.div>

        <div className="h-[1px] w-full bg-white/10"></div>

        {/* Info & Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-[16px]"
        >
          {/* Logo Card */}
          <div className=" bg-white/5 border border-white/10 p-[16px] gap-[16px] flex flex-col items-center text-center">
            <div className="w-full flex flex-col gap-[8px]">
              <h2 className={`${cardTitleCls} self-start`}>
                <Store size={18} className="text-[#C0FE04]" /> Logo Toko
              </h2>
              <div className="w-full h-[1px] bg-white/10"></div>
            </div>
            <div className="flex h-full w-full flex-col items-center justify-center gap-[16px]">
              <div className="relative h-[120px] w-[120px] shrink-0">
                <div className="h-full w-full rounded-full overflow-hidden bg-white/10 border-2 border-white/20">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Store className="text-white/30" size={40} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateLogo.isPending}
                  className="absolute bottom-0 right-0 flex items-center justify-center h-[32px] w-[32px] rounded-full bg-[#C0FE04] border-2 border-[#1e1e1e] text-[#1e1e1e] hover:bg-white transition-colors disabled:opacity-50"
                >
                  <Pencil size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              {updateLogo.isPending && (
                <p className="text-[12px] text-white/50">Mengunggah...</p>
              )}
            </div>
          </div>

          {/* Profil Toko Card (Read Only) */}
          <div className="col-span-1 md:col-span-2 bg-white/5 border border-white/10 p-[16px] gap-[16px] flex flex-col">
            <div className="w-full flex flex-col gap-[8px]">
              <h2 className={`${cardTitleCls} self-start`}>
                <Store size={18} className="text-[#C0FE04]" /> Profil Toko
              </h2>
              <div className="w-full h-[1px] bg-white/10"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-[16px] gap-x-[16px]">
              <div>
                <p className="text-[12px] text-white/40 tracking-wider mb-[8px]">
                  Nama Toko
                </p>
                <p className="text-[12px] text-white">{store.name}</p>
              </div>
              <div>
                <p className="text-[12px] text-white/40 tracking-wider mb-[8px]">
                  Zona Waktu
                </p>
                <p className="text-[12px] text-white">{store.timezone}</p>
              </div>
              <div>
                <p className="text-[12px] text-white/40 tracking-wider mb-[8px]">
                  Batas Waktu Pembayaran
                </p>
                <p className="text-[12px] text-white">
                  {store.payment_timeout ?? 15} Menit
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[12px] text-white/40 tracking-wider mb-[8px]">
                  Deskripsi
                </p>
                <p className="text-[12px] text-white/80 leading-relaxed">
                  {store.description || (
                    <span className="italic text-white/30">
                      Belum ada deskripsi
                    </span>
                  )}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] font-bold text-white/40 tracking-wider mb-[8px]">
                  Alamat Lengkap
                </p>
                <div className="flex items-start gap-[8px]">
                  <MapPin
                    size={16}
                    className="text-white/40 shrink-0 mt-[2px]"
                  />
                  <div className="flex flex-col gap-[8px]">
                    <p className="text-[14px] text-white">
                      {store.street_address}, {store.village}, {store.district},{" "}
                      {store.city}, {store.province} {store.postal_code}
                    </p>
                    {store.latitude && store.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-fit flex items-center gap-[8px] px-[16px] py-[8px] bg-white/10 border border-white/20 text-white text-[12px] font-medium hover:bg-white/20 transition-colors"
                      >
                        Lihat di Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Jam Operasional (Read Only) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          className="flex flex-col gap-[16px] bg-white/5 border border-white/10 p-[16px] "
        >
          <div className="w-full flex flex-col gap-[8px]">
            <h2 className={`${cardTitleCls} self-start`}>
              <ClipboardClock size={18} className="text-[#C0FE04]" /> Jam
              Operasional
            </h2>
            <div className="w-full h-[1px] bg-white/10"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
            {DAYS_LABEL.map((dayLabel, index) => {
              const hourData = store.operational_hours?.find(
                (h) => h.day === index,
              );
              const isActive = hourData?.is_active;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white/5 p-[8px] border border-white/5"
                >
                  <span className="text-[12px] font-medium text-white">
                    {dayLabel}
                  </span>
                  {isActive ? (
                    <span className="text-[12px] text-[#C0FE04] font-semibold">
                      {hourData.open_time} - {hourData.close_time}
                    </span>
                  ) : (
                    <span className="text-[12px] text-white/30 font-medium">
                      Tutup
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.2 }}
          className="border border-red-500/30 bg-red-500/5 p-[16px] flex flex-col gap-[16px]"
        >
          <div>
            <div className="w-full flex flex-col gap-[8px]">
              <h2 className={`${cardTitleCls} self-start`}>
                <TriangleAlert size={18} className="text-[#C0FE04]" /> Zona
                Berbahaya
              </h2>
              <p className="text-[12px] text-white/50">
                Menghapus toko akan menghapus seluruh data toko termasuk produk
                dan riwayat pesanan secara permanen. Data ini tidak bisa
                dikembalikan.
              </p>
              <div className="w-full h-[1px] bg-white/10"></div>
            </div>
          </div>

          {!confirmingDelete ? (
            <RevealButton
              type="button"
              label="Hapus Toko"
              icon={Trash2}
              onClick={() => setConfirmingDelete(true)}
              bgBefore="bg-red-400/20"
              textBefore="text-red-400"
              bgAfter="bg-red-500"
              textAfter="text-white"
              className="rounded-none w-fit"
            ></RevealButton>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col gap-[16px] overflow-hidden"
            >
              <p className="text-[12px] text-white/80">
                Untuk melanjutkan, ketik{" "}
                <strong className="text-red-500 select-all">
                  {store?.name}
                </strong>{" "}
                di bawah ini:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={store?.name}
                autoComplete="off"
                className="bg-[#1e1e1e] border border-white/10 text-white text-[12px] px-[16px] py-[8px] focus:outline-none focus:border-[#C0FE04] max-w-sm"
              />
              <div className="flex items-center gap-[8px]">
                <RevealButton
                  type="button"
                  onClick={handleDelete}
                  label={
                    deleteStore.isPending
                      ? "Menghapus..."
                      : "Ya, Saya Yakin Hapus"
                  }
                  disable={
                    deleteStore.isPending || deleteConfirmText !== store?.name
                  }
                  bgBefore="bg-red-500"
                  bgAfter="bg-white"
                  className="rounded-none"
                ></RevealButton>
                <RevealButton
                  type="button"
                  label="batal"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteConfirmText("");
                  }}
                  bgAfter="bg-red-500"
                  textAfter="text-white"
                  className="rounded-none"
                ></RevealButton>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <EditStoreModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        storeData={store}
      />

      <ImageCropperModal
        imageSrc={pendingImageSrc}
        onCancel={() => setPendingImageSrc(null)}
        onConfirm={handleCropConfirm}
        isUploading={updateLogo.isPending}
        cropShape="round"
      />
    </div>
  );
}
