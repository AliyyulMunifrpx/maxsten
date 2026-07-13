import { apiPublic } from "../api.js";

export const userRegister = async (data) => {
  const response = await apiPublic.post("/users", data);
  return response.data;
};
export const userLogin = async (data) => {
  const response = await apiPublic.post("/users/login", data);
  return response.data;
};
