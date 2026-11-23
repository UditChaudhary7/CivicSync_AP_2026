// public/js/views/IssueDetailView.js - Single Issue View with Mini-Map & Admin Status Controls

window.IssueDetailView = {
  issueId: null,
  issueData: null,
  mapInstance: null,

  async render() {
    return `<div class="container" id="issue-detail-content" style="padding-top:24px; padding-bottom:40px;">Loading report details...</div>`;
  },

  async afterMount() {
    const hash = window.location.hash;
    const parts = hash.split('/');
    this.issueId = parts[2];
    if (!this.issueId) return;

    try {
      const res = await window.api.get(`/issues/${this.issueId}`);
      if (!res.success || !res.data.issue) {
        document.getElementById('issue-detail-content').innerHTML = `
          <div class="card" style="padding:32px; text-align:center;">
            <h2>Issue Not Found</h2>
            <p style="color:var(--color-text-secondary); margin:8px 0 16px 0;">No report matches reference #${window.api.escapeHtml(this.issueId)}.</p>
            <a href="#/explore" class="btn btn-primary btn-sm">Return to Explore</a>
          </div>
        `;
        return;
      }

      this.issueData = res.data.issue;
      this.renderDetail();
    } catch (e) {
      console.error('Failed to load issue details:', e);
    }
  },

  renderDetail() {
    const issue = this.issueData;
    const isAdmin = window.api.isAdmin();

    const statusBadge = window.StatusBadge.renderStatus(issue.status);
    const severityBadge = window.StatusBadge.renderSeverity(issue.severity);
    const priorityBadge = window.StatusBadge.renderPriority(issue.priority);

    const photoHtml = issue.photo_url
      ? `<div style="margin-bottom:16px; border-radius:4px; overflow:hidden; border:1px solid var(--color-border-subtle);">
           <img src="${issue.photo_url}" alt="Report photo" style="width:100%; max-height:360px; object-fit:contain; background:#111827;" />
         </div>`
      : '';

    // Admin status update panel (Reported -> In Progress -> Resolved)
    let adminControlsHtml = '';
    if (isAdmin) {
      adminControlsHtml = `
        <div class="card" style="margin-top:20px; background:#F8FAFC; border:1px solid #CBD5E1; padding:16px;">
          <h3 style="font-size:14px; font-weight:700; color:#0F172A; margin-bottom:8px;">Municipal Admin Actions</h3>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
            <label style="font-size:12px; font-weight:600;">Update Status:</label>
            <select id="admin-status-select" class="form-select" style="width:160px; height:34px; font-size:12px;">
              <option value="reported" ${(issue.status || '').toLowerCase() === 'reported' ? 'selected' : ''}>Reported</option>
              <option value="in_progress" ${(issue.status || '').toLowerCase() === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="resolved" ${(issue.status || '').toLowerCase() === 'resolved' ? 'selected' : ''}>Resolved</option>
            </select>
            <button id="admin-btn-save-status" class="btn btn-primary btn-sm">Update Status</button>
          </div>
          <div>
            <input type="text" id="admin-status-remarks" class="form-input" placeholder="Resolution / action remarks (e.g. Dispatched PWD road repair crew)" style="height:34px; font-size:12px; width:100%;" />
          </div>
        </div>
      `;
    }

    const historyItems = issue.status_history || [];
    const timelineHtml = `
      <div style="margin-top:24px; border-top:1px solid var(--color-border-subtle); padding-top:16px;">
        <h4 style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--color-text-secondary); margin-bottom:12px;">Lifecycle Audit Timeline</h4>
        <div class="timeline-container" style="display:flex; flex-direction:column; gap:12px;">
          ${historyItems.length === 0 ? '<div style="font-size:12px; color:var(--color-text-tertiary);">No status transitions logged yet.</div>' : historyItems.map((h, i) => `
            <div style="display:flex; gap:12px; align-items:flex-start;">
              <div style="width:10px; height:10px; border-radius:50%; background:${h.new_status === 'RESOLVED' ? '#16A34A' : h.new_status === 'IN_PROGRESS' ? '#2563EB' : '#F59E0B'}; margin-top:4px; flex-shrink:0;"></div>
              <div style="flex:1; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:10px 14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-size:12px; font-weight:700; color:#1E293B;">
                    ${h.previous_status ? `${h.previous_status} → ` : ''}<strong>${h.new_status}</strong>
                  </span>
                  <span style="font-size:11px; color:#64748B;">${new Date(h.created_at).toLocaleString()}</span>
                </div>
                <div style="font-size:12px; color:#475569;">
                  Action recorded by <strong>${window.api.escapeHtml(h.changed_by_name)}</strong> <span style="font-size:10px; background:#E2E8F0; padding:1px 6px; border-radius:3px; margin-left:4px;">${h.changed_by_role}</span>
                </div>
                ${h.remarks ? `<div style="font-size:12px; color:#0F172A; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:4px; padding:6px 10px; margin-top:6px; font-style:italic;">💬 "${window.api.escapeHtml(h.remarks)}"</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const commentsList = issue.comments || [];
    const isUserLoggedIn = !!window.api.getUser();
    const commentsHtml = `
      <div style="margin-top:24px; border-top:1px solid var(--color-border-subtle); padding-top:16px;">
        <h4 style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--color-text-secondary); margin-bottom:12px;">
          Community Discussion (<span id="comment-counter">${commentsList.length}</span>)
        </h4>

        <!-- Comments List -->
        <div id="comments-container" style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
          ${commentsList.length === 0 ? '<div id="no-comments-msg" style="font-size:12px; color:var(--color-text-tertiary);">No comments yet. Be the first to share an update.</div>' : commentsList.map(c => `
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:12px; font-weight:700; color:#0F172A;">${window.api.escapeHtml(c.author_name)}</span>
                  <span style="font-size:10px; font-weight:600; padding:1px 6px; border-radius:3px; background:${c.author_role === 'ADMIN' ? '#E0E7FF; color:#3730A3' : '#F1F5F9; color:#475569'};">${c.author_role}</span>
                </div>
                <span style="font-size:11px; color:#64748B;">${new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p style="font-size:13px; color:#334155; margin:0; line-height:1.5;">${window.api.escapeHtml(c.content)}</p>
            </div>
          `).join('')}
        </div>

        <!-- Add Comment Form -->
        ${isUserLoggedIn ? `
          <div style="display:flex; flex-direction:column; gap:8px;">
            <textarea id="comment-input" class="form-textarea" rows="2" placeholder="Write an update or remark about this issue..." style="font-size:13px; resize:vertical;"></textarea>
            <div style="display:flex; justify-content:flex-end;">
              <button id="btn-submit-comment" class="btn btn-primary btn-sm">Post Update</button>
            </div>
          </div>
        ` : `
          <div style="font-size:12px; color:var(--color-text-secondary); background:#F1F5F9; padding:10px 14px; border-radius:6px; text-align:center;">
            Please <a href="#/login" style="font-weight:600; color:var(--color-accent-primary);">Sign In</a> to post a comment or update.
          </div>
        `}
      </div>
    `;

    const html = `
      <div style="margin-bottom:12px;">
        <a href="#/explore" style="font-size:12px; color:var(--color-text-secondary); text-decoration:none;">← Back to Issues</a>
      </div>

      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; align-items:start;">
        <!-- Left: Issue Narrative & Photo -->
        <div class="card" style="padding:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:12px; font-weight:700; color:var(--color-text-tertiary);">${issue.tracking_number}</span>
            <div style="display:flex; gap:6px;">
              ${severityBadge}
              ${statusBadge}
            </div>
          </div>

          <h1 style="font-size:22px; font-weight:800; margin-bottom:12px;">${window.api.escapeHtml(issue.title)}</h1>

          ${photoHtml}

          <div style="margin-bottom:20px;">
            <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--color-text-secondary); margin-bottom:4px;">Description</h4>
            <p style="font-size:14px; line-height:1.6; color:var(--color-text-primary);">${window.api.escapeHtml(issue.description)}</p>
          </div>

          <div style="border-top:1px solid var(--color-border-subtle); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:12px; color:var(--color-text-tertiary);">
              Reported by <strong>${window.api.escapeHtml(issue.reporter_name || 'Citizen')}</strong> on ${new Date(issue.created_at).toLocaleDateString()}
            </div>
            <button id="detail-btn-upvote" class="btn btn-secondary btn-sm">
              ▲ Upvote (<span id="detail-vote-count">${issue.upvotes || 0}</span>)
            </button>
          </div>

          ${adminControlsHtml}
          ${timelineHtml}
          ${commentsHtml}
        </div>

        <!-- Right: Map & Location Metadata -->
        <div class="card" style="padding:16px;">
          <h3 style="font-size:14px; font-weight:700; margin-bottom:8px;">Location & GPS Coordinates</h3>
          <div id="detail-mini-map" class="map-viewport" style="height:200px; margin-bottom:12px;"></div>
          <div style="font-size:12px; margin-bottom:8px;">
            <strong>Address:</strong><br />${window.api.escapeHtml(issue.address || 'Sonipat, Haryana')}
          </div>
          <div style="font-size:11px; color:var(--color-text-secondary); margin-bottom:12px;">
            <strong>GPS:</strong> ${Number(issue.latitude).toFixed(4)}, ${Number(issue.longitude).toFixed(4)}
          </div>
          <div style="border-top:1px solid var(--color-border-subtle); padding-top:10px;">
            <strong>Municipal Priority:</strong> ${priorityBadge}
          </div>
        </div>
      </div>
    `;

    document.getElementById('issue-detail-content').innerHTML = html;

    // Initialize Leaflet Mini-Map
    this.mapInstance = new window.IssueMap('detail-mini-map', {
      center: [issue.latitude, issue.longitude],
      zoom: 15,
      preventFitBounds: true
    });
    this.mapInstance.init();
    this.mapInstance.renderIssues([issue]);

    // Upvote handler
    document.getElementById('detail-btn-upvote')?.addEventListener('click', async () => {
      if (!window.api.getUser()) {
        alert('Please login to upvote.');
        window.location.hash = '#/login';
        return;
      }
      try {
        const res = await window.api.post(`/issues/${issue.id}/upvote`);
        if (res.success) {
          document.getElementById('detail-vote-count').textContent = res.data.upvotes;
          const btn = document.getElementById('detail-btn-upvote');
          if (res.data.has_upvoted) btn.classList.add('btn-primary');
          else btn.classList.remove('btn-primary');
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Admin status update handler
    document.getElementById('admin-btn-save-status')?.addEventListener('click', async () => {
      const newStatus = document.getElementById('admin-status-select').value;
      const remarks = document.getElementById('admin-status-remarks')?.value || '';
      try {
        const res = await window.api.patch(`/admin/issues/${issue.id}/status`, { status: newStatus, remarks });
        if (res.success) {
          alert(`Status successfully updated to ${newStatus}`);
          // Refetch issue details to update timeline and badges
          const reload = await window.api.get(`/issues/${issue.id}`);
          if (reload.success && reload.data.issue) {
            this.issueData = reload.data.issue;
            this.renderDetail();
          }
        } else {
          alert(res.message || 'Update failed');
        }
      } catch (err) {
        alert('Update error: ' + err.message);
      }
    });

    // Submit comment handler
    document.getElementById('btn-submit-comment')?.addEventListener('click', async () => {
      const input = document.getElementById('comment-input');
      const content = (input?.value || '').trim();
      if (!content) return alert('Please enter a comment.');

      try {
        const res = await window.api.post(`/issues/${issue.id}/comments`, { content });
        if (res.success && res.data.comment) {
          input.value = '';
          const noMsg = document.getElementById('no-comments-msg');
          if (noMsg) noMsg.remove();

          const c = res.data.comment;
          const container = document.getElementById('comments-container');
          const commentEl = document.createElement('div');
          commentEl.style.cssText = 'background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:12px;';
          commentEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:12px; font-weight:700; color:#0F172A;">${window.api.escapeHtml(c.author_name)}</span>
                <span style="font-size:10px; font-weight:600; padding:1px 6px; border-radius:3px; background:${c.author_role === 'ADMIN' ? '#E0E7FF; color:#3730A3' : '#F1F5F9; color:#475569'};">${c.author_role}</span>
              </div>
              <span style="font-size:11px; color:#64748B;">Just now</span>
            </div>
            <p style="font-size:13px; color:#334155; margin:0; line-height:1.5;">${window.api.escapeHtml(c.content)}</p>
          `;
          container.appendChild(commentEl);

          const counter = document.getElementById('comment-counter');
          if (counter) counter.textContent = parseInt(counter.textContent || '0') + 1;
        } else {
          alert(res.message || 'Failed to post comment');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }
};
