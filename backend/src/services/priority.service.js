// src/services/priority.service.js - Civic issue ki priority score calculate karne ka logic

// Yeh function issue ki severity, citizen upvotes aur kitne din se pending hai uske hisaab se 0 se 100 ke beech score nikalta hai
function calculatePriorityScore(severity, upvoteCount = 0, createdAt = new Date()) {
  // Har severity level ke base points decide kiye gaye hain (max 40 points)
  const pointsMap = {
    CRITICAL: 40,
    HIGH: 30,
    MEDIUM: 20,
    LOW: 10
  };

  // Input sanitize kar rahe hain taaki case-sensitivity ka issue na aaye
  const sevKey = (severity || 'LOW').toUpperCase();
  const severityPoints = pointsMap[sevKey] || 10;

  // Har ek upvote ke 3 points milte hain, par maximum 30 points tak hi count honge
  const upvotePoints = Math.min((upvoteCount || 0) * 3, 30);

  // Issue report hone ke baad se kitne din beet chuke hain calculate kar rahe hain
  const daysWaiting = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  // Har din wait karne ke 2 points badhte hain, max 30 points tak
  const waitingPoints = Math.min(Math.max(daysWaiting, 0) * 2, 30);

  // Teenon factors ka sum karke return karte hain, maximum score 100 capped hai
  return Math.min(100, severityPoints + upvotePoints + waitingPoints);
}

module.exports = { calculatePriorityScore };
