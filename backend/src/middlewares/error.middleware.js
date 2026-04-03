import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";
  const errors = err instanceof ApiError ? err.errors : [];
  const stack = process.env.NODE_ENV === "development" ? err.stack : undefined;

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack,
  });
};

export default errorHandler;