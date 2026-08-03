import multer from "multer";
import { ResponseError } from "../error/response_error.js";

const errorMiddleware = (error, req, res, next) => {
  if (!error) {
    return next();
  }
  console.log(error);
  console.log("code:", error.code);
  console.log("field:", error.field);
  // Handle Custom Error (400, 401, 403, 404, dll)
  if (error instanceof ResponseError) {
    return res.status(error.status).json({
      errors: error.message,
    });
  }

  // Handle Multer Error (upload file: ukuran, tipe, dll)
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        errors: "Maximum file size: 2MB",
      });
    }
    return res.status(400).json({
      errors: error.message,
    });
  }

  // Handle error dari fileFilter (bukan instance MulterError, tapi Error biasa)
  if (error.message === "Only image files are allowed!") {
    return res.status(400).json({
      errors: error.message,
    });
  }

  // Handle Server Error (500)
  const isProduction = process.env.NODE_ENV === "production";
  return res.status(500).json({
    errors: isProduction ? "Terjadi kesalahan pada server." : error.message,
  });
};

export { errorMiddleware };
