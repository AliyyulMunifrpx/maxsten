import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import { createProduct, getStore } from "../../lib/sellerApi.js";
import { getAddonGroups } from "../../lib/addonApi.js";

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
      resolve(new File([blob], "product.jpg", { type: "image/jpeg" }));
    }, "image/jpeg");
  });
}

// =========================================================
// KOMPONEN UTAMA
// =========================================================
export default function CreateProduct() {
  const [data, setData] = useState({ name: "", price: "", variants: [] });
  const [selectedAddonGroups, setSelectedAddonGroups] = useState([]);

  // State khusus React-Easy-Crop & File Gambar
  const [imageFile, setImageFile] = useState(null); // File final yang akan diupload
  const [previewImage, setPreviewImage] = useState(null); // URL untuk ditampilin di UI
  const [imageSrc, setImageSrc] = useState(null); // Gambar mentah sebelum di-crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 1. Tarik data toko buat dapet public_id
  const { data: store } = useQuery({
    queryKey: ["storeMe"],
    queryFn: getStore,
  });

  // 2. Tarik daftar Grup Add-on milik toko ini
  const { data: addonGroups } = useQuery({
    queryKey: ["addonGroups", store?.public_id],
    queryFn: getAddonGroups,
    enabled: !!store?.public_id,
  });

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      toast.success("Produk berhasil dibuat!");
      setData({ name: "", price: "", variants: [] });
      setImageFile(null);
      setPreviewImage(null);
      setSelectedAddonGroups([]);
      navigate("/seller");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.errors || "Terjadi kesalahan pada server.";
      toast.error(errorMsg);
    },
  });

  // --- FUNGSI MENGELOLA CROPPER ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validasi Maksimal 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran foto maksimal 5MB!");
        e.target.value = null;
        return;
      }

      const imageDataUrl = URL.createObjectURL(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);
      e.target.value = null; // Reset input file
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      setImageFile(croppedFile);
      setPreviewImage(URL.createObjectURL(croppedFile));
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memotong gambar.");
    }
  };

  // --- FUNGSI MENGATUR VARIAN ---
  const addVariant = () => {
    setData({
      ...data,
      variants: [...data.variants, { name: "", additional_price: "" }],
    });
  };

  const removeVariant = (indexToRemove) => {
    const newVariants = data.variants.filter(
      (_, index) => index !== indexToRemove,
    );
    setData({ ...data, variants: newVariants });
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...data.variants];
    newVariants[index][field] = value;
    setData({ ...data, variants: newVariants });
  };

  // --- FUNGSI TOGGLE ADD-ON ---
  const handleToggleAddonGroup = (groupId) => {
    setSelectedAddonGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  // --- SUBMIT ---
  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("price", Number(data.price));

    const parsedVariants = data.variants.map((v) => ({
      name: v.name,
      additional_price: Number(v.additional_price) || 0,
    }));
    formData.append("variants", JSON.stringify(parsedVariants));

    if (selectedAddonGroups.length > 0) {
      formData.append("addon_group_ids", JSON.stringify(selectedAddonGroups));
    }

    if (imageFile) {
      formData.append("image", imageFile);
    }

    mutation.mutate(formData);
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF9F6] py-10 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm border border-[#E4E1D8]">
        <h1 className="mb-2 text-2xl font-bold text-[#1C2321]">
          Tambah Produk Baru
        </h1>
        <p className="mb-8 text-sm text-[#8A8375]">
          Lengkapi detail produk, varian, dan foto agar menarik pelanggan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* FOTO PRODUK */}
          <div className="mb-8 border-b border-[#E4E1D8] pb-8">
            <label className="mb-3 block text-sm font-semibold text-[#1C2321]">
              Foto Produk (Opsional)
            </label>
            <div className="relative mb-3 aspect-[1/1] h-48 overflow-hidden rounded-xl border border-[#E4E1D8] bg-[#F1EFE9]">
              {previewImage ? (
                <>
                  <img
                    src={previewImage}
                    alt="Preview Produk"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreviewImage(null);
                    }}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#B23A2E] text-white shadow hover:bg-[#9B3126]"
                    title="Hapus Foto"
                  >
                    &times;
                  </button>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">
                  🍽️
                </div>
              )}
            </div>

            <label className="cursor-pointer text-sm font-semibold text-[#147356] transition hover:text-[#0F5C44]">
              {previewImage ? "Ganti Foto Produk" : "+ Unggah Foto Produk"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            <p className="mt-1 text-xs text-[#8A8375]">
              Rasio 1:1 (Kotak). Maksimal 5MB.
            </p>
          </div>

          {/* INPUT PRODUK UTAMA */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
                Nama Produk
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                placeholder="Cth: Nasi Goreng Spesial"
                className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
                Harga Dasar (Rp)
              </label>
              <input
                type="number"
                value={data.price}
                onChange={(e) => setData({ ...data, price: e.target.value })}
                placeholder="Cth: 15000"
                className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
                required
              />
            </div>
          </div>

          {/* INPUT VARIAN DINAMIS */}
          <div className="pt-4 border-t border-[#E4E1D8]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-sm font-semibold text-[#1C2321]">
                  Pilihan Varian
                </label>
                <p className="text-xs text-[#8A8375]">
                  Pembeli hanya bisa pilih 1 (Opsional).
                </p>
              </div>
              <button
                type="button"
                onClick={addVariant}
                className="text-xs font-bold text-[#147356] hover:text-[#0F5C44] bg-[#E7F3EC] px-3 py-1.5 rounded-lg transition"
              >
                + Tambah Varian
              </button>
            </div>

            {data.variants.length === 0 && (
              <p className="text-sm text-[#8A8375] italic mb-4">
                Belum ada varian.
              </p>
            )}

            <div className="space-y-3">
              {data.variants.map((variant, index) => (
                <div key={index} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) =>
                      handleVariantChange(index, "name", e.target.value)
                    }
                    placeholder="Nama (Cth: Pedas)"
                    className="flex-1 rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm outline-none focus:border-[#C98A1F]"
                    required
                  />
                  <input
                    type="number"
                    value={variant.additional_price}
                    onChange={(e) =>
                      handleVariantChange(
                        index,
                        "additional_price",
                        e.target.value,
                      )
                    }
                    placeholder="+ Harga (0)"
                    className="w-1/3 rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm outline-none focus:border-[#C98A1F]"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEAE7] text-[#B23A2E] hover:bg-[#F1CFC7] font-bold transition"
                    title="Hapus Varian"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* INPUT ADD-ON GRUP (CHECKBOX) */}
          {addonGroups && addonGroups.length > 0 && (
            <div className="pt-6 border-t border-[#E4E1D8]">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-[#1C2321]">
                  Grup Add-on / Topping
                </h2>
                <p className="text-xs text-[#8A8375]">
                  Pembeli bisa pilih lebih dari 1 (Opsional).
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {addonGroups.map((group) => {
                  const isChecked = selectedAddonGroups.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        isChecked
                          ? "border-[#147356] bg-[#E7F3EC]"
                          : "border-[#E4E1D8] bg-white hover:border-[#147356]/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#147356] focus:ring-[#147356]"
                        checked={isChecked}
                        onChange={() => handleToggleAddonGroup(group.id)}
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-[#1C2321]">
                          {group.name}
                        </span>
                        <span className="text-xs text-[#6B6558] mt-0.5">
                          {group.addons.length} pilihan add-on
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* TOMBOL SUBMIT */}
          <div className="mt-8 flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/seller")}
              className="w-1/3 rounded-lg border border-[#E4E1D8] py-3 font-semibold text-[#1C2321] transition hover:bg-[#FAF9F6]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-2/3 rounded-lg bg-[#147356] py-3 font-semibold text-white transition hover:bg-[#0F5C44] disabled:opacity-60"
            >
              {mutation.isPending ? "Menyimpan..." : "Simpan Produk"}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL CROPPER */}
      {showCropper && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#E4E1D8]">
              <h2 className="text-lg font-bold text-[#1C2321]">
                Sesuaikan Foto Produk
              </h2>
              <p className="text-xs text-[#8A8375] mt-1">
                Geser untuk memosisikan, gunakan slider untuk memperbesar.
              </p>
            </div>

            {/* Area Cropper */}
            <div className="relative h-64 w-full bg-gray-900 sm:h-80">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1 / 1} // Rasio 1:1 Kotak
                // Tidak pakai cropShape="round" agar UI-nya kotak
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
                  className="flex-1 rounded-xl border border-[#E4E1D8] py-3 text-sm font-bold text-[#1C2321] hover:bg-[#FAF9F6]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCrop}
                  className="flex-1 rounded-xl bg-[#147356] py-3 text-sm font-bold text-white hover:bg-[#0F5C44]"
                >
                  Simpan Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
