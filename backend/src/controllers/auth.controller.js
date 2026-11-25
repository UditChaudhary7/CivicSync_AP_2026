// src/controllers/auth.controller.js - Authentication ke HTTP requests handle karne wala controller
const authService = require('../services/auth.service');

// Citizen registration request handle karna (POST /api/auth/register)
async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    const fullName = req.body.fullName || req.body.full_name;
    // Input validation: Zaroori fields check kar rahe hain
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Email, password aur full name teeno zaroori hain.' });
    }
    const result = await authService.registerCitizen({ email, password, fullName });
    res.status(201).json({ success: true, message: 'Registration successfully ho gaya!', data: result });
  } catch (err) {
    next(err);
  }
}

// User login request handle karna (POST /api/auth/login)
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email aur password dono provide karein.' });
    }
    const result = await authService.loginUser({ email, password });
    res.status(200).json({ success: true, message: 'Login successful!', data: result });
  } catch (err) {
    next(err);
  }
}

// Logged-in user ki profile info return karna (GET /api/auth/me)
async function me(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User nahi mila.' });
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
