import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createCancelReasonApi,
  deleteCancelReason,
  getCancelReasons,
  updateCancelReasonApi,
} from "../../../lib/sellerApi.js";

// =========================================================
// KOMPONEN UTAMA: HALAMAN DAFTAR ALASAN
// =========================================================
export default function CancelReasons() {
  const queryClient = useQueryClient();
  const {
    data: reasons,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["cancelReasons"],
    queryFn: getCancelReasons,
  });

  // State untuk mengontrol Modal Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null); // null = mode Create, isi data = mode Edit

  // State untuk mengontrol Modal Konfirmasi Hapus
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState(null);

  // Mutasi untuk Menghapus Alasan
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCancelReason(id),
    onSuccess: () => {
      toast.success("Alasan pembatalan berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["cancelReasons"] });
      setIsDeleteModalOpen(false);
      setReasonToDelete(null);
    },
    onError: (error) => {
      const message = error.response?.data?.errors || "Gagal menghapus alasan.";
      toast.error(message);
    },
  });

  // Fungsi Buka Modal Tambah
  const handleOpenCreate = () => {
    setSelectedReason(null);
    setIsModalOpen(true);
  };

  // Fungsi Buka Modal Edit
  const handleOpenEdit = (reasonItem) => {
    setSelectedReason(reasonItem);
    setIsModalOpen(true);
  };

  // Fungsi Buka Modal Hapus
  const handleOpenDelete = (reasonItem) => {
    setReasonToDelete(reasonItem);
    setIsDeleteModalOpen(true);
  };

  // Eksekusi Hapus
  const handleConfirmDelete = () => {
    if (reasonToDelete) {
      deleteMutation.mutate(reasonToDelete.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/seller"
          className="mb-6 inline-flex items-center text-sm font-semibold text-[#8A8375] transition hover:text-[#1C2321]"
        >
          &larr; Kembali ke Dashboard
        </Link>

        {/* HEADER */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-[#1C2321] sm:text-3xl">
              Alasan Pembatalan
            </h1>
            <p className="mt-1 text-sm text-[#8A8375]">
              Atur template alasan saat kamu menolak pesanan pelanggan.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="rounded-xl bg-[#147356] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F5C44]"
          >
            + Tambah Alasan
          </button>
        </div>

        {/* AREA LIST */}
        <div className="overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white shadow-sm">
          {isLoading && (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E1D8] border-t-[#C98A1F]" />
            </div>
          )}

          {isError && (
            <div className="flex h-40 items-center justify-center p-6 text-center">
              <p className="font-bold text-[#B23A2E]">Gagal memuat data.</p>
            </div>
          )}

          {!isLoading && !isError && (
            <ul className="divide-y divide-[#E4E1D8]">
              {!reasons || reasons.length === 0 ? (
                <li className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1EFE9] text-2xl">
                    📝
                  </div>
                  <p className="text-sm font-semibold text-[#1C2321]">
                    Belum ada template alasan
                  </p>
                </li>
              ) : (
                reasons.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between p-5 transition hover:bg-[#FAF9F6]/50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1EFE9] text-xs font-bold text-[#8A8375]">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium text-[#1C2321]">
                        {item.reason}
                      </p>
                    </div>

                    {/* TOMBOL EDIT & DELETE */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-[#C98A1F] transition hover:bg-[#FCEFDA]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleOpenDelete(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEAE7] text-[#B23A2E] transition hover:bg-[#F1CFC7]"
                        title="Hapus Alasan"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {/* RENDER MODAL FORM KONDISIONAL (CREATE/EDIT) */}
      {isModalOpen && (
        <ReasonFormModal
          initialData={selectedReason}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* MODAL KONFIRMASI DELETE */}
      {isDeleteModalOpen && reasonToDelete && (
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
                Hapus Alasan?
              </h2>
            </div>
            <p className="mb-6 text-sm text-[#8A8375]">
              Apakah Anda yakin ingin menghapus alasan{" "}
              <strong className="text-[#1C2321]">
                "{reasonToDelete.reason}"
              </strong>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl border border-[#E4E1D8] bg-white py-2.5 text-sm font-bold text-[#1C2321] transition hover:bg-[#F7F7F7] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
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

// =========================================================
// KOMPONEN MODAL: KHUSUS FORM CREATE & UPDATE (Bebas useEffect!)
// =========================================================
function ReasonFormModal({ initialData, onClose }) {
  const queryClient = useQueryClient();

  const [reasonText, setReasonText] = useState(initialData?.reason || "");
  const isEditMode = !!initialData;

  const mutation = useMutation({
    mutationFn: isEditMode ? updateCancelReasonApi : createCancelReasonApi,
    onSuccess: () => {
      toast.success(
        isEditMode ? "Alasan berhasil diubah!" : "Alasan berhasil ditambahkan!",
      );
      queryClient.invalidateQueries({ queryKey: ["cancelReasons"] });
      onClose(); // Tutup modal kalau sukses
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal menyimpan alasan.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reasonText.trim()) return toast.error("Alasan tidak boleh kosong!");

    const payload = isEditMode
      ? { id: initialData.id, reason: reasonText }
      : { reason: reasonText };

    mutation.mutate(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-[#1C2321]">
          {isEditMode ? "Edit Alasan" : "Tambah Alasan"}
        </h2>

        <form onSubmit={handleSubmit}>
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Contoh: Stok bahan baku sedang habis..."
            rows="3"
            className="w-full resize-none rounded-xl border border-[#E4E1D8] bg-[#FAF9F6] p-3 text-sm outline-none transition focus:border-[#C98A1F] focus:bg-white focus:ring-1 focus:ring-[#C98A1F]"
            autoFocus
          />

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1 rounded-xl border border-[#E4E1D8] py-2.5 text-sm font-bold text-[#1C2321] transition hover:bg-[#F7F7F7] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-[#147356] py-2.5 text-sm font-bold text-white transition hover:bg-[#0F5C44] disabled:opacity-50"
            >
              {mutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
