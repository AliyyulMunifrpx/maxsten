import sellerService from "../service/seller_service.js";

const getAllQueue = async (req, res, next) => {
  try {
    const result = await sellerService.getAllQueue({
      store_id: req.params.storeId,
      userId: req.user.id,
    });

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
const editQueueStatus = async (req, res, next) => {
  try {
    const result = await sellerService.editQueueStatus({
      id: req.params.queueId,
      storeId: req.body.storeId,
      status: req.body.status,
    });

    const io = req.app.get("socketio");

    // FIX: Sesuaikan nama kamarnya dengan yang ada di buyer_events.js
    const namaKamarPembeli = `ANTREAN_${result.id}`;

    // Emit event ke kamar pembeli
    io.to(namaKamarPembeli).emit("STATUS_UPDATED", result);

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const getStore = async (req, res, next) => {
  try {
    const store = await sellerService.getStore(req.user.id);
    res.status(200).json({
      data: store,
    });
  } catch (e) {
    next(e);
  }
};
const updateAvailability = async (req, res, next) => {
  try {
    const result = await sellerService.updateProductAvailability(req.user.id, {
      productId: req.params.productId,
      is_available: req.body.is_available,
    });

    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
export default { getAllQueue, editQueueStatus, getStore, updateAvailability };
