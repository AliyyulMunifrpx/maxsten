import reasonService from "../service/reason_service.js";

const createCancelReason = async (req, res, next) => {
  try {
    const result = await reasonService.createCancelReason({
      user_id: req.user.id,
      ...req.body,
    });

    res.status(201).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
const updateCancelReason = async (req, res, next) => {
  try {
    const result = await reasonService.updateCancelReason({
      user_id: req.user.id,
      id: req.params.reasonId,
      ...req.body,
    });

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getCancelReasons = async (req, res, next) => {
  try {
    const result = await reasonService.getCancelReasons(req.user.id);

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
const deleteReasonTemplate = async (req, res, next) => {
  try {
    const result = await reasonService.deleteReasonTemplate({
      user_id: req.user.id,
      id: req.params.reasonId,
    });
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
