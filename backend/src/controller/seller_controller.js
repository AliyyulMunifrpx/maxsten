import sellerService from "../service/seller_service.js";
const getAllQueue = async (req, res, next) => {
  try {
    const result = await sellerService.getAllQueue({
      store_id: req.params.storeId,
      userId: req.user.id,
      page: parseInt(req.query.page) || 1,
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
      reason: req.body.reason,
      userId: req.user.id,
    });
    try {
      const io = req.app.get("socketio");
      if (io) {
        io.to(`ANTREAN_${result.id}`).emit("STATUS_UPDATED", {
          id: result.id,
          status: result.status,
          triggered_by: "seller",
          reason: result.cancellation_reason,
        });
        io.to(`TOKO_${result.store_id}`).emit("STATUS_UPDATED", {
          id: result.id,
          status: result.status,
          triggered_by: "seller",
          reason: result.cancellation_reason,
        });
      }
    } catch (socketError) {
      console.error(
        `[editQueueStatus] gagal emit socket buat queue ${result.id}: ${socketError.message}`,
      );
    }
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export default {
  getAllQueue,
  editQueueStatus,
};
