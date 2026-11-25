// src/routes/issue.routes.js - Civic issues, upvoting aur duplicate detection ke routes
const express = require('express');
const issueController = require('../controllers/issue.controller');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public: Saari issues ki feed/list dekhne ke liye
router.get('/', issueController.list);
// Protected: Citizen ki apni submit ki hui complaints dekhne ke routes
router.get('/mine', requireAuth, issueController.myReports);
router.get('/my-reports', requireAuth, issueController.myReports);
// Duplicate check karne ka endpoint (500m radius check)
router.post('/check-duplicate', issueController.checkDuplicate);
// Protected: Nayi complaint create karna photo upload ke saath (single image field 'photo')
router.post('/', requireAuth, upload.single('photo'), issueController.create);
// Protected: Complaint par citizen upvote/unvote toggle karna
router.post('/:id/upvote', requireAuth, issueController.upvote);
// Public: Single complaint ki details dekhne ke liye (ID ya tracking number se)
router.get('/:id', issueController.detail);

module.exports = router;
