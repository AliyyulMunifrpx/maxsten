import { apiPublic } from "./api.js";
import { getGuestId } from "./guestHelper.js";

export const getAllProducts = async (storeId) => {
  const response = await apiPublic.get(`/${storeId}/products`);
  return response.data.data;
};
export const createQueue = async (data) => {
  const response = await apiPublic.post("/stores/queues", data);
  return response.data.data;
};
export const getQueue = async (storeId, queueId) => {
  const response = await apiPublic.get(`/${storeId}/queues/${queueId}`);
  return response.data.data;
};
export const cancelQueueBuyer = async ({ storeId, queueId, reason }) => {
  const guestId = getGuestId(); // Ambil ID si pembeli

  const response = await apiPublic.patch(
    `/${storeId}/queues/${queueId}/cancel`,
    {
      guest_id: guestId, // Lempar ke req.body
      reason, // Lempar ke req.body.reason
    },
  );

  return response.data.data;
};
