import { apiPrivate } from "./api.js";

export const generateAiReport = async (month, year) => {
  const response = await apiPrivate.post("/ai-report-generator", {
    month,
    year,
  });
  return response.data.data; 
};
