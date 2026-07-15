import { apiPrivate } from "./api.js";

export const getAddonGroup = async (addonId) => {
  const response = await apiPrivate.get(`/addon-groups/${addonId}`);
  return response.data.data;
};
export const editAddonGroup = async (payload) => {
  const { id, ...data } = payload;
  const response = await apiPrivate.patch(`/addon-group/edit/${id}`, data);
  return response.data.data;
};
