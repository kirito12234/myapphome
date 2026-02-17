const notFound = (req, res, next) => {
  const error = new Error(`Route not found – ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, _req, res, _next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isProd = process.env.NODE_ENV === "production";
  res.status(statusCode).json({
    success: false,
    message: err.message,
    errors: err.errors || undefined,
    stack: isProd ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };




