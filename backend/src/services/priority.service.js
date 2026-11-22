// src/services/priority.service.js - Pure Deterministic Priority Calculation Function

// Computes 0-100 priority score from severity, citizen upvotes, and waiting days
function calculatePriorityScore(severity, upvoteCount = 0, createdAt = new Date()) {
  const pointsMap = {
    CRITICAL: 40,
    HIGH: 30,
    MEDIUM: 20,
    LOW: 10
  };

  const sevKey = (severity || 'LOW').toUpperCase();
  const severityPoints = pointsMap[sevKey] || 10;
  const upvotePoints = Math.min((upvoteCount || 0) * 3, 30);

  const daysWaiting = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const waitingPoints = Math.min(Math.max(daysWaiting, 0) * 2, 30);

  return Math.min(100, severityPoints + upvotePoints + waitingPoints);
}

module.exports = { calculatePriorityScore };
