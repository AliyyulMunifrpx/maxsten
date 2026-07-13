import dashboardService from "../service/dashboard_service.js";

const getDashboard = async (req, res, next) => {
  try {
    const result = await dashboardService.getDashboard(req.user.id);
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
export default { getDashboard };
