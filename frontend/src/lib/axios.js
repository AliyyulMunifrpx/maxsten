import axios from "axios";

// ================================
// Public API
// ================================
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ================================
// Private API
// ================================
export const privateApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

const errorMap = {
  "Incorrect email or password": "Email atau password salah",
  "not verified": "Email belum diverifikasi",
  "User not found": "Akun tidak ditemukan",
  "already exists": "Email sudah terdaftar",
  Unauthorized: "Sesi kamu sudah berakhir, silakan login lagi",
  "Store not found": "Toko tidak ditemukan",
  "Product not found": "Produk tidak ditemukan",
};

function translateError(originalMsg) {
  if (!originalMsg) return "Terjadi kesalahan, silakan coba lagi";

  const found = Object.entries(errorMap).find(([key]) =>
    originalMsg.toLowerCase().includes(key.toLowerCase()),
  );

  return found ? found[1] : originalMsg;
}

// =======================================
// REQUEST INTERCEPTOR
// =======================================

privateApi.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (refreshToken) {
    config.headers["x-refresh-token"] = refreshToken;
  }

  return config;
});

// =======================================
// RESPONSE INTERCEPTOR
// =======================================

const onSuccess = (response) => {
  const newAccessToken = response.headers["x-new-access-token"];
  const newRefreshToken = response.headers["x-new-refresh-token"];

  if (newAccessToken) {
    localStorage.setItem("access_token", newAccessToken);
  }

  if (newRefreshToken) {
    localStorage.setItem("refresh_token", newRefreshToken);
  }

  return response;
};

const onError = (error) => {
  const originalMsg = error.response?.data?.errors;

  // Kalau session habis, bersihkan token
  if (error.response?.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  error.message = translateError(originalMsg);

  return Promise.reject(error);
};

publicApi.interceptors.response.use(onSuccess, onError);
privateApi.interceptors.response.use(onSuccess, onError);