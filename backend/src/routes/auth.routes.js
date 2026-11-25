// src/routes/auth.routes.js - User authentication (Register, Login, Me) ke routes
const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Citizen registration route
router.post('/register', authController.register);
// User login route (Citizen aur Admin dono ke liye)
router.post('/login', authController.login);
// Current logged-in user profile route (is route par requireAuth middleware laga hai)
router.get('/me', requireAuth, authController.me);

module.exports = router;
