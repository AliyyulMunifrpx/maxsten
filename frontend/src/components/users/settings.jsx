import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  getUserProfile,
  logoutUser,
  updateUserProfile,
} from "../../lib/userApi.js";

// =========================================================
// KOMPONEN 1: KHUSUS TUKANG FETCHING
// =========================================================
export default function EditProfile() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: getUserProfile,
  });

  if (isLoading) {
    return (
      <div className="p-10 text-center text-[#8A8375]">Memuat profil...</div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-[#B23A2E]">
        Gagal memuat profil.
      </div>
    );
  }

  // Lempar data ke komponen anak pas udah kelar loading
  return <EditProfileForm user={user} />;
}

// =========================================================
// KOMPONEN 2: KHUSUS FORM (State aman ditaruh di sini)
// =========================================================
function EditProfileForm({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State Form langsung diisi dari props
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Mutasi Update Profil
  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      toast.success("Profil berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setPassword(""); // Reset field password
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal memperbarui profil");
    },
  });

  // Mutasi Logout
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      toast.success("Berhasil keluar");
      // Bersihkan semua cache React Query agar tidak ada data bocor ke user selanjutnya
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  const handleUpdate = (e) => {
    e.preventDefault();

    // Validasi Password Match jika user mencoba ganti password
    if (password && password !== confirmPassword) {
      return toast.error("Konfirmasi password tidak cocok!");
    }

    const payload = { name };
    if (password) payload.password = password;

    updateMutation.mutate(payload);
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF9F6] py-10 px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* CARD EDIT PROFIL */}
        <div className="rounded-2xl border border-[#E4E1D8] bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1C2321]">
              Pengaturan Akun
            </h1>
            <p className="text-sm text-[#8A8375]">
              Kelola informasi login dan identitas tokomu.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5">
            {/* Username (Read Only) */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
                Username
              </label>
              <input
                type="text"
                value={user?.username || ""}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-[#E4E1D8] bg-[#F1EFE9] px-4 py-2.5 text-[#8A8375]"
              />
              <p className="mt-1 text-[10px] italic text-[#B0AA9B]">
                * Username tidak dapat diubah.
              </p>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
                required
              />
            </div>

            <hr className="border-[#E4E1D8]" />

            {/* Ganti Password Section */}
            <div className="pt-2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C98A1F]">
                Ganti Password (Opsional)
              </p>
              <div className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Password Baru"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Konfirmasi Password Baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
                  />
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="mt-8 flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/seller")}
                className="w-1/3 rounded-lg border border-[#E4E1D8] py-3 text-sm font-semibold text-[#1C2321] transition hover:bg-gray-50"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-2/3 rounded-lg bg-[#147356] py-3 text-sm font-semibold text-white transition hover:bg-[#0F5C44] disabled:opacity-60"
              >
                {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>

        {/* CARD LOGOUT */}
        <div className="rounded-2xl border border-[#F1CFC7] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1C2321]">Keluar dari Aplikasi</p>
              <p className="text-xs text-[#8A8375]">
                Sesi Anda akan dihapus dari perangkat ini.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Apakah Anda yakin ingin keluar?")) {
                  logoutMutation.mutate();
                }
              }}
              disabled={logoutMutation.isPending}
              className="rounded-lg bg-[#B23A2E] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#9B3126] disabled:opacity-50"
            >
              {logoutMutation.isPending ? "Keluar..." : "Logout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
