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
  "User not found": "Akun nggak ditemukan",
  "That email address already exists": "Email ini sudah terdaftar",
  Unauthorized: "Sesi kamu habis, silakan login lagi",
  "Store not found": "Toko tidak ditemukan",
  "Product not found": "Produk nggak ditemukan",
  "already have a store": "Kamu sudah punya toko",
  "size: 2MB": "Maksimal ukuran file 2 MB",
  " email address is already in use by another u":
    "Email ini sudah dipakai. Coba email lain",
  '"addons" must contain at least 1 items': "Minimal tambahkan 1 add-on",
  "A cancellation reason with this text already exists.":
    "Alasan ini sudah ada",
  "Add-on names within a group must be unique": "Nama add-on harus berbeda",
  "An add-on group with this name already exists":
    "Nama grup add-on ini sudah ada",
  '"price" must be a positive number': "Harga harus lebih dari 0",
  "already exists in this store": "Nama produk ini sudah dipakai",
  "Cannot change the status from SELESAI to SELESAI": 'Status sudah "SELESAI"',
  "Cannot change the status from DIPROSES to DIPROSES":
    'Status sudah "DIPROSES"',
  "Variant names within a product must be unique": "Nama varian harus berbeda",
  "The store cannot be deleted because there are still pending orders":
    "Toko masih punya pesanan yang belum selesai",
  "Cannot delete product with active orders in progress":
    "Produk masih punya pesanan yang sedang berjalan",
  "This product has an active order in progress. Only the name and description can be updated.":
    "Produk sedang dipesan. Hanya nama dan deskripsi yang bisa diubah",
  "selection is not valid":
    "Pilihan add-on tersebut tidak berlaku untuk produk ini",
  "Cannot edit this add-on group because a product using it is currently in an active queue.":
    "Grup add-on tidak bisa diedit karena sedang digunakan produk dalam antrian aktif",
  "Cannot delete this add-on group because a product using it is currently in an active queue.":
    "Grup add-on tidak bisa dihapus karena digunakan produk dalam antrian aktif",
  "You cannot delete your account because your store still has active customer queues":
    "Akun tidak bisa dihapus karena toko masih memiliki antrian aktif",
    "Auth session missing!":"Sesi tidak ditemukan"
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
  // 1. Ambil body response dari backend
  const responseData = error.response?.data;

  // 2. Gunakan 'let', dan cari pesan error di beberapa kemungkinan key (errors / error / message)
  let originalMsg =
    responseData?.errors || responseData?.error || responseData?.message;

  // 3. Handle jika originalMsg berupa array
  if (Array.isArray(originalMsg)) {
    originalMsg = originalMsg[0];

    // Jaga-jaga jika isi array-nya adalah object, contoh: [{ message: "Store not found" }]
    if (typeof originalMsg === "object" && originalMsg !== null) {
      originalMsg =
        originalMsg.msg || originalMsg.message || JSON.stringify(originalMsg);
    }
  }

  // 4. Kalau session habis, bersihkan token
  if (error.response?.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  // 5. Pastikan originalMsg adalah string sebelum dilempar ke translateError
  // (karena translateError menggunakan method .toLowerCase() yang akan error jika bukan string)
  const stringError = typeof originalMsg === "string" ? originalMsg : "";

  // 6. Timpa message bawaan Axios dengan hasil terjemahan
  error.message = translateError(stringError);

  return Promise.reject(error);
};

publicApi.interceptors.response.use(onSuccess, onError);
privateApi.interceptors.response.use(onSuccess, onError);
