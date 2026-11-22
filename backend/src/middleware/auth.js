// src/middleware/auth.js - JWT Authentication Middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'civicsync_viva_secret_key_2026';
const FALLBACK_SECRETS = [
  JWT_SECRET,
  'civicsync_viva_secret_key_2026',
  'c1v1c-5ync-pr0duct10n-sup3r-s3cur3-k3y-2026!'
];

// Middleware to extract and verify the JWT Bearer token
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded = null;

  for (const secret of FALLBACK_SECRETS) {
    try {
      decoded = jwt.verify(token, secret);
      if (decoded) break;
    } catch (err) {
      // try next fallback secret
    }
  }

  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token. Please sign in again.' });
  }

  // Ensure consistent userId property whether token stored userId or sub or id
  decoded.userId = decoded.userId || decoded.sub || decoded.id;
  req.user = decoded; // { userId, email, role, fullName }
  next();
}

module.exports = { requireAuth, JWT_SECRET };
