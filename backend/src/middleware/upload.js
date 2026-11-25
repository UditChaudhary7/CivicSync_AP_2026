// src/middleware/upload.js - Photo upload handle karne ke liye Multer middleware configuration
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');
// Agar uploads folder nahi hai toh pehle bana do
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage: Files ko unique timestamp aur random number ke saath rename karke save karte hain
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

// Multer upload filter: Sirf image files allow karo aur size maximum 2 MB tak limit rakho
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB size limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Sirf image files (JPEG, PNG, WebP) upload karna allowed hai!'), false);
  }
});

module.exports = upload;
