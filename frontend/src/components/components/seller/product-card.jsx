import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { updateProductAvailability } from "../../../lib/sellerApi.js";

export default function ProductCard({ product, backendUrl }) {
  const queryClient = useQueryClient();

  // Mutasi untuk toggle status stok
  const mutation = useMutation({
    mutationFn: updateProductAvailability,
    onSuccess: () => {
      toast.success("Status stok produk berhasil diperbarui");
      // Refresh data toko biar UI dashboard langsung sinkron
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
    },
    onError: () => {
      toast.error("Gagal memperbarui status stok.");
    }
  });

  const handleToggleStock = () => {
    mutation.mutate({
      productId: product.id,
      is_available: !product.is_available // Balikkan statusnya (true jadi false, vice versa)
    });
  };

  return (
    <div 
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
        // Kalau stok habis, bikin agak redup warnanya
        !product.is_available ? "border-[#E4E1D8] opacity-65 bg-[#FAF9F6]" : "border-[#E4E1D8]"
      }`}
    >
      {/* Bagian Gambar */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#F1EFE9]">
        {product.image_url ? (
          <img src={`${backendUrl}${product.image_url}`} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
        )}
        
        {/* Badge Penanda di Gambar */}
        {!product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <span className="rounded-lg bg-[#B23A2E] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-md">
              Stok Habis
            </span>
          </div>
        )}
      </div>

      {/* Bagian Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-bold text-[#1C2321]">{product.name}</h3>
        <p className="mt-1 font-mono text-sm font-bold text-[#147356]">
          Rp {product.price.toLocaleString("id-ID")}
        </p>

        {/* Tombol Aksi Kontrol */}
        <div className="mt-4 flex gap-2 pt-2">
          {/* Tombol Toggle Stok */}
          <button
            onClick={handleToggleStock}
            disabled={mutation.isPending}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              product.is_available
                ? "bg-white border border-[#E4E1D8] text-[#8A8375] hover:bg-gray-50"
                : "bg-[#147356] text-white hover:bg-[#0F5C44]"
            }`}
          >
            {mutation.isPending ? "..." : product.is_available ? "Set Habis" : "Set Ada Stok"}
          </button>

          {/* Tombol Edit */}
          <Link
            to={`/seller/products/${product.id}/edit`}
            className="rounded-lg bg-[#1C2321] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#333B38] flex items-center"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}