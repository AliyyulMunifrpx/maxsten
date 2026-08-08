import { useMutation, useQuery } from "@tanstack/react-query";
import { privateApi, publicApi } from "../lib/axios.js";

export function getDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await privateApi.get("/stores/dashboard");
      return response.data;
    },
    retry: false,
  });
}
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
