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
export const getAddonGroups = async () => {
  const response = await apiPrivate.get(`/stores/get-addon-groups`);
  return response.data.data;
};
export const createAddonGroup = async (data) => {
  const response = await apiPrivate.post(`/stores/addon-groups`, data);
  return response.data;
};
export const deleteAddonGroup = async (addonGroupId) => {
  const response = await apiPrivate.patch(
    `/delete-addon-group/${addonGroupId}`,
  );
  return response.data.data;
};
