// src/hooks/cancel-reason.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { privateApi } from "../lib/axios.js";

export function useCancelReasons() {
  return useQuery({
    queryKey: ["cancel-reasons"],
    queryFn: async () => {

      const response = await privateApi.get("/seller/cancel-reasons");
      return response.data;
    },
    retry: false,
  });
}

export function useCreateCancelReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason) => {
      const response = await privateApi.post("/seller/cancel-reasons", {
        reason,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["cancel-reasons"], (old) => {
        if (!old?.data) return old;
        return { ...old, data: [data.data, ...old.data] };
      });
    },
  });
}

export function useUpdateCancelReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reasonId, reason }) => {
      const response = await privateApi.patch(
        `/seller/cancel-reasons/${reasonId}`,
        { reason },
      );
      return response.data;
    },
    onSuccess: (data, { reasonId }) => {
      queryClient.setQueryData(["cancel-reasons"], (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((r) => (r.id === reasonId ? data.data : r)),
        };
      });
    },
  });
}

export function useDeleteCancelReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reasonId) => {
      const response = await privateApi.delete(
        `/seller/cancel-reasons/${reasonId}`,
      );
      return response.data;
    },
    onSuccess: (data, reasonId) => {
      queryClient.setQueryData(["cancel-reasons"], (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((r) => r.id !== reasonId) };
      });
    },
  });
}
