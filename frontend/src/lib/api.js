import axios from "axios";

const defaultConfig = {
  baseURL: `${import.meta.env.VITE_API_PATH}`,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
};

// Buat API publik (Login, Register, get Public Data)
export const apiPublic = axios.create({
  ...defaultConfig,
  withCredentials: true,
});

// Buat API privat yang butuh Cookie/Token (Get Profile, Create Product)
export const apiPrivate = axios.create({
  ...defaultConfig,
  withCredentials: true,
});
