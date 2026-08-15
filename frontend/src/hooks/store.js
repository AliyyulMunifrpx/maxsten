import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { privateApi, publicApi } from "../lib/axios.js";

export function usePostalCode(query) {
  return useQuery({
    queryKey: ["postal-code", query],
    queryFn: async () => {
      const response = await privateApi.get("/stores/postal-codes", {
        params: { postalCode: query },
      });
      return response.data;
    },
    enabled: query.length >= 3,
  });
}
export function createStore() {
  return useMutation({
    mutationFn: async (formValues) => {
      const formData = new FormData();
      formData.append("name", formValues.name);
      formData.append("street_address", formValues.street_address);
      formData.append("village", formValues.village);
      formData.append("district", formValues.district);
      formData.append("city", formValues.city);
      formData.append("province", formValues.province);
      formData.append("postal_code", formValues.postal_code);
      formData.append("latitude", formValues.latitude);
      formData.append("longitude", formValues.longitude);
      formData.append("timezone", formValues.timezone);
      if (formValues.logo) {
        formData.append("logo", formValues.logo);
      }
      if (formValues.description) {
        formData.append("description", formValues.description);
      }
      formData.append(
        "operational_hours",
        JSON.stringify(formValues.operational_hours),
      );

      const response = await privateApi.post("/stores", formData);
      return response.data;
    },
  });
}
export function openCloseStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ status, storeId }) => {
      const response = await privateApi.patch(`/stores/${storeId}/status`, {
        manual_status: status,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
export function useStoreProfile() {
  return useQuery({
    queryKey: ["store-profile"],
    queryFn: async () => {
      const response = await privateApi.get("/stores/me");
      return response.data;
    },
    retry: false,
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const response = await privateApi.patch("/stores/me", payload);
      return response.data;
    },
    onSuccess: (data) => {
      const updated = data?.data;
      queryClient.setQueryData(["store-profile"], (old) => ({
        ...old,
        data: updated,
      }));
      // sinkron field yang sama-sama ditampilkan di dashboard (nama, logo, dll)
      queryClient.setQueryData(["dashboard"], (old) => {
        if (!old?.data?.store) return old;
        return {
          ...old,
          data: {
            ...old.data,
            store: {
              ...old.data.store,
              name: updated.name,
              description: updated.description,
              is_open: updated.is_open,
            },
          },
        };
      });
    },
  });
}

export function useUpdateStoreLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (logoBlob) => {
      const formData = new FormData();
      formData.append("logo", logoBlob, "logo.png");
      const response = await privateApi.patch("/stores/me/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      const updated = data?.data;
      queryClient.setQueryData(["store-profile"], (old) => ({
        ...old,
        data: updated,
      }));
      queryClient.setQueryData(["dashboard"], (old) => {
        if (!old?.data?.store) return old;
        return {
          ...old,
          data: {
            ...old.data,
            store: { ...old.data.store, logo_url: updated.logo_url },
          },
        };
      });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await privateApi.delete("/stores/me");
      return response.data;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["store-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
export function useUpdateOperationalHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (operationalHours) => {
      const response = await privateApi.patch("/stores/me/operational-hours", {
        operational_hours: operationalHours,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const updatedHours = data?.data?.operational_hours ?? data?.data;
      queryClient.setQueryData(["store-profile"], (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: { ...old.data, operational_hours: updatedHours },
        };
      });
    },
  });
}
