// src/controllers/issue.controller.js - Civic issues aur upvoting ke HTTP requests handle karne wala controller
const issueService = require('../services/issue.service');
const duplicateService = require('../services/duplicate.service');

// Helper function: Issue object ko format karta hai taaki frontend camelCase aur snake_case dono ko handle kar sake
function formatIssue(issue) {
  if (!issue) return null;
  return {
    ...issue,
    tracking_number: issue.trackingNumber,
    photo_url: issue.photoUrl,
    created_at: issue.createdAt,
    reporter_name: issue.user?.fullName || 'Citizen',
    upvotes: issue._count?.upvotes !== undefined ? issue._count.upvotes : issue.upvotes
  };
}

// Paginated issues list fetch karna (GET /api/issues)
async function list(req, res, next) {
  try {
    const result = await issueService.getIssuesList(req.query);
    res.status(200).json({
      success: true,
      data: {
        issues: result.issues.map(formatIssue),
        pagination: result.pagination
      }
    });
  } catch (err) {
    next(err);
  }
}

// Single issue detail ID ya tracking number se nikaalna (GET /api/issues/:id)
async function detail(req, res, next) {
  try {
    const issue = await issueService.getIssueDetails(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue nahi mila.' });
    res.status(200).json({ success: true, data: { issue: formatIssue(issue) } });
  } catch (err) {
    next(err);
  }
}

// Logged-in citizen ki khud ki submit ki hui reports fetch karna (GET /api/issues/mine)
async function myReports(req, res, next) {
  try {
    const issues = await issueService.getCitizenIssues(req.user.userId);
    res.status(200).json({ success: true, data: { issues: issues.map(formatIssue) } });
  } catch (err) {
    next(err);
  }
}

// Nayi civic issue report submit karna (POST /api/issues)
async function create(req, res, next) {
  try {
    const { title, description, category, severity, latitude, longitude, address } = req.body;
    // Basic field validation
    if (!title || !description || !category || !severity || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Sabhi zaroori fields bharna mandatory hai.' });
    }

    // Agar photo upload hui hai toh uska URL set karo
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const issue = await issueService.createNewIssue({
      title,
      description,
      category,
      severity,
      latitude,
      longitude,
      address,
      photoUrl,
      userId: req.user.userId
    });

    res.status(201).json({ success: true, message: 'Issue successfully report ho gaya!', data: { issue: formatIssue(issue) } });
  } catch (err) {
    next(err);
  }
}

// Issue par citizen ka upvote toggle karna (POST /api/issues/:id/upvote)
async function upvote(req, res, next) {
  try {
    const result = await issueService.toggleIssueUpvote(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// 500m ke radius mein duplicate complaints check karna (POST /api/issues/check-duplicate)
async function checkDuplicate(req, res, next) {
  try {
    const duplicates = await duplicateService.checkDuplicateIssues(req.body);
    res.status(200).json({ success: true, data: { duplicates } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail, myReports, create, upvote, checkDuplicate };
