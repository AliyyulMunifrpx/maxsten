import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { createProduct, getStore, getAddonGroups } from "../../lib/sellerApi.js";

export default function CreateProduct() {
  const [data, setData] = useState({ name: "", price: "", variants: [] });
  const [imageFile, setImageFile] = useState(null);
  
  // State khusus buat nyimpen ID grup Add-on yang dicentang
  const [selectedAddonGroups, setSelectedAddonGroups] = useState([]);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 1. Tarik data toko buat dapet public_id (wajib buat API add-on)
  const { data: store } = useQuery({
    queryKey: ["storeMe"],
    queryFn: getStore,
  });

  // 2. Tarik daftar Grup Add-on milik toko ini
  const { data: addonGroups } = useQuery({
    queryKey: ["addonGroups", store?.public_id],
    queryFn: getAddonGroups,
    enabled: !!store?.public_id, // Hanya jalan kalau ID toko udah dapet
  });

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      toast.success("Produk, Foto, Varian & Add-on berhasil dibuat!");
      setData({ name: "", price: "", variants: [] });
      setImageFile(null);
      setSelectedAddonGroups([]);
      navigate("/seller");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.errors || "Terjadi kesalahan pada server.";
      toast.error(errorMsg);
    },
  });

  // --- FUNGSI UNTUK MENGATUR VARIAN DINAMIS ---
  const addVariant = () => {
    setData({
      ...data,
      variants: [...data.variants, { name: "", additional_price: "" }],
    });
  };

  const removeVariant = (indexToRemove) => {
    const newVariants = data.variants.filter((_, index) => index !== indexToRemove);
    setData({ ...data, variants: newVariants });
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...data.variants];
    newVariants[index][field] = value;
    setData({ ...data, variants: newVariants });
  };

  // --- FUNGSI UNTUK TOGGLE CENTANG ADD-ON ---
  const handleToggleAddonGroup = (groupId) => {
    setSelectedAddonGroups((prev) => 
      prev.includes(groupId) 
        ? prev.filter((id) => id !== groupId) // Hapus kalau udah dicentang
        : [...prev, groupId] // Tambah kalau belum dicentang
    );
  };

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
    
    // Kirim Add-on yang dicentang ke backend
    if (selectedAddonGroups.length > 0) {
      formData.append("addon_group_ids", JSON.stringify(selectedAddonGroups));
    }
    
    if (imageFile) {
      formData.append("image", imageFile);
    }

    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-xl mx-auto pb-24">
      <h2 className="text-2xl font-bold mb-6">Tambah Produk Baru</h2>

      {/* INPUT PRODUK UTAMA */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <label className="block text-sm font-semibold mb-2">Info Produk</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          placeholder="Nama Produk (Cth: Seblak Mercon)"
          className="mb-3 block w-full border p-2 rounded outline-none focus:border-blue-500"
          required
        />
        <input
          type="number"
          value={data.price}
          onChange={(e) => setData({ ...data, price: e.target.value })}
          placeholder="Harga Dasar (Cth: 15000)"
          className="mb-4 block w-full border p-2 rounded outline-none focus:border-blue-500"
          required
        />

        {/* INPUT FOTO PRODUK */}
        <label className="block text-sm font-semibold mb-2">
          Foto Produk (Opsional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="block w-full border p-2 rounded bg-white cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* INPUT VARIAN DINAMIS */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-semibold">
            Varian (Opsional - Cuma bisa pilih 1 pas beli)
          </label>
          <button
            type="button"
            onClick={addVariant}
            className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 font-bold"
          >
            + Tambah Varian
          </button>
        </div>

        {data.variants.length === 0 && (
          <p className="text-sm text-gray-400 italic mb-2">
            Belum ada varian ditambahkan.
          </p>
        )}

        {data.variants.map((variant, index) => (
          <div key={index} className="flex gap-2 mb-2 items-start">
            <input
              type="text"
              value={variant.name}
              onChange={(e) => handleVariantChange(index, "name", e.target.value)}
              placeholder="Nama Varian (Cth: Sedang)"
              className="flex-1 border p-2 rounded outline-none focus:border-blue-500"
              required
            />
            <input
              type="number"
              value={variant.additional_price}
              onChange={(e) => handleVariantChange(index, "additional_price", e.target.value)}
              placeholder="Harga Tambahan"
              className="w-1/3 border p-2 rounded outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => removeVariant(index)}
              className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 font-bold"
              title="Hapus Varian"
            >
              X
            </button>
          </div>
        ))}
      </div>

      {/* 🌟 INPUT ADD-ON GRUP (CHECKBOX) */}
      {addonGroups && addonGroups.length > 0 && (
        <div className="mb-8 p-4 border rounded bg-gray-50">
          <label className="block text-sm font-semibold mb-3">
            Grup Add-on / Topping (Opsional - Pembeli bisa pilih banyak)
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {addonGroups.map((group) => {
              const isChecked = selectedAddonGroups.includes(group.id);
              return (
                <label 
                  key={group.id} 
                  className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition-all ${
                    isChecked 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-300 bg-white hover:bg-gray-100"
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={isChecked}
                    onChange={() => handleToggleAddonGroup(group.id)}
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">{group.name}</span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {group.addons.length} pilihan menu
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* TOMBOL SUBMIT */}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
      >
        {mutation.isPending ? "Menyimpan..." : "Simpan Produk"}
      </button>
    </form>
  );
}