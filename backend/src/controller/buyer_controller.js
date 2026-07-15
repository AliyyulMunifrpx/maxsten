import buyerService from "../service/buyer_service.js";
const createQueue = async (req, res, next) => {
  try {
    const result = await buyerService.createQueue(req.body);
    const io = req.app.get("socketio");

    // Ambil public_id toko dari hasil return Prisma
    const storeId = result.store.id;

    // Tembak HANYA ke room public_id toko yang dituju!
    if (io) {
      io.to(`TOKO_${storeId}`).emit("NEW_QUEUE", result);
    }

    // Buang data 'store' sebelum dikirim ke buyer biar rapi (opsional)
    delete result.store;

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const getAllProductDisplay = async (req, res, next) => {
  try {
    const result = await buyerService.getAllProductDisplay(req.params.storeId);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const getQueue = async (req, res, next) => {
  try {
    const result = await buyerService.getQueue({
      queueId: req.params.queueId,
      public_id: req.params.publicId,
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
    const result = await buyerService.cancelQueue({
      public_id: req.params.publicId,
      queueId: req.params.queueId,
      guest_id: req.body.guest_id,
      reason: req.body.reason,
    });

    const io = req.app.get("socketio");

    if (io) {
      // 1. Tembak ke kamar pembeli biar modalnya otomatis ketutup
      io.to(`ANTREAN_${result.id}`).emit("STATUS_EDITED", result);

      // 2. Tembak ke kamar toko biar kasir tau ada yang batal
      io.to(`TOKO_${result.store_id}`).emit("STATUS_EDITED", result);
    }

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
export default { createQueue, getAllProductDisplay, getQueue, cancelQueue };
