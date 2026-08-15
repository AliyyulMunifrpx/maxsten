import { useQuery } from "@tanstack/react-query";
import { privateApi } from "../lib/axios.js";

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
