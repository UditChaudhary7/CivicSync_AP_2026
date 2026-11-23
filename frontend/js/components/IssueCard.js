// public/js/components/IssueCard.js - Modular Card for Displaying Civic Issues

window.IssueCard = {
  // Render an individual civic issue card with status, severity, and upvote action
  render(issue) {
    const statusBadge = window.StatusBadge.renderStatus(issue.status);
    const severityBadge = window.StatusBadge.renderSeverity(issue.severity);
    const priorityBadge = window.StatusBadge.renderPriority(issue.priority);

    const photoHtml = issue.photo_url
      ? `<div style="height: 140px; margin:-16px -16px 12px -16px; overflow:hidden; border-radius: var(--radius-md) var(--radius-md) 0 0;">
           <img src="${issue.photo_url}" alt="Issue photo" style="width:100%; height:100%; object-fit:cover;" />
         </div>`
      : '';

    return `
      <div class="card issue-card" id="card-issue-${issue.id}">
        ${photoHtml}
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:4px;">
            <span style="font-size:11px; font-weight:700; color:var(--color-text-tertiary);">${window.api.escapeHtml(issue.tracking_number)}</span>
            <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
              ${window.StatusBadge.renderSLA ? window.StatusBadge.renderSLA(issue) : ''}
              ${severityBadge}
              ${statusBadge}
            </div>
          </div>
          <h3 style="margin-bottom:6px;">
            <a href="#/issues/${issue.id}" class="issue-card-title">${window.api.escapeHtml(issue.title)}</a>
          </h3>
          <p style="font-size:13px; color:var(--color-text-secondary); margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${window.api.escapeHtml(issue.description)}
          </p>
          <div style="font-size:12px; color:var(--color-text-muted); margin-bottom:12px;">
            📍 ${window.api.escapeHtml(issue.address || 'Sonipat, Haryana')}
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--color-border-subtle); padding-top:10px; margin-top:8px;">
          ${priorityBadge}
          <button class="btn btn-secondary btn-sm card-upvote-btn" data-id="${issue.id}">
            ▲ <span class="vote-count">${issue.upvotes || 0}</span>
          </button>
        </div>
      </div>
    `;
  },

  // Attach click handler to upvote buttons inside any parent container
  bindEvents(container) {
    if (!container) return;
    container.querySelectorAll('.card-upvote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!window.api.getUser()) {
          alert('Please login to upvote this issue.');
          window.location.hash = '#/login';
          return;
        }
        const id = btn.getAttribute('data-id');
        try {
          const res = await window.api.post(`/issues/${id}/upvote`);
          if (res.success) {
            btn.querySelector('.vote-count').textContent = res.data.upvotes;
            if (res.data.has_upvoted) btn.classList.add('btn-primary');
            else btn.classList.remove('btn-primary');
          }
        } catch (err) {
          console.error('Upvote failed:', err);
        }
      });
    });
  }
};
