// src/hooks/analytics.js
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { privateApi } from "../lib/axios.js";

export function useStoreHistory({
  month,
  year,
  status = "ALL",
  page = 1,
  limit = 10,
  topPage = 1,
  topLimit = 10,
}) {
  return useQuery({
    queryKey: [
      "store-history",
      month,
      year,
      status,
      page,
      limit,
      topPage,
      topLimit,
    ],
    queryFn: async () => {

      const response = await privateApi.get("/stores/me/history", {
        params: { month, year, status, page, limit, topPage, topLimit },
      });
      return response.data;
    },
    retry: false,

    placeholderData: keepPreviousData,
  });
}
