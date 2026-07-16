import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import { createStore } from "../../lib/sellerApi.js"; // Sesuaikan path-nya

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
      // Mengubah canvas kembali menjadi tipe 'File' yang siap di-upload
      resolve(new File([blob], "logo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg");
  });
}

// =========================================================
// KOMPONEN UTAMA
// =========================================================
export default function CreateStore() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");

  // State untuk Data Upload Asli
  const [logo, setLogo] = useState(null); // File yang akan diupload
  const [previewLogo, setPreviewLogo] = useState(null); // URL untuk preview

  // State khusus React-Easy-Crop
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: createStore,
    onSuccess: () => {
      toast.success("Toko dan Logo berhasil dibuat!");
      navigate("/seller");
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.errors || "Gagal membuat toko.";
      toast.error(errorMsg);
      console.error(error);
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

  // 2. Eksekusi Crop & Simpan ke State
  const handleSaveCrop = async () => {
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      setLogo(croppedFile);
      setPreviewLogo(URL.createObjectURL(croppedFile)); // Tampilkan preview
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memotong gambar.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("address", address);
    formData.append("timezone", timezone);

    if (logo) {
      formData.append("logo", logo);
    }

    mutation.mutate(formData);
  };

  const username = JSON.parse(localStorage.getItem("user"))?.username || "User";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 py-10 px-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-8 shadow-lg relative">
        <h1 className="mb-2 text-3xl font-bold">Buat Toko</h1>
        <p className="mb-8 text-gray-500">
          Lengkapi informasi toko dan logo untuk mulai menerima antrean.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block font-medium">Username Penjual</label>
            <input
              type="text"
              value={username}
              disabled
              className="w-full rounded-lg border bg-gray-100 px-4 py-3 cursor-not-allowed text-gray-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Nama Toko *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Barbershop Munif"
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Deskripsi Toko *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan sedikit tentang tokomu..."
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 min-h-[100px] resize-y"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Alamat Lengkap *</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jalan, RT/RW, Patokan..."
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 min-h-[80px] resize-y"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Zona Waktu *</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 bg-white"
            >
              <option value="Asia/Jakarta">Waktu Indonesia Barat (WIB)</option>
              <option value="Asia/Makassar">
                Waktu Indonesia Tengah (WITA)
              </option>
              <option value="Asia/Jayapura">Waktu Indonesia Timur (WIT)</option>
            </select>
          </div>

          {/* Input Logo & Preview */}
          <div>
            <label className="mb-2 block font-medium">
              Logo Toko (Opsional)
            </label>
            <div className="flex items-center gap-4">
              {/* Jika sudah ada logo, tampilkan preview membulat */}
              {previewLogo ? (
                <div className="relative h-20 w-20 shrink-0">
                  <img
                    src={previewLogo}
                    alt="Logo Preview"
                    className="h-full w-full rounded-full object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      setPreviewLogo(null);
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 h-6 w-6 text-white font-bold flex items-center justify-center hover:bg-red-600"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full rounded-lg border px-4 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Format: JPG, PNG. Maksimal 5MB.
            </p>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-blue-600 py-3 mt-4 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {mutation.isPending ? "Membuat Toko..." : "Buat Toko Sekarang"}
          </button>
        </form>
      </div>

      {/* MODAL CROPPER */}
      {showCropper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">Sesuaikan Logo</h2>
              <p className="text-xs text-gray-500">
                Geser untuk memosisikan, gunakan slider untuk memperbesar.
              </p>
            </div>

            {/* Area Cropper (Wajib punya height dan position relative) */}
            <div className="relative h-64 w-full bg-gray-900 sm:h-80">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1 / 1} // Memaksa rasio kotak 1:1
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-4 flex flex-col gap-4">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(e.target.value)}
                className="w-full accent-blue-600"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCropper(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 font-bold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCrop}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700"
                >
                  Simpan Logo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
