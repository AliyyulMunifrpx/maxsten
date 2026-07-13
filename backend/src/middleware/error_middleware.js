import { ResponseError } from "../error/response_error.js";

const errorMiddleware = (error, req, res, next) => {
  if (!error) {
    return next();
  }

  // Handle Custom Error (400, 401, 403, 404, dll)
  if (error instanceof ResponseError) {
    return res.status(error.status).json({
      errors: error.message,
    });
  }

  // Handle Server Error (500)


  // Jangan kirim error.message asli ke client di mode production
  const isProduction = process.env.NODE_ENV === "production";
  return res.status(500).json({
    errors: isProduction ? "Terjadi kesalahan pada server." : error.message,
  });
};

export { errorMiddleware };
