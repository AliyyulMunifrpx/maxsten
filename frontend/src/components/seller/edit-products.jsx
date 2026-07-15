import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAddonGroups,
  updateProductImage,
  updateProductInfo,
} from "../../lib/sellerApi.js";
import { getProduct } from "../../lib/productApi.js";

export default function EditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const backendUrl = import.meta.env.VITE_API_PATH.replace("/api", "");

  // State khusus untuk preview jika user upload gambar baru
  const [newImagePreview, setNewImagePreview] = useState("");

  // 1. Tarik HANYA 1 data produk berdasarkan productId
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

  // Inisialisasi React Hook Form dengan prop 'values'
  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      price: "",
      variants: [],
      addon_group_ids: [],
    },
    // RHF akan otomatis mengisi dan menimpa form saat data 'product' selesai di-fetch
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

  // Manajemen array dinamis untuk varian produk
  const { fields, prepend, remove } = useFieldArray({
    control,
    name: "variants",
  });

  // Menentukan gambar mana yang tampil (gambar baru vs gambar dari database)
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

  // MUTASI 2: Khusus Gambar (Auto Upload)
  const imageMutation = useMutation({
    mutationFn: updateProductImage,
    onSuccess: () => {
      toast.success("Foto produk berhasil diganti!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.errors || "Gagal mengganti foto produk.",
      );
    },
  });

  // --- FUNGSI MENGELOLA GAMBAR ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Set preview untuk gambar yang baru dipilih
    setNewImagePreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    imageMutation.mutate({ productId, formData });
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
    return <p className="text-center">Produk tidak ditemukan</p>;
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF9F6] py-10 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm border border-[#E4E1D8]">
        <h1 className="mb-2 text-2xl font-bold text-[#1C2321]">Edit Produk</h1>
        <p className="mb-8 text-sm text-[#8A8375]">
          Perbarui detail produk dan pilihan variannya.
        </p>

        {/* BAGIAN FOTO PRODUK (Auto Upload) */}
        <div className="mb-8 border-b border-[#E4E1D8] pb-8">
          <label className="mb-3 block text-sm font-semibold text-[#1C2321]">
            Foto Produk
          </label>
          <div className="relative mb-3 h-48 w-full overflow-hidden rounded-xl border border-[#E4E1D8] bg-gray-50">
            {/* PERBAIKAN DI SINI: Gunakan displayImage, bukan previewImage */}
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
              onChange={handleImageChange}
              disabled={imageMutation.isPending}
            />
          </label>
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
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition border-gray-200 bg-white hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                      >
                        <input
                          type="checkbox"
                          value={group.id}
                          {...register("addon_group_ids")}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
              className="w-1/3 rounded-lg border border-[#E4E1D8] py-3 font-semibold text-[#1C2321] transition hover:bg-gray-50"
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
    </div>
  );
}
