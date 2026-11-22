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
  }
};
