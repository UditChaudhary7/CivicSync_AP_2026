// src/routes/admin.routes.js - Express Router for Municipal Administrator Operations
const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Authorisation: All admin endpoints require verified ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

router.get('/stats', adminController.getStats);
router.get('/issues', adminController.listAll);
router.patch('/issues/:id/status', adminController.changeStatus);

module.exports = router;
