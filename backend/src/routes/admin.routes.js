// src/routes/admin.routes.js - Municipal Administrator dashboard aur triage ke routes
const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Security check: Is router ke sabhi endpoints ke liye user ka logged-in hona aur ADMIN role hona zaroori hai
router.use(requireAuth, requireRole('ADMIN'));

// Admin dashboard ke summary metrics (total, reported, in_progress, resolved counts)
router.get('/stats', adminController.getStats);
// Admin management table ke liye complaints list
router.get('/issues', adminController.listAll);
// Complaint ka lifecycle status update karne ke liye (PATCH request)
router.patch('/issues/:id/status', adminController.changeStatus);

module.exports = router;
