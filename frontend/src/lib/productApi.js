import { apiPrivate } from "./api.js";

export const getProduct = async (productId) => {
  const response = await apiPrivate.get(`/product/${productId}`);
  return response.data.data;
};
export const getAllProducts = async (publicId) => {
  const response = await apiPrivate.get(`/all-products/${publicId}`);
  return response.data.data;
};
export const deleteProduct = async (productId) => {
  const response = await apiPrivate.patch(`/delete-product/${productId}`);
  return response.data.data;
};
