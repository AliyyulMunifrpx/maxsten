import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { editAddonGroup, getAddonGroup } from "../../../lib/addonApi.js";

export default function EditAddon() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 1. Inisialisasi React Hook Form
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      addons: [{ name: "", price: "" }],
    },
  });

  // 2. Setup useFieldArray untuk mengurus array dinamis (tambah/hapus addon)
  const { fields, append, remove } = useFieldArray({
    control,
    name: "addons",
  });

  // 3. Fetch data addon group lama
  const { data, isLoading, isError } = useQuery({
    queryKey: ["addonGroup", id],
    queryFn: () => getAddonGroup(id),
  });
 console.log(data)
  // 4. Isi form otomatis ketika data berhasil di-fetch
  useEffect(() => {
    if (data) {
      // Pastikan menyesuaikan dengan response backend (data.addon atau data.addons)
      const existingAddons = (data.addons || []).map((item) => ({
        id: item.id, // Simpan ID database agar backend tahu ini update
        name: item.name,
        price: item.price,
      }));

      reset({
        name: data.name,
        addons: existingAddons.length > 0 ? existingAddons : [{ name: "", price: "" }],
      });
    }
  }, [data, reset]);

  // 5. Mutation untuk Update
  const mutation = useMutation({
    mutationFn: editAddonGroup,
    onSuccess: () => {
      toast.success("Grup add-on berhasil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["addonGroups"] });
      queryClient.invalidateQueries({ queryKey: ["addonGroup", id] });
      navigate("/seller");
    },
    onError: (error) => {
      const message = error.response?.data?.errors || "Gagal memperbarui grup add-on.";
      toast.error(message);
    },
  });

  // 6. Handler submit dari React Hook Form
  const onSubmit = (formData) => {
    const payload = {
      id,
      name: formData.name,
      addons: formData.addons.map((addon) => {
        const itemData = {
          name: addon.name,
          price: Number(addon.price) || 0,
        };

        // Jika ada id dari database, sertakan (agar di-update, bukan di-create)
        if (addon.id) {
          itemData.id = addon.id;
        }

        return itemData;
      }),
    };

    mutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6]">
        <p className="text-[#1C2321] font-semibold">Memuat data add-on...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6]">
        <p className="text-red-500 font-semibold">
          Gagal memuat data add-on. Silakan coba lagi.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#E4E1D8] bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-[#1C2321] mb-6">Edit Grup Add-on</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#1C2321] mb-2">
              Nama Grup Add-on
            </label>
            <input
              type="text"
              {...register("name", { required: true })}
              placeholder="Cth: Tambahan Topping"
              className="w-full rounded-xl border border-[#D8D3C4] px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1C2321]">Daftar Add-on</h3>
              <button
                type="button"
                onClick={() => append({ name: "", price: "" })} // Fitur append dari RHF
                className="rounded-full bg-[#147356] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F5C44]"
              >
                + Tambah Pilihan
              </button>
            </div>

            {/* Loop menggunakan fields dari useFieldArray */}
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <input
                    type="text"
                    {...register(`addons.${index}.name`, { required: true })}
                    placeholder="Nama add-on"
                    className="w-full rounded-xl border border-[#D8D3C4] px-4 py-3 outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min="0"
                    {...register(`addons.${index}.price`, { required: true })}
                    placeholder="Harga add-on"
                    className="w-full rounded-xl border border-[#D8D3C4] px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)} // Fitur remove dari RHF
                  className="h-fit self-center rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500"
                  disabled={fields.length === 1}
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={mutation.isPending || isSubmitting}
            className="w-full rounded-2xl bg-[#147356] px-4 py-3 text-white font-semibold shadow-sm transition hover:bg-[#0F5C44] disabled:opacity-60"
          >
            {mutation.isPending ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </div>
  );
}