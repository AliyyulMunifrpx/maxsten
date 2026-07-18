import aiService from "../service/ai_service.js";

const reportGenerator = async (req, res, next) => {
  try {
    const result = await aiService.reportGenerator(
      req.user,
      req.body.month,
      req.body.year,
    );
    res.status(200).json({
      data: result,
    });
  } catch (e) {
    next(e);
  }
};
export default { reportGenerator };
