// src/middleware/errorHandler.js - Central Express Error Handling Middleware

// Catches unhandled errors across routers and controllers
function errorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err.message);
  const status = err.statusCode || (err.message.includes('not found') ? 404 : 500);
  res.status(status).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
}

module.exports = errorHandler;
