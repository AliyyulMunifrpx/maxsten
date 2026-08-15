// src/hooks/addon.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { privateApi } from "../lib/axios.js";

export function useAddonGroups() {
  return useQuery({
    queryKey: ["addon-groups"],
    queryFn: async () => {
      
      const response = await privateApi.get("/stores/addon-groups");
      return response.data;
    },
    retry: false,
  });
}

export function useAddonGroupDetail(addonGroupId) {
  return useQuery({
    queryKey: ["addon-group-detail", addonGroupId],
    queryFn: async () => {
      const response = await privateApi.get(
        `/stores/addon-groups/${addonGroupId}`,
      );
      return response.data;
    },
    enabled: !!addonGroupId,
    retry: false,
  });
}

export function useCreateAddonGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const response = await privateApi.post("/stores/addon-groups", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addon-groups"] });
    },
  });
}

export function useUpdateAddonGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ addonGroupId, payload }) => {
      const response = await privateApi.patch(
        `/stores/addon-groups/${addonGroupId}`,
        payload,
      );
      return response.data;
    },
    onSuccess: (data, { addonGroupId }) => {
      queryClient.invalidateQueries({ queryKey: ["addon-groups"] });
      queryClient.setQueryData(["addon-group-detail", addonGroupId], (old) => {
        if (!old?.data) return old;
        return { ...old, data: data?.data };
      });
    },
  });
}

export function useDeleteAddonGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (addonGroupId) => {
      const response = await privateApi.delete(
        `/stores/addon-groups/${addonGroupId}`,
      );
      return response.data;
    },
    onSuccess: (data, addonGroupId) => {
      queryClient.setQueryData(["addon-groups"], (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((g) => g.id !== addonGroupId) };
      });
      queryClient.removeQueries({
        queryKey: ["addon-group-detail", addonGroupId],
      });
    },
  });
}
