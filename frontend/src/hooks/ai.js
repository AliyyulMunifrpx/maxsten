import { useMutation } from "@tanstack/react-query";
import { privateApi } from "../lib/axios.js";

export function useGenerateDescription() {
  return useMutation({
    mutationFn: async ({ productName }) => {
      const response = await privateApi.post("/ai/descriptions", {
        product_name: productName,
      });
      return response.data;
    },
  });
}
export function useGenerateAIReport() {
  return useMutation({
    mutationFn: async ({ month, year }) => {
      const response = await privateApi.post("/ai/reports", { month, year });
      return response.data;
    },
  });
}
