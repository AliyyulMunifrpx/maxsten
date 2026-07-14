import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  getStore,
  updateStoreLogo,
  updateStoreProfile,
} from "../../lib/sellerApi.js";

export default function EditStore() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const backendUrl = import.meta.env.VITE_API_PATH.replace("/api", "");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("");
  // STATE BARU: batas waktu pembayaran (menit)
  const [paymentTimeout, setPaymentTimeout] = useState("");

  const { data: store, isLoading } = useQuery({
    queryKey: ["storeMe"],
    queryFn: getStore,
  });

  useEffect(() => {
    if (store) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(store.name || "");
      setDescription(store.description || "");
      setAddress(store.address || "");
      setTimezone(store.timezone || "Asia/Jakarta");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaymentTimeout(
        store.payment_timeout != null ? String(store.payment_timeout) : "",
      );
    }
  }, [store]);

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

  const logoMutation = useMutation({
    mutationFn: updateStoreLogo,
    onSuccess: () => {
      toast.success("Logo toko berhasil diganti!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal mengganti logo.");
    },
  });

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);
    logoMutation.mutate(formData);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    profileMutation.mutate({
      name,
      description,
      address,
      timezone,
      // Kirim null kalau dikosongin, biar backend pakai default 30 menit
      payment_timeout: paymentTimeout === "" ? null : Number(paymentTimeout),
    });
  };

  if (isLoading)
    return <div className="p-10 text-center">Memuat data toko...</div>;
  if (!store)
    return <div className="p-10 text-center">Toko tidak ditemukan.</div>;

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF9F6] py-10 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm border border-[#E4E1D8]">
        <h1 className="mb-2 text-2xl font-bold text-[#1C2321]">
          Edit Profil Toko
        </h1>
        <p className="mb-8 text-sm text-[#8A8375]">
          Perbarui informasi tokomu agar pelanggan makin percaya.
        </p>

        {/* FOTO LOGO */}
        <div className="flex flex-col items-center mb-8 border-b border-[#E4E1D8] pb-8">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[#E4E1D8] bg-gray-50 mb-3">
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
            {logoMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <label
            className={`cursor-pointer text-sm font-semibold transition ${logoMutation.isPending ? "text-gray-400" : "text-[#147356] hover:text-[#0F5C44]"}`}
          >
            {logoMutation.isPending ? "Mengunggah..." : "Ganti Logo Toko"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
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
              className="w-full min-h-[100px] rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
              Alamat
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full min-h-[80px] rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
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
              className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
            >
              <option value="Asia/Jakarta">Waktu Indonesia Barat (WIB)</option>
              <option value="Asia/Makassar">
                Waktu Indonesia Tengah (WITA)
              </option>
              <option value="Asia/Jayapura">Waktu Indonesia Timur (WIT)</option>
            </select>
          </div>

          {/* FIELD BARU: Batas Waktu Pembayaran */}
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
              className="w-1/3 rounded-lg border border-[#E4E1D8] py-3 font-semibold text-[#1C2321] transition hover:bg-gray-50"
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
    </div>
  );
}
