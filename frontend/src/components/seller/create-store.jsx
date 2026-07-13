import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
// Sesuaikan path-nya
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { createStore } from "../../lib/sellerApi.js";

export default function CreateStore() {
  // Tambahin state baru di sini
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [logo, setLogo] = useState(null); // Khusus file, nilai awalnya null
  const [timezone, setTimezone] = useState('')
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

  const handleSubmit = (e) => {
    e.preventDefault();

    // 1. Bungkus semua data pakai FormData (Biar teks & file bisa jalan bareng)
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("address", address);
    formData.append('timezone', timezone)

    // 2. Cek kalau user masukin logo, baru kita append
    // (Namanya WAJIB "logo" biar match sama uploadLogo.single("logo") di backend)
    if (logo) {
      formData.append("logo", logo);
    }

    // 3. Kirim FormData-nya ke API
    mutation.mutate(formData);
  };

  const username = JSON.parse(localStorage.getItem("user"))?.username || "User";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 py-10">
      <div className="w-full max-w-xl rounded-xl bg-white p-8 shadow-lg">
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

          {/* Input Deskripsi */}
          <div>
            <label className="mb-2 block font-medium">Deskripsi Toko *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan sedikit tentang tokomu..."
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 min-h-[100px]"
              required
            />
          </div>

          {/* Input Alamat */}
          <div>
            <label className="mb-2 block font-medium">Alamat Lengkap *</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jalan, RT/RW, Patokan..."
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 min-h-[80px]"
              required
            />
          </div>
<select name="timezone "onChange={(e)=>setTimezone(e.target.value)}>
  <option value="Asia/Jakarta" >Waktu Indonesia Barat (WIB)</option>
  
  <option value="Asia/Makassar" >Waktu Indonesia Tengah (WITA)</option>
  
  <option value="Asia/Jayapura" >Waktu Indonesia Timur (WIT)</option>
</select>
          {/* Input Logo */}
          <div>
            <label className="mb-2 block font-medium">
              Logo Toko (Opsional)
            </label>
            <input
              type="file"
              accept="image/*" // Biar cuma bisa milih gambar
              onChange={(e) => setLogo(e.target.files[0])} // Nangkap file dari input
              className="w-full rounded-lg border px-4 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <button
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-blue-600 py-3 mt-4 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {mutation.isPending ? "Membuat Toko..." : "Buat Toko Sekarang"}
          </button>
        </form>
      </div>
    </div>
  );
}
