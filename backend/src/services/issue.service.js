// src/services/issue.service.js - Issue CRUD, Prisma Relations, Pagination & Upvoting
const prisma = require('../prisma');
const { calculatePriorityScore } = require('./priority.service');
const slaService = require('./sla.service');

// Retrieve paginated issues with Prisma relation filtering and sorting
async function getIssuesList({ page = 1, limit = 20, category, status, severity, sortBy = 'priority', search, ward }) {
  const take = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (Math.max(1, parseInt(page)) - 1) * take;

  const where = {};
  if (category && category !== 'all') where.category = category.toLowerCase();
  if (status && status !== 'all') where.status = status.toUpperCase();
  if (severity && severity !== 'all') where.severity = severity.toUpperCase();

  // Full-text search across title, description, address, and tracking number
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { address: { contains: q } },
      { trackingNumber: { contains: q } }
    ];
  }

  // Ward filter matching Sonipat municipal administrative zones
  if (ward && ward !== 'all') {
    const wardTerms = {
      ward_1: ['Sector 14', 'Model Town'],
      ward_2: ['Old DC', 'Subhash Chowk', 'Geeta Bhawan', 'Kakroi Road'],
      ward_3: ['Railway Station', 'Atlas Chowk', 'Atlas Road'],
      ward_4: ['Murthal Road', 'Sector 15', 'DCRUST'],
      ward_5: ['Sector 23', 'Rathdhana']
    };
    const terms = wardTerms[ward.toLowerCase()];
    if (terms) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: terms.map(term => ({ address: { contains: term } }))
      });
    }
  }

  let orderBy = { priority: 'desc' };
  if (sortBy === 'newest') orderBy = { createdAt: 'desc' };
  else if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
  else if (sortBy === 'most_upvoted') orderBy = { upvotes: { _count: 'desc' } };
  else if (sortBy === 'priority_asc') orderBy = { priority: 'asc' };

  // Parallel query for count and paginated items
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

// Retrieve single issue details with user, upvote relations, and status history
async function getIssueDetails(identifier) {
  const isNumeric = !isNaN(identifier);
  const where = isNumeric ? { id: parseInt(identifier) } : { trackingNumber: identifier };

  return prisma.issue.findUnique({
    where,
    include: {
      user: { select: { fullName: true, email: true } },
      _count: { select: { upvotes: true } },
      statusHistory: {
        include: {
          changedBy: { select: { fullName: true, role: true } }
        },
        orderBy: { createdAt: 'asc' }
      },
      comments: {
        include: {
          user: { select: { fullName: true, role: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
}

// Retrieve all issues reported by a specific citizen
async function getCitizenIssues(userId) {
  return prisma.issue.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { upvotes: true } }
    }
  });
}

// Create a new civic issue complaint using Prisma create
async function createNewIssue({ title, description, category, severity, latitude, longitude, address, photoUrl, userId }) {
  const trackingNumber = `REP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const sevUpper = severity.toUpperCase();
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

// Toggle citizen upvote (one vote per user per issue via @@unique constraint)
async function toggleIssueUpvote(issueId, userId) {
  const parsedIssueId = parseInt(issueId);

  const existingVote = await prisma.upvote.findUnique({
    where: {
      userId_issueId: { userId, issueId: parsedIssueId }
    }
  });

  let hasUpvoted = false;
  if (existingVote) {
    await prisma.upvote.delete({ where: { id: existingVote.id } });
  } else {
    await prisma.upvote.create({
      data: { userId, issueId: parsedIssueId }
    });
    hasUpvoted = true;
  }

  // Recalculate and update priority score
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

// Update issue status and create immutable audit history log in a transaction
async function updateStatus(issueId, newStatus, changedByUserId, remarks = null) {
  const parsedIssueId = parseInt(issueId);
  const previous = await prisma.issue.findUnique({ where: { id: parsedIssueId } });
  if (!previous) return null;

  const upperStatus = newStatus.toUpperCase();

  const [updated] = await prisma.$transaction([
    prisma.issue.update({
      where: { id: parsedIssueId },
      data: { status: upperStatus }
    }),
    prisma.statusHistory.create({
      data: {
        issueId: parsedIssueId,
        previousStatus: previous.status,
        newStatus: upperStatus,
        changedById: changedByUserId,
        remarks: remarks && remarks.trim() ? remarks.trim() : null
      }
    })
  ]);

  return { updated, previous };
}

// Retrieve chronological status audit history for an issue
async function getStatusHistory(issueId) {
  const parsedIssueId = parseInt(issueId);
  return prisma.statusHistory.findMany({
    where: { issueId: parsedIssueId },
    include: {
      changedBy: { select: { fullName: true, role: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
}

// Retrieve comments for a specific issue
async function getIssueComments(issueId) {
  const parsedIssueId = parseInt(issueId);
  return prisma.comment.findMany({
    where: { issueId: parsedIssueId },
    include: {
      user: { select: { fullName: true, role: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
}

// Add a new comment to an issue
async function addCommentToIssue({ issueId, userId, content }) {
  const parsedIssueId = parseInt(issueId);
  const trimmed = (content || '').trim();
  if (!trimmed) throw new Error('Comment content cannot be empty.');

  return prisma.comment.create({
    data: {
      issueId: parsedIssueId,
      userId,
      content: trimmed
    },
    include: {
      user: { select: { fullName: true, role: true } }
    }
  });
}

// Aggregate counts for the municipal administrator dashboard
async function getDashboardMetrics() {
  const [total, reported, inProgress, resolved, activeIssues] = await Promise.all([
    prisma.issue.count(),
    prisma.issue.count({ where: { status: 'REPORTED' } }),
    prisma.issue.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.issue.count({ where: { status: 'RESOLVED' } }),
    prisma.issue.findMany({
      where: { status: { not: 'RESOLVED' } },
      select: { category: true, createdAt: true, status: true }
    })
  ]);

  const slaBreachedCount = activeIssues.filter(iss => {
    const slaHours = slaService.getCategorySlaHours(iss.category);
    const deadline = new Date(iss.createdAt).getTime() + (slaHours * 3600 * 1000);
    return Date.now() > deadline;
  }).length;

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return {
    total,
    reported,
    in_progress: inProgress,
    resolved,
    sla_breached: slaBreachedCount,
    resolution_rate: resolutionRate
  };
}

module.exports = {
  getIssuesList,
  getIssueDetails,
  getCitizenIssues,
  createNewIssue,
  toggleIssueUpvote,
  updateStatus,
  getStatusHistory,
  getIssueComments,
  addCommentToIssue,
  getDashboardMetrics
};
