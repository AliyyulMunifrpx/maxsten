import { v4 as uuidv4 } from 'uuid'; // Install: npm install uuid

export const getGuestId = () => {
  // 1. Cek apakah di localStorage sudah ada ID
  let guestId = localStorage.getItem("guest_id");

  // 2. Kalau belum ada, buat baru dan simpan
  if (!guestId) {
    guestId = uuidv4();
    localStorage.setItem("guest_id", guestId);
  }

  return guestId;
};