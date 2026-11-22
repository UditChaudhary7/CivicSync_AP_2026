// src/middleware/role.js - Role-Based Authorization Middleware

// Higher-order middleware function to restrict route access by role
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role.toUpperCase() !== requiredRole.toUpperCase()) {
      return res.status(403).json({ success: false, message: `Access denied: Requires ${requiredRole} privileges.` });
    }
    next();
  };
}

module.exports = { requireRole };
