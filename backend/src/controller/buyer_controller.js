import buyerService from "../service/buyer_service.js";
import crypto from "crypto";
const createQueue = async (req, res, next) => {
  try {
    // 1. Ambil guest_id dari Cookie (bukan dari req.body)
    let guestId = req.cookies.guest_id;
    let isNewGuest = false;

    // 2. Kalau belum punya (pembeli baru pertama kali pesen), BE bikinin ID-nya
    if (!guestId) {
      guestId = crypto.randomUUID();
      isNewGuest = true;
    }

    // 3. Gabungkan payload dari frontend dengan guestId dari backend
    const payload = {
      ...req.body,
      guest_id: guestId,
      public_id: req.params.storeId, // <--- Timpa/Masukkan guestId valid ke payload
    };

    const result = await buyerService.createQueue(payload);

    // --- Socket.io Logic ---
    const { store, ...response } = result;

    const storeId = store.id;
    const io = req.app.get("socketio");

    if (io) {
      io.to(`TOKO_${storeId}`).emit("NEW_QUEUE", response);
    }

    // 4. SET COOKIE KE BROWSER PEMBELI
    // Ini krusial biar pas dia connect Websocket, socketAuth bisa baca 'guest_id'-nya!
    if (isNewGuest) {
      res.cookie("guest_id", guestId, {
        httpOnly: true, // Aman dari serangan XSS (gabisa dibaca javascript frontend)
        secure: process.env.NODE_ENV === "production", // Wajib true kalau pakai HTTPS
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000, // Aktif 1 hari (sesuaikan kebutuhan)
      });
    }

    res.status(201).json({
      data: response,
    });
  } catch (e) {
    next(e);
  }
};
const getAllProductDisplay = async (req, res, next) => {
  try {
    const result = await buyerService.getAllProductDisplay({
      public_id: req.params.storeId,
      page: req.query.page,
      keyword: req.query.keyword,
    });
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const getQueue = async (req, res, next) => {
  try {
    const guestId = req.cookies.guest_id || req.headers["guest-id"];

    if (!guestId) {
      return res.status(401).json({ errors: "Unauthorized" });
    }
    const result = await buyerService.getQueue({
      queueId: req.params.queueId,
      public_id: req.params.storeId,
      guest_id: guestId,
    });
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
const cancelQueue = async (req, res, next) => {
  try {
    const guestId = req.cookies.guest_id || req.headers["guest-id"];

    if (!guestId) {
      return res.status(401).json({ errors: "Unauthorized" });
    }
    const result = await buyerService.cancelQueue({
      public_id: req.params.storeId,
      queueId: req.params.queueId,
      guest_id: guestId,
      reason: req.body?.reason,
    });

    const io = req.app.get("socketio");
    const { store_id, ...dataToSend } = result;
    if (io) {
      // 1. Tembak ke kamar pembeli biar modalnya otomatis ketutup
      io.to(`ANTREAN_${result.id}`).emit("STATUS_UPDATED", {
        ...dataToSend,
        triggered_by: "buyer",
      });

      // 2. Tembak ke kamar toko biar kasir tau ada yang batal
      io.to(`TOKO_${store_id}`).emit("STATUS_UPDATED", {
        ...dataToSend,
        triggered_by: "buyer",
      });
    }

    res.status(200).json({
      data: dataToSend,
    });
  } catch (e) {
    next(e);
  }
};
const getProductDetails = async (req, res, next) => {
  try {
    const result = await buyerService.getProductDetails({
      public_id: req.params.storeId,
      product_id: req.params.productId,
    });
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
export default {
  createQueue,
  getAllProductDisplay,
  getQueue,
  cancelQueue,
  getProductDetails,
};
