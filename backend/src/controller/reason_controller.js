import reasonService from "../service/reason_service.js";

const createCancelReason = async (req, res, next) => {
  try {
    // Asumsi req.user.id didapat dari middleware auth JWT/Session lu
    const userId = req.user.id;
    const result = await reasonService.createCancelReason(userId, req.body);

    res.status(201).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getCancelReasons = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await reasonService.getCancelReasons(userId);

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
export default {
  createCancelReason,
  getCancelReasons,
};
