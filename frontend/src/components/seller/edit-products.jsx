import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import Cropper from "react-easy-crop";
import {
  updateProductImage,
  updateProductInfo,
} from "../../lib/sellerApi.js";
import { deleteProduct, getProduct } from "../../lib/productApi.js";
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
      resolve(new File([blob], "product-edit.jpg", { type: "image/jpeg" }));
    }, "image/jpeg");
  });
}

export default function EditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const backendUrl = import.meta.env.VITE_API_PATH.replace("/api", "");

  // State khusus untuk Cropper Gambar
  const [newImagePreview, setNewImagePreview] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  // State Modal Hapus
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 1. Tarik data produk berdasarkan productId
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  });

  // 2. Tarik data addon group
  const { data: addonGroups } = useQuery({
    queryKey: ["addonGroups"],
    queryFn: getAddonGroups,
  });

  // Inisialisasi React Hook Form
  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      price: "",
      variants: [],
      addon_group_ids: [],
    },
    values: product
      ? {
          name: product.name,
          price: product.price,
          variants: product.variants || [],
          addon_group_ids:
            product.productAddonGroups?.map(
              (pag) => pag.addon_group_id || pag.addon_group?.id,
            ) || [],
        }
      : undefined,
  });

  const { fields, prepend, remove } = useFieldArray({
    control,
    name: "variants",
  });

  // Menentukan gambar yang tampil
  const displayImage =
    newImagePreview ||
    (product?.image_url ? `${backendUrl}${product.image_url}` : "");

  // MUTASI 1: Khusus Teks & Varian
  const infoMutation = useMutation({
    mutationFn: updateProductInfo,
    onSuccess: () => {
      toast.success("Info produk berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      navigate("/seller");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.errors || "Gagal menyimpan info produk.",
      );
    },
  });

  // MUTASI 2: Khusus Gambar (Auto Upload setelah di-crop)
  const imageMutation = useMutation({
    mutationFn: updateProductImage,
    onSuccess: () => {
      toast.success("Foto produk berhasil diganti!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      setShowCropper(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.errors || "Gagal mengganti foto produk.",
      );
    },
  });

  // MUTASI 3: Delete Produk
  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(productId),
    onSuccess: () => {
      toast.success("Produk berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDeleteModalOpen(false);
      navigate("/seller");
    },
    onError: (error) => {
      const message = error.response?.data?.errors || "Gagal menghapus produk.";
      toast.error(message);
    },
  });

  // --- FUNGSI MENGELOLA CROPPER ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran foto maksimal 5MB!");
        e.target.value = null;
        return;
      }

      const imageDataUrl = URL.createObjectURL(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);
      e.target.value = null;
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      setNewImagePreview(URL.createObjectURL(croppedFile));

      const formData = new FormData();
      formData.append("image", croppedFile);
      imageMutation.mutate({ productId, formData });
    } catch (e) {
      console.error(e);
      toast.error("Gagal memotong gambar.");
    }
  };

  // --- FUNGSI SUBMIT FORM ---
  const onSubmit = (data) => {
    const payload = {
      name: data.name,
      price: Number(data.price),
      variants: data.variants.map((v) => ({
        id: v.id ? v.id : undefined,
        name: v.name,
        additional_price: Number(v.additional_price) || 0,
      })),
      addon_group_ids: data.addon_group_ids,
    };

    infoMutation.mutate({ productId, data: payload });
  };

  if (isLoading)
    return <div className="p-10 text-center">Memuat produk...</div>;

  if (isError) {
    return (
      <p className="text-center text-[#B23A2E] mt-10 font-bold">
        Produk tidak ditemukan
      </p>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF9F6] py-10 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm border border-[#E4E1D8]">
        {/* HEADER DENGAN TOMBOL HAPUS */}
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold text-[#1C2321]">Edit Produk</h1>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[#FBEAE7] text-[#B23A2E] transition hover:bg-[#F1CFC7]"
            title="Hapus Produk"
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
          Perbarui detail produk dan pilihan variannya.
        </p>

        {/* BAGIAN FOTO PRODUK (Auto Upload) */}
        <div className="mb-8 border-b border-[#E4E1D8] pb-8">
          <label className="mb-3 block text-sm font-semibold text-[#1C2321]">
            Foto Produk
          </label>
          <div className="relative mb-3 h-48 aspect-[1/1] overflow-hidden rounded-xl border border-[#E4E1D8] bg-[#F1EFE9]">
            {displayImage ? (
              <img
                src={displayImage}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-5xl">
                🍽️
              </div>
            )}

            {imageMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>

          <label
            className={`cursor-pointer text-sm font-semibold transition ${
              imageMutation.isPending
                ? "text-gray-400"
                : "text-[#147356] hover:text-[#0F5C44]"
            }`}
          >
            {imageMutation.isPending
              ? "Mengunggah foto..."
              : "Ganti Foto Produk"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={imageMutation.isPending}
            />
          </label>
          <p className="mt-1 text-xs text-[#8A8375]">
            Rasio 1:1 (Kotak). Maksimal 5MB.
          </p>
        </div>

        {/* BAGIAN INFO PRODUK & VARIAN */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
                Nama Produk
              </label>
              <input
                type="text"
                {...register("name", { required: true })}
                className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
                Harga Dasar (Rp)
              </label>
              <input
                type="number"
                {...register("price", { required: true })}
                className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4E1D8]">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-[#1C2321]">
                Pilihan Varian
              </label>
              <button
                type="button"
                onClick={() => prepend({ name: "", additional_price: "" })}
                className="text-xs font-bold text-[#147356] hover:text-[#0F5C44] bg-[#E7F3EC] px-3 py-1.5 rounded-lg transition"
              >
                + Tambah Varian
              </button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-[#8A8375] italic mb-4">
                Belum ada varian ditambahkan.
              </p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      {...register(`variants.${index}.name`, {
                        required: true,
                      })}
                      placeholder="Nama Varian (Cth: Pedas Mampus)"
                      className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm outline-none focus:border-[#C98A1F]"
                    />
                  </div>
                  <div className="w-1/3 space-y-2">
                    <input
                      type="number"
                      {...register(`variants.${index}.additional_price`)}
                      placeholder="+ Harga (Cth: 2000)"
                      className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm outline-none focus:border-[#C98A1F]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEAE7] text-[#B23A2E] hover:bg-[#F1CFC7] font-bold transition"
                    title="Hapus"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {addonGroups && addonGroups.length > 0 && (
              <div className="pt-6 border-t border-[#E4E1D8]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#1C2321]">
                    Grup Add-on untuk Produk Ini
                  </h2>
                  <p className="text-xs text-[#8A8375]">
                    Pilih hingga 2 grup add-on atau biarkan kosong.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {addonGroups.map((group) => {
                    return (
                      <label
                        key={group.id}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition border-gray-200 bg-white hover:border-[#147356]/50 has-[:checked]:border-[#147356] has-[:checked]:bg-[#E7F3EC]"
                      >
                        <input
                          type="checkbox"
                          value={group.id}
                          {...register("addon_group_ids")}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#147356] focus:ring-[#147356]"
                        />
                        <div>
                          <p className="font-semibold text-sm text-[#1C2321]">
                            {group.name}
                          </p>
                          <p className="text-xs text-[#6B6558]">
                            {group.addons.length} pilihan add-on
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
              disabled={infoMutation.isPending}
              className="w-2/3 rounded-lg bg-[#147356] py-3 font-semibold text-white transition hover:bg-[#0F5C44] disabled:opacity-60"
            >
              {infoMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL CROPPER UNTUK PRODUK */}
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

            <div className="relative h-64 w-full bg-gray-900 sm:h-80">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1 / 1} // Kotak sempurna
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
                  disabled={imageMutation.isPending}
                  className="flex-1 rounded-xl border border-[#E4E1D8] py-3 text-sm font-bold text-[#1C2321] hover:bg-[#FAF9F6] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCrop}
                  disabled={imageMutation.isPending}
                  className="flex-1 rounded-xl bg-[#147356] py-3 text-sm font-bold text-white hover:bg-[#0F5C44] disabled:opacity-50"
                >
                  {imageMutation.isPending ? "Menyimpan..." : "Simpan Foto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI DELETE PRODUK */}
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
              <h2 className="text-xl font-bold text-[#1C2321]">
                Hapus Produk?
              </h2>
            </div>
            <p className="mb-6 text-sm text-[#8A8375]">
              Apakah Anda yakin ingin menghapus produk{" "}
              <strong className="text-[#1C2321]">"{product?.name}"</strong>?
              Tindakan ini tidak dapat dibatalkan.
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
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
