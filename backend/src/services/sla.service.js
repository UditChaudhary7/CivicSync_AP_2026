// src/services/sla.service.js - Municipal Service Level Agreement (SLA) Engine
// Implements category-based resolution windows aligned with DBMS CP1 & CP3 specifications

const SLA_POLICY_HOURS = {
  road_pothole: 48,
  streetlight: 24,
  garbage: 24,
  water_leakage: 24,
  drainage_sewage: 48,
  public_infrastructure: 72
};

function getCategorySlaHours(category) {
  if (!category) return 48;
  const key = category.toLowerCase().trim();
  return SLA_POLICY_HOURS[key] || 48;
}

function calculateSlaMetrics(issue) {
  if (!issue) return null;
  const slaHours = getCategorySlaHours(issue.category);
  const createdAtTime = new Date(issue.createdAt || issue.created_at).getTime();
  const deadlineTime = createdAtTime + (slaHours * 60 * 60 * 1000);
  const now = Date.now();
  const isResolved = (issue.status || '').toUpperCase() === 'RESOLVED';

  const diffHours = (deadlineTime - now) / (1000 * 60 * 60);
  const isBreached = !isResolved && diffHours < 0;
  const isApproaching = !isResolved && diffHours >= 0 && diffHours <= 8;

  let slaStatus = 'ON_TRACK';
  if (isResolved) {
    slaStatus = 'RESOLVED';
  } else if (isBreached) {
    slaStatus = 'BREACHED';
  } else if (isApproaching) {
    slaStatus = 'APPROACHING';
  }

  return {
    sla_hours: slaHours,
    deadline: new Date(deadlineTime).toISOString(),
    is_breached: isBreached,
    is_approaching: isApproaching,
    sla_status: slaStatus,
    remaining_hours: isResolved ? 0 : Math.max(0, Math.round(diffHours)),
    breached_hours: isBreached ? Math.round(Math.abs(diffHours)) : 0
  };
}

module.exports = {
  SLA_POLICY_HOURS,
  getCategorySlaHours,
  calculateSlaMetrics
};
