// backend/server.js - CivicSync Backend Application
const path = require('path');
const fs = require('fs');

// Load environment variables (.env in backend or root)
require('dotenv').config({ path: path.join(__dirname, '.env') });
if (!process.env.PORT) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth.routes');
const issueRoutes = require('./src/routes/issue.routes');
const adminRoutes = require('./src/routes/admin.routes');
const dbmsRoutes = require('./src/routes/dbms.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for CORS, JSON body parsing, and URL-encoded forms
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (prefers ../frontend, fallback to public) and evidence photo uploads
const frontendDir = fs.existsSync(path.join(__dirname, '../frontend'))
  ? path.join(__dirname, '../frontend')
  : path.join(__dirname, 'public');

const uploadsDir = fs.existsSync(path.join(__dirname, 'uploads'))
  ? path.join(__dirname, 'uploads')
  : path.join(__dirname, '../uploads');

app.use(express.static(frontendDir));
app.use('/uploads', express.static(uploadsDir));

// Mount MVC API Routers
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dbms', dbmsRoutes);

// Central error handling middleware
app.use(errorHandler);

// Start HTTP Server when run directly or through root server.js
const isDirectRun = require.main === module || 
  (require.main && require.main.filename === path.resolve(__dirname, '../server.js'));

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`CivicSync server running at http://localhost:${PORT}`);
    console.log(`Default Administrator: admin@civicsync.local / Admin#Secure2026!`);
    console.log(`Default Citizen:       citizen@civicsync.local / Citizen#Secure2026!`);
  });
}

module.exports = app;
