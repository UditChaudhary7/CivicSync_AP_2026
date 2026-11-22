// src/controllers/auth.controller.js - Express Controller for Authentication
const authService = require('../services/auth.service');

// Handle citizen account registration
async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    const fullName = req.body.fullName || req.body.full_name;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Email, password, and full name are required.' });
    }
    const result = await authService.registerCitizen({ email, password, fullName });
    res.status(201).json({ success: true, message: 'Registration successful', data: result });
  } catch (err) {
    next(err);
  }
}

// Handle citizen or administrator login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const result = await authService.loginUser({ email, password });
    res.status(200).json({ success: true, message: 'Login successful', data: result });
  } catch (err) {
    next(err);
  }
}

// Return currently authenticated user profile
async function me(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
