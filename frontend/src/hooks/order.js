// src/hooks/queue.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { privateApi } from "../lib/axios.js";
import { getDashboard } from "./dashboard.js";

// PERUBAHAN: fetcher mentah, dipanggil manual di luar react-query buat loop cari halaman
export async function fetchQueuesPage(publicId, page) {
  const response = await privateApi.get(`/stores/${publicId}/queues`, {
    params: { page },
  });
  return response.data;
}

export function useStoreQueues(page = 1) {
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
  } = getDashboard();

  const publicId = dashboardData?.data?.store?.public_id;

  const queuesQuery = useQuery({
    queryKey: ["store-queues", publicId, page],
    queryFn: () => fetchQueuesPage(publicId, page), // PERUBAHAN: reuse fetcher di atas
    enabled: !!publicId,
  });

  return {
    ...queuesQuery,
    isLoading:
      dashboardLoading ||
      (queuesQuery.isLoading && queuesQuery.fetchStatus !== "idle"),
    isError: isDashboardError || queuesQuery.isError,
    error: dashboardError || queuesQuery.error,
    publicId, // PERUBAHAN: expose publicId buat loop di orders-page.jsx
  };
}
export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ queueId, storeId, status, reason }) => {
      const response = await privateApi.patch(`/stores/queues/${queueId}`, {
        storeId,
        status,
        ...(reason ? { reason } : {}),
      });
      return response.data;
    },
    onSuccess: () => {
      // status berubah bisa geser urutan FIFO / hilang dari daftar aktif —
      // gak worth optimistic patch manual, langsung invalidate & refetch
      queryClient.invalidateQueries({ queryKey: ["store-queues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
