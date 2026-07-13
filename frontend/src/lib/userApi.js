import { apiPrivate, apiPublic } from "./api.js";

export const userRegister = async (data) => {
  const response = await apiPublic.post("/users", data);
  return response.data;
};
export const userLogin = async (data) => {
  const response = await apiPublic.post("/users/login", data);
  return response.data;
};
// Ambil data user yang lagi login
export const getUserProfile = async () => {
  const response = await apiPrivate.get("/users/me");
  return response.data.data;
};

// Update data user (nama / password)
export const updateUserProfile = async (data) => {
  const response = await apiPrivate.patch("/users/me", data);
  return response.data;
};

// Logout
export const logoutUser = async () => {
  const response = await apiPrivate.delete("/users/logout");
  return response.data;
};
