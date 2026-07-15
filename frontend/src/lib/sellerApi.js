import { apiPrivate } from "./api.js";

export const getStore = async () => {
  const response = await apiPrivate.get("/stores/me");
  return response.data.data;
};
export const createProduct = async (formData) => {
  const response = await apiPrivate.post("/stores/products", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
export const createStore = async (formData) => {
  // Kita ganti parameternya nerima formData, bukan cuma name.
  // Dan WAJIB tambahin config header khusus di sini biar JSON defaultnya tertimpa.
  const response = await apiPrivate.post("/stores", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
export const openCloseStore = async (storeId) => {
  const response = await apiPrivate.patch(`/${storeId}/status`);
  return response.data;
};
export const getAllQueue = async (storeId) => {
  const response = await apiPrivate.get(`/stores/all-queues/${storeId}`);
  return response.data.data;
};
export const editStatusQueue = async ({ storeId, status, queueId, reason }) => {
  const response = await apiPrivate.patch(`/stores/queues/${queueId}`, {
    storeId,
    status,
    reason,
  });
  return response.data;
};
export const updateStoreProfile = async (data) => {
  const response = await apiPrivate.patch("/stores/me", data);
  return response.data;
};
export const updateStoreLogo = async (formData) => {
  const response = await apiPrivate.patch("/stores/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
// 1. Update Teks dan Varian Produk (JSON biasa)
export const updateProductInfo = async ({ productId, data }) => {
  const response = await apiPrivate.patch(
    `/stores/products/${productId}`,
    data,
  );
  return response.data;
};

export const getAddonGroups = async () => {
  const response = await apiPrivate.get(`/stores/get-addon-groups`);
  return response.data.data;
};

export const createAddonGroup = async (data) => {
  const response = await apiPrivate.post(`/stores/addon-groups`, data);
  return response.data;
};

// 2. Update Foto Produk (FormData)
export const updateProductImage = async ({ productId, formData }) => {
  const response = await apiPrivate.patch(
    `/stores/products/${productId}/image`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};
export const getStoreHistory = async ({
  filter = "all",
  page = 1,
  limit = 10,
  topPage = 1,
  topLimit = 10,
  status,
}) => {
  const response = await apiPrivate.get("/stores/history", {
    params: {
      filter,
      page,
      limit,
      topPage,
      topLimit,
      status,
    },
  });
  return response.data.data;
};
export const updateProductAvailability = async ({
  productId,
  is_available,
}) => {
  const response = await apiPrivate.patch(
    `/products/${productId}/availability`,
    {
      is_available,
    },
  );
  return response.data.data;
};
export const getOperationalHours = async () => {
  const response = await apiPrivate.get("/stores/operational-hours");
  return response.data.data;
};

// Simpan/Update jadwal operasional toko (Kirim array isi 7 hari)
export const updateOperationalHours = async (data) => {
  // data formatnya: { operational_hours: [ { day: 0, open_time: "08:00", ... }, ... ] }
  const response = await apiPrivate.put("/stores/operational-hours", data);
  return response.data;
};
export const createCancelReasonApi = async ({ reason }) => {
  const response = await apiPrivate.post("/seller/create-cancel-reasons", {
    reason,
  });
  return response.data;
};
export const getCancelReasons = async () => {
  const response = await apiPrivate.get("/seller/cancel-reasons");
  return response.data.data;
};
