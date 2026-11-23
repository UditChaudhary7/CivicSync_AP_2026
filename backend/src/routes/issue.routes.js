// src/routes/issue.routes.js - Express Router for Civic Issues & Upvotes
const express = require('express');
const issueController = require('../controllers/issue.controller');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', issueController.list);
router.get('/mine', requireAuth, issueController.myReports);
router.get('/my-reports', requireAuth, issueController.myReports);
router.post('/check-duplicate', issueController.checkDuplicate);
router.post('/', requireAuth, upload.single('photo'), issueController.create);
router.post('/:id/upvote', requireAuth, issueController.upvote);
router.get('/:id', issueController.detail);
router.get('/:id/comments', issueController.getComments);
router.post('/:id/comments', requireAuth, issueController.addComment);

module.exports = router;
