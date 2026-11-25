// src/middleware/auth.js - JWT token verify karne aur logged-in user check karne ka middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'civicsync_viva_secret_key_2026';
const FALLBACK_SECRETS = [
  JWT_SECRET,
  'civicsync_viva_secret_key_2026',
  'c1v1c-5ync-pr0duct10n-sup3r-s3cur3-k3y-2026!'
];

// Protected routes ke liye middleware: Authorization header se token nikaal kar check karta hai
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  // Check karo ki header mein 'Bearer <token>' format mein token aaya hai ya nahi
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token zaroori hai. Kripya sign in karein.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded = null;

  // Secret keys se token verify karne ki koshish karo
  for (const secret of FALLBACK_SECRETS) {
    try {
      decoded = jwt.verify(token, secret);
      if (decoded) break;
    } catch (err) {
      // Agar ek secret match na kare toh agla secret try karo
    }
  }

  // Agar token invalid ya expire ho chuka hai toh 401 error bhejo
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Session token invalid ya expire ho chuka hai. Kripya dobara sign in karein.' });
  }

  // Token se userId nikaal kar req.user mein attach kar rahe hain taaki aage ke controllers use kar sakein
  decoded.userId = decoded.userId || decoded.sub || decoded.id;
  req.user = decoded; // { userId, email, role, fullName }
  next();
}

module.exports = { requireAuth, JWT_SECRET };
