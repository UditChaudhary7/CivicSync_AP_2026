// src/controllers/admin.controller.js - Municipal Administrator operations ke controllers
const issueService = require('../services/issue.service');
const statusEmitter = require('../events/statusEvents');

// Helper function: Frontend UI ke liye issue fields format karna
function formatIssue(issue) {
  return {
    ...issue,
    tracking_number: issue.trackingNumber,
    photo_url: issue.photoUrl,
    created_at: issue.createdAt,
    upvotes: issue._count?.upvotes !== undefined ? issue._count.upvotes : issue.upvotes
  };
}

// Admin dashboard ke summary stats nikaalna (GET /api/admin/stats)
async function getStats(req, res, next) {
  try {
    const stats = await issueService.getDashboardMetrics();
    res.status(200).json({ success: true, data: { stats } });
  } catch (err) {
    next(err);
  }
}

// Admin triage table ke liye saari complaints list karna (GET /api/admin/issues)
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

// Complaint ka status change karna (PATCH /api/admin/issues/:id/status)
async function changeStatus(req, res, next) {
  try {
    const { status } = req.body;
    // Sirf yeh 3 status allowed hain lifecycle mein
    const allowed = ['REPORTED', 'IN_PROGRESS', 'RESOLVED'];
    const formattedStatus = (status || '').toUpperCase();

    if (!allowed.includes(formattedStatus)) {
      return res.status(400).json({ success: false, message: 'Galat status hai. Status sirf REPORTED, IN_PROGRESS, ya RESOLVED hona chahiye.' });
    }

    const previous = await issueService.getIssueDetails(req.params.id);
    if (!previous) return res.status(404).json({ success: false, message: 'Issue nahi mila.' });

    const updated = await issueService.updateStatus(req.params.id, formattedStatus);

    // Node.js events module ke through async audit logging trigger karo
    statusEmitter.emit('statusChanged', {
      issueId: updated.id,
      trackingNumber: updated.trackingNumber,
      oldStatus: previous.status,
      newStatus: updated.status,
      adminEmail: req.user.email
    });

    res.status(200).json({
      success: true,
      message: `Status badal kar ${updated.status} kar diya gaya hai.`,
      data: { issue: formatIssue(updated) }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats, listAll, changeStatus };
