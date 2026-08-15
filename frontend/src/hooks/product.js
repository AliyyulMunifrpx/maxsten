// hooks/store.js (tambahin)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { privateApi } from "../lib/axios.js";
import { getDashboard } from "./dashboard.js";
// src/hooks/product.js
// ...

// PERUBAHAN: fetcher mentah, dipanggil manual di luar react-query buat loop cari halaman
export async function fetchProductsPage(publicId, page) {
  const response = await privateApi.get(`/stores/${publicId}/products`, {
    params: { page },
  });
  return response.data;
}
export function useAllProducts(page = 1) {
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
  } = getDashboard(); // Pastikan ini hook getDashboard lu (kayaknya pakai useQuery kan?)

  const publicId = dashboardData?.data?.store?.public_id;

  const productsQuery = useQuery({
    queryKey: ["products", publicId, page],
    queryFn: () => fetchProductsPage(publicId, page),
    enabled: !!publicId,
  });

  // 🛑 EARLY RETURN: Tangkap error dashboard di sini!
  if (isDashboardError) {
    // Ambil pesan error asli dari backend (biasanya axios taro di response.data.errors)
    const backendMessage =
      dashboardError?.response?.data?.errors || dashboardError?.message;
    const statusCode = dashboardError?.response?.status;

    // Cek kalau backend bilang "Store not found" atau kode 404
    const isNoStore =
      statusCode === 404 || backendMessage === "Store not found";

    return {
      data: undefined,
      isLoading: false,
      isError: true,
      // 👇 Terjemahkan errornya jadi persis seperti yang dicari di ProductPage
      error: isNoStore ? new Error("Toko tidak ditemukan") : dashboardError,
      publicId: null,
    };
  }

  // ✅ Kalau normal, kembalikan gabungan statusnya
  return {
    ...productsQuery,
    isLoading:
      dashboardLoading ||
      (productsQuery.isLoading && productsQuery.fetchStatus !== "idle"),
    isError: productsQuery.isError,
    error: productsQuery.error,
    publicId,
  };
}
export function getProductDetail(productId) {
  return useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      const response = await privateApi.get(`/stores/products/${productId}`);
      return response.data;
    },
    enabled: !!productId,
    retry: false,
  });
}
export function useUpdateProductAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, is_available }) => {
      const response = await privateApi.patch(
        `/stores/products/${productId}/availability`,
        { is_available },
      );
      return response.data;
    },

    // Optimistic update: langsung ubah UI sebelum response API balik
    onMutate: async ({ productId, is_available }) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      await queryClient.cancelQueries({
        queryKey: ["product-detail", productId],
      });

      const previousProducts = queryClient.getQueriesData({
        queryKey: ["products"],
      });
      const previousDetail = queryClient.getQueryData([
        "product-detail",
        productId,
      ]);

      // update semua cache halaman produk yang lagi ke-cache
      queryClient.setQueriesData({ queryKey: ["products"] }, (old) => {
        if (!old?.data) return old;
        const patchList = (list) =>
          list?.map((p) => (p.id === productId ? { ...p, is_available } : p));
        return {
          ...old,
          data: {
            ...old.data,
            currentPage: patchList(old.data.currentPage),
            nextPage: patchList(old.data.nextPage),
          },
        };
      });

      // update cache detail produk kalau lagi kebuka
      queryClient.setQueryData(["product-detail", productId], (old) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, is_available } };
      });

      return { previousProducts, previousDetail, productId };
    },

    // Rollback kalau gagal
    onError: (err, variables, context) => {
      context?.previousProducts?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousDetail) {
        queryClient.setQueryData(
          ["product-detail", context.productId],
          context.previousDetail,
        );
      }
    },

    // Sinkron ulang ke data server yang sebenarnya
    onSettled: (data, error, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({
        queryKey: ["product-detail", productId],
      });
    },
  });
}
export function useUpdateProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, imageBlob }) => {
      const formData = new FormData();
      formData.append("image", imageBlob, "product.png");

      const response = await privateApi.patch(
        `/stores/products/${productId}/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return response.data;
    },
    onSuccess: (data, { productId }) => {
      const newImageUrl = data?.data?.image_url;
      queryClient.setQueriesData({ queryKey: ["products"] }, (old) => {
        if (!old?.data) return old;
        const patchList = (list) =>
          list?.map((p) =>
            p.id === productId ? { ...p, image_url: newImageUrl } : p,
          );
        return {
          ...old,
          data: {
            ...old.data,
            currentPage: patchList(old.data.currentPage),
            nextPage: patchList(old.data.nextPage),
          },
        };
      });
      queryClient.setQueryData(["product-detail", productId], (old) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, image_url: newImageUrl } };
      });
    },
    onError: (err, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: ["product-detail", productId],
      });
    },
  });
}
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, payload }) => {
      const response = await privateApi.patch(
        `/stores/products/${productId}`,
        payload,
      );
      return response.data;
    },
    onSuccess: (data, { productId }) => {
      const updated = data?.data;
      queryClient.setQueriesData({ queryKey: ["products"] }, (old) => {
        if (!old?.data) return old;
        const patchList = (list) =>
          list?.map((p) => (p.id === productId ? { ...p, ...updated } : p));
        return {
          ...old,
          data: {
            ...old.data,
            currentPage: patchList(old.data.currentPage),
            nextPage: patchList(old.data.nextPage),
          },
        };
      });
      queryClient.setQueryData(["product-detail", productId], (old) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updated } };
      });
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const response = await privateApi.post("/stores/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId) => {
      const response = await privateApi.delete(`/stores/products/${productId}`);
      return response.data;
    },
    onSuccess: (data, productId) => {
      // hapus produk dari semua cache halaman produk yang ke-cache
      queryClient.setQueriesData({ queryKey: ["products"] }, (old) => {
        if (!old?.data) return old;
        const removeFromList = (list) =>
          list?.filter((p) => p.id !== productId);
        return {
          ...old,
          data: {
            ...old.data,
            currentPage: removeFromList(old.data.currentPage),
            nextPage: removeFromList(old.data.nextPage),
            pagination: old.data.pagination
              ? {
                  ...old.data.pagination,
                  totalRows: Math.max(0, old.data.pagination.totalRows - 1),
                }
              : old.data.pagination,
          },
        };
      });
      // buang cache detail produk yang barusan dihapus
      queryClient.removeQueries({ queryKey: ["product-detail", productId] });
    },
  });
}
