import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import ProductCard from "../../components/seller/product-card.jsx";
import { getAllProducts } from "../../../lib/productApi.js";

export default function AllProduct() {
  const backendUrl = import.meta.env.VITE_API_PATH.replace("/api", "");
  const { publicId } = useParams();
  const {
    data: products,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["productsMe"],
    queryFn: () => getAllProducts(publicId),
  });
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E4E1D8] border-t-[#C98A1F]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] p-4">
        <div className="rounded-3xl border border-[#D8D3C4] bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#8A8375]">
            Terjadi kesalahan saat memuat produk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C98A1F]">
              Daftar Produk
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[#1C2321] sm:text-3xl">
              Semua Produk
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#8A8375]">
              Kelola produk toko kamu di halaman ini. Gunakan tombol edit untuk
              memperbarui informasi produk.
            </p>
          </div>
          <Link
            to="/seller/create-product"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#1C2321] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#333B38]"
          >
            + Tambah Produk
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D8D3C4] bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-[#8A8375]">
              Belum ada produk. Tambahkan produk baru untuk mulai jualan.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                backendUrl={backendUrl}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
