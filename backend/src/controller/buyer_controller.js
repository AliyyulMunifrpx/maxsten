import buyerService from "../service/buyer_service.js";
import crypto from "crypto";
const createQueue = async (req, res, next) => {
  try {
    // 1. Ambil guest_id: prioritaskan header 'guest-id' (dipake FE lewat
    //    localStorage), fallback ke cookie kalau header gak ada, baru
    //    generate baru kalau dua-duanya kosong sama sekali.
    let guestId = req.headers["guest-id"] || req.cookies.guest_id;
    let isNewGuest = false;

    if (!guestId) {
      guestId = crypto.randomUUID();
      isNewGuest = true;
    }

    // 2. Gabungkan payload dari frontend dengan guestId
    const payload = {
      ...req.body,
      guest_id: guestId,
      public_id: req.params.storeId,
    };

    const result = await buyerService.createQueue(payload);

    // --- Socket.io Logic ---
    const { store, ...response } = result;
    const storeId = store.id;
    const io = req.app.get("socketio");
    if (io) {
      io.to(`TOKO_${storeId}`).emit("NEW_QUEUE", response);
    }

    // 3. SET COOKIE KE BROWSER PEMBELI (tetep dipertahanin buat socket auth)
    if (isNewGuest) {
      res.cookie("guest_id", guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
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
