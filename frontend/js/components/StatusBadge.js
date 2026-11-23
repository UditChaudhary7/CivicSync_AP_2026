// public/js/components/StatusBadge.js - Visual Badges for Status, Severity, and Priority

window.StatusBadge = {
  // Render colored lifecycle status badge (Reported, In Progress, Resolved)
  renderStatus(status) {
    const s = (status || 'reported').toLowerCase();
    const labels = {
      reported: 'Reported',
      in_progress: 'In Progress',
      resolved: 'Resolved'
    };
    return `<span class="badge badge-${s}">${labels[s] || s}</span>`;
  },

  // Render colored severity badge (Critical, High, Medium, Low)
  renderSeverity(severity) {
    const s = (severity || 'low').toLowerCase();
    return `<span class="badge badge-${s}">${s.toUpperCase()}</span>`;
  },

  // Render priority score badge
  renderPriority(score) {
    const num = parseInt(score || 0, 10);
    return `<span style="font-size:11px; font-weight:700; color:#1E3A8A; background:#EFF6FF; padding:2px 6px; border-radius:2px;">
      Priority ${num}
    </span>`;
  },

  // Render dynamic municipal SLA compliance badge
  renderSLA(issue) {
    if (!issue || !issue.sla) return '';
    const sla = issue.sla;
    if (sla.sla_status === 'RESOLVED') {
      return `<span style="font-size:10px; font-weight:700; color:#15803D; background:#DCFCE7; border:1px solid #BBF7D0; padding:2px 6px; border-radius:3px;">✓ Resolved</span>`;
    }
    if (sla.sla_status === 'BREACHED') {
      return `<span style="font-size:10px; font-weight:700; color:#B91C1C; background:#FEE2E2; border:1px solid #FECACA; padding:2px 6px; border-radius:3px;">⚠️ SLA Breached (+${sla.breached_hours}h)</span>`;
    }
    if (sla.sla_status === 'APPROACHING') {
      return `<span style="font-size:10px; font-weight:700; color:#B45309; background:#FEF3C7; border:1px solid #FDE68A; padding:2px 6px; border-radius:3px;">⏱ Due in ${sla.remaining_hours}h</span>`;
    }
    return `<span style="font-size:10px; font-weight:600; color:#0369A1; background:#E0F2FE; border:1px solid #BAE6FD; padding:2px 6px; border-radius:3px;">SLA ${sla.sla_hours}h</span>`;
  }
};
