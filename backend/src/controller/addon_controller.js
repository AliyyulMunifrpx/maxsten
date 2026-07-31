import addonService from "../service/addon_service.js";

const getAddonGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await addonService.getAddonGroup({
      user_id: userId,
      addon_group_id: req.params.addonGroupId,
    });

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const createAddonGroup = async (req, res, next) => {
  try {
    const result = await addonService.createAddonGroup({
      userId: req.user.id,
      ...req.body,
    });
    res.status(201).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const editAddonGroup = async (req, res, next) => {
  try {
    const result = await addonService.editAddonGroups({
      user_id: req.user.id,
      ...req.body,
      id: req.params.addonGroupId,
    });

    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

const getAddonGroups = async (req, res, next) => {
  try {
    const result = await addonService.getAddonGroups(req.user.id);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const deleteAddonGroup = async (req, res, next) => {
  try {
    const result = await addonService.deleteAddonGroup({
      user_id: req.user.id,
      id: req.params.addonGroupId,
    });
    res.status(200).json({
      data: "OK",
    });
  } catch (e) {
    next(e);
  }
};
export default {
  getAddonGroup,
  editAddonGroup,
  createAddonGroup,
  getAddonGroups,
  deleteAddonGroup,
};
