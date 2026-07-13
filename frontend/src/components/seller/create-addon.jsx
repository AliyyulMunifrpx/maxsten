import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createAddonGroup } from "../../lib/sellerApi.js";

export default function CreateAddon() {
  const [name, setName] = useState("");
  const [addons, setAddons] = useState([{ name: "", price: "" }]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: createAddonGroup,
    onSuccess: () => {
      toast.success("Grup add-on berhasil ditambahkan.");
      queryClient.invalidateQueries({ queryKey: ["addonGroups"] });
      navigate("/seller");
    },
    onError: (error) => {
      const message = error.response?.data?.errors || "Gagal membuat grup add-on.";
      toast.error(message);
    },
  });

  const handleAddonChange = (index, field, value) => {
    setAddons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addAddonItem = () => {
    setAddons((prev) => [...prev, { name: "", price: "" }]);
  };

  const removeAddonItem = (index) => {
    setAddons((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name,
      addons: addons.map((addon) => ({
        name: addon.name,
        price: Number(addon.price) || 0,
      })),
    };
    mutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#E4E1D8] bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-[#1C2321] mb-6">Tambah Grup Add-on</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#1C2321] mb-2">Nama Grup Add-on</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Cth: Tambahan Topping"
              className="w-full rounded-xl border border-[#D8D3C4] px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1C2321]">Daftar Add-on</h3>
              <button
                type="button"
                onClick={addAddonItem}
                className="rounded-full bg-[#147356] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F5C44]"
              >
                + Tambah Pilihan
              </button>
            </div>

            {addons.map((addon, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={addon.name}
                    onChange={(e) => handleAddonChange(index, "name", e.target.value)}
                    required
                    placeholder="Nama add-on"
                    className="w-full rounded-xl border border-[#D8D3C4] px-4 py-3 outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min="0"
                    value={addon.price}
                    onChange={(e) => handleAddonChange(index, "price", e.target.value)}
                    required
                    placeholder="Harga add-on"
                    className="w-full rounded-xl border border-[#D8D3C4] px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAddonItem(index)}
                  className="h-fit self-center rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600"
                  disabled={addons.length === 1}
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-2xl bg-[#147356] px-4 py-3 text-white font-semibold shadow-sm transition hover:bg-[#0F5C44] disabled:opacity-60"
          >
            {mutation.isPending ? "Menyimpan..." : "Simpan Grup Add-on"}
          </button>
        </form>
      </div>
    </div>
  );
}
