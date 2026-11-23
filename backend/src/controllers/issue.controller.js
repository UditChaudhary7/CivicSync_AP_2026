// src/controllers/issue.controller.js - Express Controller for Civic Issues & Upvotes
const issueService = require('../services/issue.service');
const duplicateService = require('../services/duplicate.service');

// Format issue object for frontend consistency (supporting camelCase and legacy snake_case)
function formatIssue(issue) {
  if (!issue) return null;
  return {
    ...issue,
    tracking_number: issue.trackingNumber,
    photo_url: issue.photoUrl,
    created_at: issue.createdAt,
    reporter_name: issue.user?.fullName || 'Citizen',
    upvotes: issue._count?.upvotes !== undefined ? issue._count.upvotes : issue.upvotes,
    status_history: issue.statusHistory ? issue.statusHistory.map(h => ({
      id: h.id,
      previous_status: h.previousStatus,
      new_status: h.newStatus,
      changed_by_name: h.changedBy?.fullName || 'Municipal Officer',
      changed_by_role: h.changedBy?.role || 'ADMIN',
      remarks: h.remarks,
      created_at: h.createdAt
    })) : []
  };
}

// Get paginated issues list
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

// Get issue detail by ID or tracking number
async function detail(req, res, next) {
  try {
    const issue = await issueService.getIssueDetails(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    res.status(200).json({ success: true, data: { issue: formatIssue(issue) } });
  } catch (err) {
    next(err);
  }
}

// Get issues submitted by logged-in citizen
async function myReports(req, res, next) {
  try {
    const issues = await issueService.getCitizenIssues(req.user.userId);
    res.status(200).json({ success: true, data: { issues: issues.map(formatIssue) } });
  } catch (err) {
    next(err);
  }
}

// Report a new civic issue with optional photo
async function create(req, res, next) {
  try {
    const { title, description, category, severity, latitude, longitude, address } = req.body;
    if (!title || !description || !category || !severity || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }

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

    res.status(201).json({ success: true, message: 'Issue reported successfully!', data: { issue: formatIssue(issue) } });
  } catch (err) {
    next(err);
  }
}

// Toggle citizen upvote on an issue
async function upvote(req, res, next) {
  try {
    const result = await issueService.toggleIssueUpvote(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// Check nearby duplicate issues within 500m
async function checkDuplicate(req, res, next) {
  try {
    const duplicates = await duplicateService.checkDuplicateIssues(req.body);
    res.status(200).json({ success: true, data: { duplicates } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail, myReports, create, upvote, checkDuplicate };
