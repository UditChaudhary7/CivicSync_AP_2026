// backend/server.js - CivicSync Backend Application ka main entry point
const path = require('path');
const fs = require('fs');

// Environment variables (.env file) load kar rahe hain
require('dotenv').config({ path: path.join(__dirname, '.env') });
if (!process.env.PORT) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');

// Saare routes aur central error handler import kar rahe hain
const authRoutes = require('./src/routes/auth.routes');
const issueRoutes = require('./src/routes/issue.routes');
const adminRoutes = require('./src/routes/admin.routes');
const dbmsRoutes = require('./src/routes/dbms.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup: CORS allow karna, incoming JSON aur URL-encoded form data parse karna
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend ki static files aur uploaded evidence photos serve karne ka path
const frontendDir = fs.existsSync(path.join(__dirname, '../frontend'))
  ? path.join(__dirname, '../frontend')
  : path.join(__dirname, 'public');

const uploadsDir = fs.existsSync(path.join(__dirname, 'uploads'))
  ? path.join(__dirname, 'uploads')
  : path.join(__dirname, '../uploads');

app.use(express.static(frontendDir));
app.use('/uploads', express.static(uploadsDir));

// MVC API Routes ko unke base path pe mount kar rahe hain
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dbms', dbmsRoutes);

// Sabhi unhandled errors ko pakadne ke liye central error handling middleware
app.use(errorHandler);

// Direct run ya root server.js se run hone par HTTP server start karo
const isDirectRun = require.main === module || 
  (require.main && require.main.filename === path.resolve(__dirname, '../server.js'));

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`CivicSync server chal raha hai: http://localhost:${PORT}`);
    console.log(`Default Administrator: admin@civicsync.local / Admin#Secure2026!`);
    console.log(`Default Citizen:       citizen@civicsync.local / Citizen#Secure2026!`);
  });
}

module.exports = app;
