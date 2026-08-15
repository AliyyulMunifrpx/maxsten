// src/hooks/buyer.js
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buyerApi } from "../lib/guest-axios.js";

export function useStoreCatalog(storeId, { page = 1, keyword = "" } = {}) {
  return useQuery({
    queryKey: ["store-catalog", storeId, page, keyword],
    queryFn: async () => {
      const response = await buyerApi.get(`/stores/${storeId}/products`, {
        params: { page, ...(keyword ? { keyword } : {}) },
      });
      return response.data;
    },
    enabled: !!storeId,
    retry: false,
    placeholderData: keepPreviousData,
  });
}
export function useCreateQueue(storeId) {
  return useMutation({
    mutationFn: async (payload) => {
      const response = await buyerApi.post(
        `/stores/${storeId}/queues`,
        payload,
      );
      return response.data;
    },
  });
}
export function useQueueDetail(storeId, queueId) {
  return useQuery({
    queryKey: ["buyer-queue-detail", storeId, queueId],
    queryFn: async () => {
      const response = await buyerApi.get(
        `/stores/${storeId}/queues/${queueId}`,
      );
      return response.data;
    },
    enabled: !!storeId && !!queueId,
    retry: false,
    refetchInterval: 15000, // polling ringan — belum ada socket buat buyer, jadi status di-refresh berkala
  });
}

export function useCancelQueueBuyer(storeId, queueId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason) => {
      const response = await buyerApi.patch(
        `/stores/${storeId}/queues/${queueId}/cancel`,
        { reason },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["buyer-queue-detail", storeId, queueId],
      });
    },
  });
}
export const useProductDetail = (storeId, productId) => {
  return useQuery({
    // queryKey ini penting buat cache, biar gak nembak API terus
    queryKey: ["product-detail", storeId, productId],
    queryFn: async () => {
      // ✅ PASTIIN ENDPOINT INI SAMA DENGAN YG DI BACKEND
      const res = await buyerApi.get(
        `/stores/${storeId}/products/${productId}`,
      );
      return res.data;
    },
    // Biar gak fetch kalau storeId atau productId belom ada
    enabled: !!storeId && !!productId,
    staleTime: 1000 * 60 * 5, // Data dianggap fresh selama 5 menit
  });
};
