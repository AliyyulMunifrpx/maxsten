import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createAddonGroup,
  editAddonGroup,
  getAddonGroups,
  deleteAddonGroup, // Pastikan ini sudah di-export di addonApi.js
} from "../../../lib/addonApi.js";

// =========================================================
// KOMPONEN UTAMA: HALAMAN DAFTAR ADDON GROUPS
// =========================================================
export default function AddonGroups() {
  const queryClient = useQueryClient();
  const {
    data: addonGroups,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["addonGroups"],
    queryFn: getAddonGroups,
  });

  // State untuk mengontrol Modal Form (Create/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // State untuk mengontrol Modal Konfirmasi Hapus
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  // Mutasi untuk Menghapus Grup Add-on
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAddonGroup(id),
    onSuccess: () => {
      toast.success("Grup add-on berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["addonGroups"] });
      setIsDeleteModalOpen(false);
      setGroupToDelete(null);
    },
    onError: (error) => {
      const message =
        error.response?.data?.errors || "Gagal menghapus grup add-on.";
      toast.error(message);
    },
  });

  const handleOpenCreate = () => {
    setSelectedGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (group) => {
    setGroupToDelete(group);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (groupToDelete) {
      deleteMutation.mutate(groupToDelete.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/seller"
          className="mb-6 inline-flex items-center text-sm font-semibold text-[#8A8375] transition hover:text-[#1C2321]"
        >
          &larr; Kembali ke Dashboard
        </Link>

        {/* HEADER & TAMBAH TOMBOL */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-[#1C2321] sm:text-3xl">
              Grup Add-on
            </h1>
            <p className="mt-1 text-sm text-[#8A8375]">
              Kelola pilihan tambahan (topping, level pedas, dll) untuk menu
              Anda.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="rounded-xl bg-[#147356] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F5C44]"
          >
            + Tambah Grup Add-on
          </button>
        </div>

        {/* AREA DAFTAR ADDON */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <div className="col-span-full flex h-40 items-center justify-center rounded-2xl border border-[#E4E1D8] bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E1D8] border-t-[#C98A1F]" />
            </div>
          )}

          {isError && (
            <div className="col-span-full rounded-2xl border border-[#F1CFC7] bg-[#FBEAE7] p-6 text-center text-[#B23A2E] font-bold">
              Gagal memuat data grup add-on.
            </div>
          )}

          {!isLoading && !isError && addonGroups?.length === 0 && (
            <div className="col-span-full rounded-2xl border border-[#E4E1D8] bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1EFE9] text-2xl">
                🧀
              </div>
              <p className="text-sm font-semibold text-[#1C2321]">
                Belum ada grup add-on
              </p>
              <p className="mt-1 text-xs text-[#8A8375]">
                Buat grup add-on pertamamu agar pelanggan punya banyak pilihan!
              </p>
            </div>
          )}

          {addonGroups?.map((group) => (
            <div
              key={group.id}
              className="flex flex-col justify-between rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div>
                <h3 className="mb-1 text-lg font-bold text-[#1C2321]">
                  {group.name}
                </h3>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8A8375]">
                  {group.addons.length} Pilihan
                </p>
                <ul className="mb-4 space-y-1">
                  {group.addons.slice(0, 3).map((addon) => (
                    <li key={addon.id} className="flex justify-between text-sm">
                      <span className="text-[#1C2321]">{addon.name}</span>
                      <span className="font-mono font-medium text-[#147356]">
                        +{addon.price.toLocaleString("id-ID")}
                      </span>
                    </li>
                  ))}
                  {group.addons.length > 3 && (
                    <li className="text-xs italic text-[#8A8375]">
                      Dan {group.addons.length - 3} lainnya...
                    </li>
                  )}
                </ul>
              </div>

              {/* TOMBOL EDIT & DELETE */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(group)}
                  className="flex-1 rounded-xl border border-[#E4E1D8] py-2 text-sm font-bold text-[#1C2321] transition hover:bg-[#F7F7F7]"
                >
                  Edit Grup
                </button>
                <button
                  onClick={() => handleOpenDelete(group)}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[#FBEAE7] text-[#B23A2E] transition hover:bg-[#F1CFC7]"
                  title="Hapus Grup"
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
            </div>
          ))}
        </div>
      </div>

      {/* RENDER MODAL FORM KONDISIONAL */}
      {isModalOpen && (
        <AddonFormModal
          initialData={selectedGroup}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* MODAL KONFIRMASI DELETE */}
      {isDeleteModalOpen && groupToDelete && (
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
              <h2 className="text-xl font-bold text-[#1C2321]">Hapus Grup?</h2>
            </div>
            <p className="mb-6 text-sm text-[#8A8375]">
              Apakah Anda yakin ingin menghapus grup add-on{" "}
              <strong className="text-[#1C2321]">"{groupToDelete.name}"</strong>
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
// KOMPONEN MODAL FORM (Gabungan Create & Edit dengan RHF)
// =========================================================
function AddonFormModal({ initialData, onClose }) {
  const queryClient = useQueryClient();
  const isEditMode = !!initialData;

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      addons: [{ name: "", price: "" }],
    },
    values: isEditMode
      ? {
          name: initialData.name,
          addons: initialData.addons.length
            ? initialData.addons.map((a) => ({
                id: a.id,
                name: a.name,
                price: a.price,
              }))
            : [{ name: "", price: "" }],
        }
      : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addons",
  });

  const mutation = useMutation({
    mutationFn: isEditMode ? editAddonGroup : createAddonGroup,
    onSuccess: () => {
      toast.success(
        isEditMode
          ? "Grup add-on berhasil diperbarui!"
          : "Grup add-on berhasil ditambahkan!",
      );
      queryClient.invalidateQueries({ queryKey: ["addonGroups"] });
      onClose();
    },
    onError: (error) => {
      const message =
        error.response?.data?.errors || "Gagal menyimpan grup add-on.";
      toast.error(message);
    },
  });

  const onSubmit = (formData) => {
    const payload = {
      name: formData.name,
      addons: formData.addons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: Number(addon.price) || 0,
      })),
    };

    if (isEditMode) {
      payload.id = initialData.id;
    }

    mutation.mutate(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E4E1D8] bg-[#FCFBF9] px-6 py-4">
          <h2 className="text-xl font-bold text-[#1C2321]">
            {isEditMode ? "Edit Grup Add-on" : "Tambah Grup Add-on"}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold leading-none text-[#8A8375] hover:text-[#B23A2E]"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form
            id="addon-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div>
              <label className="mb-2 block text-sm font-bold text-[#1C2321]">
                Nama Grup Add-on
              </label>
              <input
                type="text"
                {...register("name", { required: true })}
                placeholder="Contoh: Ekstra Sambal, Topping Minuman"
                className="w-full rounded-xl border border-[#D8D3C4] px-4 py-3 outline-none focus:border-[#C98A1F] focus:ring-1 focus:ring-[#C98A1F]"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E4E1D8] pb-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1C2321]">
                    Daftar Pilihan
                  </h3>
                  <p className="text-xs text-[#8A8375]">
                    Tambahkan variasi yang bisa dipilih pelanggan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => append({ name: "", price: "" })}
                  className="rounded-full bg-[#E7F3EC] px-4 py-1.5 text-xs font-bold text-[#147356] transition hover:bg-[#147356] hover:text-white"
                >
                  + Tambah Pilihan
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex flex-col gap-2 rounded-xl border border-[#E4E1D8] bg-[#FAF9F6] p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        {...register(`addons.${index}.name`, {
                          required: true,
                        })}
                        placeholder="Nama pilihan (Cth: Boba)"
                        className="w-full rounded-lg border border-[#D8D3C4] bg-white px-3 py-2 text-sm outline-none focus:border-[#C98A1F]"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-[#8A8375]">
                          Rp
                        </span>
                        <input
                          type="number"
                          min="0"
                          {...register(`addons.${index}.price`, {
                            required: true,
                          })}
                          placeholder="0"
                          className="w-full rounded-lg border border-[#D8D3C4] bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#C98A1F]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="flex h-9 w-full shrink-0 items-center justify-center rounded-lg bg-[#FBEAE7] text-sm font-bold text-[#B23A2E] transition hover:bg-[#F1CFC7] disabled:opacity-40 sm:w-10"
                      title="Hapus"
                    >
                      <span className="sm:hidden">Hapus</span>
                      <span className="hidden sm:inline">&times;</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-3 border-t border-[#E4E1D8] bg-[#FCFBF9] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending || isSubmitting}
            className="flex-1 rounded-xl border border-[#E4E1D8] bg-white py-3 text-sm font-bold text-[#1C2321] transition hover:bg-[#F7F7F7] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="addon-form"
            disabled={mutation.isPending || isSubmitting}
            className="flex-[2] rounded-xl bg-[#147356] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F5C44] disabled:opacity-60"
          >
            {mutation.isPending || isSubmitting
              ? "Menyimpan..."
              : "Simpan Grup Add-on"}
          </button>
        </div>
      </div>
    </div>
  );
}
