import addonService from "../service/addon_service.js";

const getAddonGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await addonService.getAddonGroup(userId);

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
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
const editAddonGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Kita gabungkan ID dari parameter URL ke dalam req.body
    // agar service bisa membaca req.id sesuai dengan logic yang kamu buat
    const request = {
      ...req.body,
      id: req.params.addonGroupId,
    };

    const result = await addonService.editAddonGroups(userId, request);

    res.status(200).json({
      message: "Grup Add-on berhasil diperbarui",
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
    const result = await addonService.deleteAddonGroup(
      req.user.id,
      req.params.addonGroupId,
    );
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
  deleteAddonGroup
};
