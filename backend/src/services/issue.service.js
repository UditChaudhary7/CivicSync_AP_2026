// src/services/issue.service.js - Complaints create karna, fetch karna, pagination aur upvote ka logic
const prisma = require('../prisma');
const { calculatePriorityScore } = require('./priority.service');

// Issues ki paginated list fetch karne ke liye (filters aur sorting ke saath)
async function getIssuesList({ page = 1, limit = 20, category, status, severity, sortBy = 'priority' }) {
  // Page size limit safely 1 se 50 ke beech set kar rahe hain
  const take = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (Math.max(1, parseInt(page)) - 1) * take;

  // Query filters dynamic build kar rahe hain
  const where = {};
  if (category && category !== 'all') where.category = category.toLowerCase();
  if (status && status !== 'all') where.status = status.toUpperCase();
  if (severity && severity !== 'all') where.severity = severity.toUpperCase();

  // Sorting order decide karo (newest pehle ya highest priority pehle)
  const orderBy = sortBy === 'newest' ? { createdAt: 'desc' } : { priority: 'desc' };

  // Total count aur issues list dono ko parallel fetch kar rahe hain performance ke liye
  const [total, issues] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: { select: { fullName: true } },
        _count: { select: { upvotes: true } }
      }
    })
  ]);

  return {
    issues,
    pagination: {
      total,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
}

// Single issue ki poori detail nikalne ke liye (ID ya tracking number dono se search ho sakta hai)
async function getIssueDetails(identifier) {
  const isNumeric = !isNaN(identifier);
  const where = isNumeric ? { id: parseInt(identifier) } : { trackingNumber: identifier };

  return prisma.issue.findUnique({
    where,
    include: {
      user: { select: { fullName: true, email: true } },
      _count: { select: { upvotes: true } }
    }
  });
}

// Logged-in citizen ki khud ki submit ki hui saari complaints fetch karo
async function getCitizenIssues(userId) {
  return prisma.issue.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { upvotes: true } }
    }
  });
}

// Nayi civic complaint database mein create karne ka function
async function createNewIssue({ title, description, category, severity, latitude, longitude, address, photoUrl, userId }) {
  // Unique tracking number generate kar rahe hain (jaise REP-2026-48291)
  const trackingNumber = `REP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const sevUpper = severity.toUpperCase();
  // Shuruwaati priority score calculate karo
  const initialPriority = calculatePriorityScore(sevUpper, 0, new Date());

  return prisma.issue.create({
    data: {
      trackingNumber,
      title: title.trim(),
      description: description.trim(),
      category: category.toLowerCase(),
      severity: sevUpper,
      status: 'REPORTED',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address ? address.trim() : 'Sonipat, Haryana',
      photoUrl,
      priority: initialPriority,
      userId
    },
    include: {
      user: { select: { fullName: true } }
    }
  });
}

// Citizen ke upvote ko toggle karna (agar pehle se vote kiya hai toh hata do, nahi toh add karo)
async function toggleIssueUpvote(issueId, userId) {
  const parsedIssueId = parseInt(issueId);

  // Check karo ki user ne is issue par pehle vote diya hai ya nahi
  const existingVote = await prisma.upvote.findUnique({
    where: {
      userId_issueId: { userId, issueId: parsedIssueId }
    }
  });

  let hasUpvoted = false;
  if (existingVote) {
    // Agar pehle vote tha, toh delete karke vote cancel kar do
    await prisma.upvote.delete({ where: { id: existingVote.id } });
  } else {
    // Agar pehle vote nahi tha, toh naya upvote add karo
    await prisma.upvote.create({
      data: { userId, issueId: parsedIssueId }
    });
    hasUpvoted = true;
  }

  // Naye upvotes count hone ke baad priority score recalculate aur update karo
  const [upvotesCount, issue] = await Promise.all([
    prisma.upvote.count({ where: { issueId: parsedIssueId } }),
    prisma.issue.findUnique({ where: { id: parsedIssueId } })
  ]);

  const newPriority = calculatePriorityScore(issue.severity, upvotesCount, issue.createdAt);
  const updatedIssue = await prisma.issue.update({
    where: { id: parsedIssueId },
    data: { priority: newPriority }
  });

  return {
    hasUpvoted,
    has_upvoted: hasUpvoted,
    upvotes: upvotesCount,
    upvotesCount,
    priority: updatedIssue.priority
  };
}

// Complaint ka status update karna (jaise REPORTED se IN_PROGRESS ya RESOLVED)
async function updateStatus(issueId, newStatus) {
  const parsedIssueId = parseInt(issueId);
  return prisma.issue.update({
    where: { id: parsedIssueId },
    data: { status: newStatus.toUpperCase() }
  });
}

// Admin dashboard ke counters ke liye summary metrics nikalna
async function getDashboardMetrics() {
  const [total, reported, inProgress, resolved] = await Promise.all([
    prisma.issue.count(),
    prisma.issue.count({ where: { status: 'REPORTED' } }),
    prisma.issue.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.issue.count({ where: { status: 'RESOLVED' } })
  ]);

  return { total, reported, in_progress: inProgress, resolved };
}

module.exports = {
  getIssuesList,
  getIssueDetails,
  getCitizenIssues,
  createNewIssue,
  toggleIssueUpvote,
  updateStatus,
  getDashboardMetrics
};
