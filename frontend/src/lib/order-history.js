// src/lib/order-history.js
const lastOrderKey = (storeId) => `maxsten_last_order_${storeId}`;

export function saveLastOrderId(storeId, queueId) {
  localStorage.setItem(lastOrderKey(storeId), String(queueId));
}

export function getLastOrderId(storeId) {
  return localStorage.getItem(lastOrderKey(storeId));
}
