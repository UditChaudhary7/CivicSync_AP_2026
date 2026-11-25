// src/middleware/role.js - User role check karne ka authorization middleware (RBAC)

// Yeh higher-order function check karta hai ki logged-in user ke paas required role (jaise 'ADMIN') hai ya nahi
function requireRole(requiredRole) {
  return (req, res, next) => {
    // Agar user logged in nahi hai ya role match nahi karta toh 403 Forbidden return karo
    if (!req.user || req.user.role.toUpperCase() !== requiredRole.toUpperCase()) {
      return res.status(403).json({ success: false, message: `Access mana hai: Is action ke liye ${requiredRole} privileges zaroori hain.` });
    }
    next();
  };
}

module.exports = { requireRole };
