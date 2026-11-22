// src/controllers/admin.controller.js - Express Controller for Administrator Operations
const issueService = require('../services/issue.service');
const statusEmitter = require('../events/statusEvents');

// Helper to format issue object for frontend
function formatIssue(issue) {
  return {
    ...issue,
    tracking_number: issue.trackingNumber,
    photo_url: issue.photoUrl,
    created_at: issue.createdAt,
    upvotes: issue._count?.upvotes !== undefined ? issue._count.upvotes : issue.upvotes
  };
}

// Get overview metrics for admin dashboard counters
async function getStats(req, res, next) {
  try {
    const stats = await issueService.getDashboardMetrics();
    res.status(200).json({ success: true, data: { stats } });
  } catch (err) {
    next(err);
  }
}

// List all complaints for admin management table
async function listAll(req, res, next) {
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

// Update lifecycle status (REPORTED -> IN_PROGRESS -> RESOLVED) and emit statusChanged event
async function changeStatus(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = ['REPORTED', 'IN_PROGRESS', 'RESOLVED'];
    const formattedStatus = (status || '').toUpperCase();

    if (!allowed.includes(formattedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be REPORTED, IN_PROGRESS, or RESOLVED.' });
    }

    const previous = await issueService.getIssueDetails(req.params.id);
    if (!previous) return res.status(404).json({ success: false, message: 'Issue not found' });

    const updated = await issueService.updateStatus(req.params.id, formattedStatus);

    // Emit event for asynchronous audit logging using Node.js events module
    statusEmitter.emit('statusChanged', {
      issueId: updated.id,
      trackingNumber: updated.trackingNumber,
      oldStatus: previous.status,
      newStatus: updated.status,
      adminEmail: req.user.email
    });

    res.status(200).json({
      success: true,
      message: `Status updated to ${updated.status}`,
      data: { issue: formatIssue(updated) }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats, listAll, changeStatus };
