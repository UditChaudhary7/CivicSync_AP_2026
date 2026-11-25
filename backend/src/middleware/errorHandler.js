// src/middleware/errorHandler.js - Application ka central error handling middleware

// Sabhi controllers aur routes ke unhandled errors ko pakad kar clean JSON response deta hai
function errorHandler(err, req, res, next) {
  console.error('Server Error:', err.message);
  // Status code decide karo (agar error mein custom code hai toh woh, nahi toh 404 ya 500)
  const status = err.statusCode || (err.message.includes('not found') ? 404 : 500);
  res.status(status).json({
    success: false,
    message: err.message || 'Server par koi unexpected error aa gaya.'
  });
}

module.exports = errorHandler;
