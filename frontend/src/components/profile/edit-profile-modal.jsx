import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useUpdateProfile,
  useUpdateEmail,
  useUpdatePassword,
  useDeleteAccount,
} from "../../hooks/auth";
import { RevealButton } from "../reveal-button.jsx";
import toast from "react-hot-toast";

export function EditProfileModal({ isOpen, onClose, user }) {
  const navigate = useNavigate();

  // State Form Edit
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // State Mode Hapus Akun
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  // Panggil Hooks React Query
  const { mutateAsync: updateProfile, isPending: isUpdatingProfile } =
    useUpdateProfile();
  const { mutateAsync: updateEmail, isPending: isUpdatingEmail } =
    useUpdateEmail();
  const { mutateAsync: updatePassword, isPending: isUpdatingPassword } =
    useUpdatePassword();
  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } =
    useDeleteAccount();

  // Mengembalikan data ke kondisi semula setiap kali modal dibuka/ditutup
  useEffect(() => {
    if (isOpen) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setPassword("");
      setIsDeleteMode(false);
      setDeleteConfirmName("");
    }
  }, [isOpen, user]);

  const isUpdating = isUpdatingProfile || isUpdatingEmail || isUpdatingPassword;

  // --- FUNGSI SUBMIT EDIT PROFIL ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      if (name !== user?.name) {
        await updateProfile({ name });
      }
      if (email !== user?.email) {
        await updateEmail(email);
      }
      if (password.trim() !== "") {
        await updatePassword(password);
      }
      onClose();
    } catch (error) {
      console.error(error);

      // PERUBAHAN: mapping pesan error teknis ke pesan yang lebih ramah pengguna
      const rawMessage = error?.message || "";
      const errorMessages = {
        "should be at least 8":
          "Kata sandi harus terdiri dari minimal 8 karakter",
      };

      const matchedKey = Object.keys(errorMessages).find((key) =>
        rawMessage.includes(key),
      );

      toast.error(
        matchedKey
          ? errorMessages[matchedKey]
          : rawMessage || "Terjadi kesalahan saat menyimpan data.",
      );
    }
  };

  // --- FUNGSI SUBMIT HAPUS AKUN ---
  const handleDeleteSubmit = async () => {
    if (deleteConfirmName !== user?.name) return;

    try {
      await deleteAccount();
      localStorage.clear();
      navigate("/login");
    } catch (error) {
      console.error(error);
      toast.error(error.message);
      setIsDeleteMode(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        // Mobile: items-end (nempel bawah) | Desktop (sm): items-center (tengah)
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md sm:p-4">
          {/* Background overlay bisa diklik untuk nutup (opsional) */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: "100%", scale: 1 }} // Muncul dari bawah
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-t-2xl sm:rounded-xl border border-white/10 bg-[#1e1e1e] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Garis kecil di atas laci khusus tampilan Mobile */}
            <div className="w-full flex justify-center pt-3 sm:hidden absolute top-0 left-0 z-10">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 pb-4 pt-8 sm:pt-4">
              <h2 className="text-lg font-semibold text-white">
                Pengaturan Akun
              </h2>
              <button
                onClick={onClose}
                disabled={isUpdating || isDeletingAccount}
                className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Area Scrollable agar bisa discroll di layar HP yang kecil */}
            <div className="overflow-y-auto">
              {/* --- FORM EDIT PROFIL UTAMA --- */}
              <form
                onSubmit={handleEditSubmit}
                className="p-[16px] flex flex-col gap-[16px]"
              >
                <div className="flex flex-col gap-[8px]">
                  <label className="text-[16px] font-medium text-gray-300">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-none border border-white/10 bg-white/5 px-[8px] py-[8px] text-[12px] text-white focus:border-[#C0FE04] focus:outline-none focus:ring-1 focus:ring-[#C0FE04] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-[8px]">
                  <label className="text-[16px] font-medium text-gray-300">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-none border border-white/10 bg-white/5 px-[8px] py-[8px] text-[12px] text-white focus:border-[#C0FE04] focus:outline-none focus:ring-1 focus:ring-[#C0FE04] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-[8px]">
                  <div>
                    {" "}
                    <label className="text-[16px] font-medium text-gray-300">
                      Password Baru
                    </label>
                    <p className="text-[12px] italic text-white/50 font-light">
                      Kosongkan jika tidak ingin mengubah password
                    </p>
                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-none border border-white/10 bg-white/5 px-[8px] py-[8px] text-[12px] text-white placeholder-gray-500 focus:border-[#C0FE04] focus:outline-none focus:ring-1 focus:ring-[#C0FE04] transition-all"
                    placeholder="*********"
                  />
                </div>

                <div className="mt-2 flex justify-end gap-3">
                  <RevealButton
                    type="button"
                    label="Batal"
                    bgAfter="bg-red-500"
                    textAfter="text-white"
                    onClick={onClose}
                    disable={isUpdating}
                    className="rounded-none"
                  ></RevealButton>
                  <RevealButton
                    type="submit"
                    icon={Save}
                    label={isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                    bgBefore="bg-[#C0FE04]"
                    bgAfter="bg-white"
                    textBefore="text-[#1e1e1e]"
                    disable={
                      isUpdating ||
                      (name === user?.name &&
                        email === user?.email &&
                        !password)
                    }
                    className="rounded-none"
                  >
                    {isUpdating && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e1e1e]" />
                    )}
                  </RevealButton>
                </div>
              </form>

              {/* --- AREA BERBAHAYA (DANGER ZONE) --- */}
              <div className="p-6 bg-red-950/10 border-t border-red-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-[16px] font-semibold text-red-500">
                    Area Berbahaya
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Tindakan ini tidak dapat dibatalkan. Seluruh data akun dan
                  toko Anda akan dihapus secara permanen dari sistem.
                </p>

                {/* Tombol pemicu buka tutup area konfirmasi */}
                <AnimatePresence mode="wait">
                  {!isDeleteMode && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <RevealButton
                        label="Hapus Akun Permanen"
                        type="button"
                        icon={Trash2}
                        onClick={() => setIsDeleteMode(true)}
                        className="w-full rounded-none"
                        bgBefore="bg-red-500"
                        bgAfter="bg-white"
                      ></RevealButton>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expandable Konfirmasi Nama dengan Smooth Animation */}
                <AnimatePresence>
                  {isDeleteMode && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-[8px] mt-2">
                        <label className="text-xs font-medium text-gray-300">
                          Ketik <strong>{user?.name}</strong> untuk konfirmasi
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmName}
                          onChange={(e) => setDeleteConfirmName(e.target.value)}
                          className="w-full rounded-none border border-red-500/50 bg-black/40 px-[8px] py-[8px] text-[12px] text-white placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-[16px]"
                          placeholder="Masukkan nama Anda dengan persis"
                        />
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <RevealButton
                          type="button"
                          onClick={() => setIsDeleteMode(false)}
                          disable={isDeletingAccount}
                          className="rounded-none "
                          bgAfter="bg-red-500"
                          label="batal"
                          textAfter="text-white"
                        >
                          Batal Hapus
                        </RevealButton>
                        <RevealButton
                          label="konfirmasi hapus"
                          bgBefore="bg-red-500"
                          bgAfter="bg-white"
                          onClick={handleDeleteSubmit}
                          disable={
                            deleteConfirmName !== user?.name ||
                            isDeletingAccount
                          }
                          className="rounded-none"
                        >
                          {isDeletingAccount && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </RevealButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
