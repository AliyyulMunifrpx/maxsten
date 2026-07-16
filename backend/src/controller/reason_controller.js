import reasonService from "../service/reason_service.js";

const createCancelReason = async (req, res, next) => {
  try {
    // Asumsi req.user.id didapat dari middleware auth JWT/Session lu
    const userId = req.user.id;
    const result = await reasonService.createCancelReason(userId, req.body);

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
const updateCancelReason = async (req, res, next) => {
  try {
    // Asumsi req.user.id didapat dari middleware auth JWT/Session lu
    const userId = req.user.id;
    const result = await reasonService.updateCancelReason(userId, req.body);

    res.status(200).json({
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
const deleteReasonTemplate = async (req, res, next) => {
  try {
    const result = await reasonService.deleteReasonTemplate(
      req.user.id,
      req.params.templateId,
    );
    res.status(200).json({
      data: "OK",
    });
  } catch (e) {
    next(e);
  }
};
export default {
  createCancelReason,
  getCancelReasons,
  deleteReasonTemplate,
  updateCancelReason,
};
