import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createCancelReasonApi } from "../../../lib/sellerApi.js";

export default function CreateCancelReason() {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  


  const mutation = useMutation({
    mutationFn: createCancelReasonApi,
    onSuccess: () => {
      toast.success("Alasan pembatalan berhasil ditambahkan!");
      setReason("");
      
      // Refresh daftar alasan (kalau lu udah bikin API GET-nya nanti)
      queryClient.invalidateQueries(["cancelReasons"]); 
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.errors || "Gagal menambahkan alasan.";
      toast.error(errorMsg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      return toast.error("Alasan tidak boleh kosong.");
    }
    mutation.mutate({reason});
  };

  return (
    <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-sm sm:p-6 max-w-md">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1C2321]">
          Tambah Alasan Pembatalan
        </h2>
        <p className="mt-1 text-xs text-[#8A8375]">
          Buat template alasan (*dropdown*) agar mempercepat proses kasir membatalkan pesanan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="reason" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#1C2321]">
            Template Alasan Baru
          </label>
          <input
            id="reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Stok bahan baku habis..."
            maxLength={255}
            disabled={mutation.isPending}
            className="w-full rounded-xl border border-[#E4E1D8] bg-[#FAF9F6] p-3 text-sm outline-none transition focus:border-[#C98A1F] focus:bg-white focus:ring-1 focus:ring-[#C98A1F] disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || !reason.trim()}
          className="w-full rounded-xl bg-[#1C2321] py-3 text-sm font-bold text-white transition hover:bg-[#333B38] disabled:opacity-50"
        >
          {mutation.isPending ? "Menyimpan..." : "Simpan Alasan"}
        </button>
      </form>
    </div>
  );
}