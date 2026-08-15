// src/lib/guest-axios.js
import axios from "axios";

const GUEST_ID_KEY = "maxsten_guest_id";

export function getGuestId() {
  return localStorage.getItem(GUEST_ID_KEY);
}

function setGuestId(id) {
  if (id) localStorage.setItem(GUEST_ID_KEY, id);
}

// ✅ NAMA DIUBAH JADI buyerApi
export const buyerApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// =======================================
// ERROR TRANSLATOR
// =======================================
const errorMap = {
  "store not found": "Toko tidak ditemukan",
  "product not found": "Produk tidak ditemukan",
  "queue not found": "Antrean tidak ditemukan",
  "out of stock": "Maaf, stok produk habis",
  "invalid variant": "Pilihan varian tidak valid untuk produk ini",
  "add-on selection": "Pilihan add-on tidak berlaku untuk produk ini",
};

function extractErrorString(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return extractErrorString(obj[0]);
  if (typeof obj === "object") {
    if (obj.errors) return extractErrorString(obj.errors);
    if (obj.error) return extractErrorString(obj.error);
    if (obj.message) return extractErrorString(obj.message);
    if (obj.msg) return extractErrorString(obj.msg);
    return extractErrorString(Object.values(obj)[0]);
  }
  return null;
}

function translateError(originalMsg) {
  if (!originalMsg || typeof originalMsg !== "string") {
    return "Terjadi kesalahan, silakan coba lagi";
  }

  const cleanMsg = originalMsg.toLowerCase().replace(/\s+/g, " ").trim();

  const found = Object.entries(errorMap).find(([key]) =>
    cleanMsg.includes(key.toLowerCase()),
  );

  return found ? found[1] : originalMsg;
}

// =======================================
// REQUEST INTERCEPTOR
// =======================================
buyerApi.interceptors.request.use((config) => {
  const guestId = getGuestId();
  if (guestId) {
    config.headers["guest-id"] = guestId;
  }
  return config;
});

// =======================================
// RESPONSE INTERCEPTOR
// =======================================
const onSuccess = (response) => {
  const guestId = response?.data?.data?.guest_id;
  if (guestId) {
    setGuestId(guestId);
  }
  return response;
};

const onError = (error) => {
  const responseData = error.response?.data;
  const rawMsg = extractErrorString(responseData) || error.message;
  const translatedMsg = translateError(rawMsg);

  error.message = translatedMsg;

  if (error.response?.data) {
    if (error.response.data.errors) error.response.data.errors = translatedMsg;
    else if (error.response.data.error)
      error.response.data.error = translatedMsg;
    else if (error.response.data.message)
      error.response.data.message = translatedMsg;
    else error.response.data = translatedMsg;
  }

  return Promise.reject(error);
};

buyerApi.interceptors.response.use(onSuccess, onError);
