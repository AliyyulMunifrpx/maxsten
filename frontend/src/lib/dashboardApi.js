import { apiPrivate } from "./api.js";

export const getDashboard = async () => {
  const response = await apiPrivate.get(`/dashboard`);
  return response.data.data;
};
