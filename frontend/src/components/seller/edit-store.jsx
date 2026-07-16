import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import {
  getStore,
  updateStoreLogo,
  updateStoreProfile,
  deleteStore, // <-- Pastikan ini sudah di-export di sellerApi.js
} from "../../lib/sellerApi.js";

// =========================================================
// HELPER: Mengubah titik koordinat Crop menjadi File Gambar
// =========================================================
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob], "logo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg");
  });
}

// =========================================================
// KOMPONEN 1: KHUSUS FETCHING DATA (TIDAK ADA STATE LOKAL)
// =========================================================
export default function EditStore() {
  const { data: store, isLoading } = useQuery({
    queryKey: ["storeMe"],
    queryFn: getStore,
  });

  if (isLoading)
    return (
      <div className="p-10 text-center text-[#8A8375]">Memuat data toko...</div>
    );
  if (!store)
    return (
      <div className="p-10 text-center text-[#B23A2E]">
        Toko tidak ditemukan.
      </div>
    );

  // Lempar data ke komponen Form saat sudah siap
  return <EditStoreForm store={store} />;
}

// =========================================================
// KOMPONEN 2: KHUSUS FORM & CROPPER (BEBAS USEEFFECT)
// =========================================================
function EditStoreForm({ store }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const backendUrl = import.meta.env.VITE_API_PATH.replace("/api", "");

  // Inisialisasi state langsung dari props `store`
  const [name, setName] = useState(store.name || "");
  const [description, setDescription] = useState(store.description || "");
  const [address, setAddress] = useState(store.address || "");
  const [timezone, setTimezone] = useState(store.timezone || "Asia/Jakarta");
  const [paymentTimeout, setPaymentTimeout] = useState(
    store.payment_timeout != null ? String(store.payment_timeout) : "",
  );

  // State khusus React-Easy-Crop
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  // State Modal Hapus
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Mutasi Profil
  const profileMutation = useMutation({
    mutationFn: updateStoreProfile,
    onSuccess: () => {
      toast.success("Profil toko berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      navigate("/seller");
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal mengupdate profil.");
    },
  });

  // Mutasi Logo
  const logoMutation = useMutation({
    mutationFn: updateStoreLogo,
    onSuccess: () => {
      toast.success("Logo toko berhasil diganti!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      setShowCropper(false); // Tutup cropper setelah sukses upload
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal mengganti logo.");
    },
  });

  // Mutasi Hapus Toko
  const deleteMutation = useMutation({
    mutationFn: deleteStore,
    onSuccess: () => {
      toast.success("Toko berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      setIsDeleteModalOpen(false);
      navigate("/seller");
    },
    onError: (error) => {
      const message = error.response?.data?.errors || "Gagal menghapus toko.";
      toast.error(message);
    },
  });

  // 1. Validasi file dan Buka Cropper
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validasi Maksimal 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran logo maksimal 5MB!");
        e.target.value = null; // Reset input
        return;
      }

      // Buat URL sementara untuk di-crop
      const imageDataUrl = URL.createObjectURL(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);

      // Reset input agar bisa pilih file yang sama 2x kalau batal
      e.target.value = null;
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 2. Eksekusi Crop & Langsung Upload
  const handleSaveCrop = async () => {
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);

      // Langsung tembak ke backend
      const formData = new FormData();
      formData.append("logo", croppedFile);
      logoMutation.mutate(formData);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memotong gambar.");
    }
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    profileMutation.mutate({
      name,
      description,
      address,
      timezone,
      payment_timeout: paymentTimeout === "" ? null : Number(paymentTimeout),
    });
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF9F6] py-10 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm border border-[#E4E1D8]">
        {/* HEADER DENGAN TOMBOL HAPUS */}
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold text-[#1C2321]">
            Edit Profil Toko
          </h1>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[#FBEAE7] text-[#B23A2E] transition hover:bg-[#F1CFC7]"
            title="Hapus Toko"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>

        <p className="mb-8 text-sm text-[#8A8375]">
          Perbarui informasi tokomu agar pelanggan makin percaya.
        </p>

        {/* FOTO LOGO */}
        <div className="flex flex-col items-center mb-8 border-b border-[#E4E1D8] pb-8">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[#E4E1D8] bg-[#F1EFE9] mb-3">
            {store.logo_url ? (
              <img
                src={`${backendUrl}${store.logo_url}`}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">
                🏪
              </div>
            )}

            {/* Loading Indicator saat Upload */}
            {logoMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>

          <label
            className={`cursor-pointer text-sm font-semibold transition ${
              logoMutation.isPending
                ? "text-gray-400"
                : "text-[#147356] hover:text-[#0F5C44]"
            }`}
          >
            {logoMutation.isPending ? "Mengunggah..." : "Ganti Logo Toko"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={logoMutation.isPending}
            />
          </label>
        </div>

        {/* FORM ISIAN TEKS */}
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
              Nama Toko
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[100px] rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F] resize-y"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
              Alamat
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full min-h-[80px] rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F] resize-y"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
              Zona Waktu
            </label>
            <select
              name="timezone"
              onChange={(e) => setTimezone(e.target.value)}
              value={timezone}
              className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F] bg-white"
            >
              <option value="Asia/Jakarta">Waktu Indonesia Barat (WIB)</option>
              <option value="Asia/Makassar">
                Waktu Indonesia Tengah (WITA)
              </option>
              <option value="Asia/Jayapura">Waktu Indonesia Timur (WIT)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="payment_timeout"
              className="mb-1 block text-sm font-semibold text-[#1C2321]"
            >
              Batas Waktu Pembayaran (menit)
            </label>
            <input
              id="payment_timeout"
              type="number"
              min={1}
              placeholder="30"
              value={paymentTimeout}
              onChange={(e) => setPaymentTimeout(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
            />
            <p className="mt-1.5 text-xs text-[#8A8375]">
              Berapa lama pembeli punya waktu buat bayar sebelum antreannya
              otomatis kadaluarsa. Kosongkan buat pakai default 30 menit.
            </p>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/seller")}
              className="w-1/3 rounded-lg border border-[#E4E1D8] py-3 font-semibold text-[#1C2321] transition hover:bg-[#FAF9F6]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="w-2/3 rounded-lg bg-[#147356] py-3 font-semibold text-white transition hover:bg-[#0F5C44] disabled:opacity-60"
            >
              {profileMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL CROPPER UNTUK LOGO */}
      {showCropper && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#E4E1D8]">
              <h2 className="text-lg font-bold text-[#1C2321]">
                Sesuaikan Logo
              </h2>
              <p className="text-xs text-[#8A8375] mt-1">
                Geser untuk memosisikan, gunakan slider untuk memperbesar.
              </p>
            </div>

            <div className="relative h-64 w-full bg-gray-900 sm:h-80">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1 / 1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-5 flex flex-col gap-5">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(e.target.value)}
                className="w-full accent-[#147356]"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCropper(false)}
                  disabled={logoMutation.isPending}
                  className="flex-1 rounded-xl border border-[#E4E1D8] py-3 text-sm font-bold text-[#1C2321] hover:bg-[#FAF9F6] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCrop}
                  disabled={logoMutation.isPending}
                  className="flex-1 rounded-xl bg-[#147356] py-3 text-sm font-bold text-white hover:bg-[#0F5C44] disabled:opacity-50"
                >
                  {logoMutation.isPending ? "Menyimpan..." : "Simpan Logo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI DELETE TOKO */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (!deleteMutation.isPending) setIsDeleteModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3 text-[#B23A2E]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FBEAE7]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1C2321]">Hapus Toko?</h2>
            </div>
            <p className="mb-6 text-sm text-[#8A8375]">
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-[#1C2321]">"{store?.name}"</strong>? Semua
              produk, antrean, dan data toko ini akan ikut terhapus. Tindakan
              ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl border border-[#E4E1D8] bg-white py-2.5 text-sm font-bold text-[#1C2321] transition hover:bg-[#F7F7F7] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-[#B23A2E] py-2.5 text-sm font-bold text-white transition hover:bg-[#9B3126] disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Toko"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
