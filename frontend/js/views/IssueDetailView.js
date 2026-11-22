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
          <div style="display:flex; gap:8px; align-items:center;">
            <label style="font-size:12px; font-weight:600;">Update Status:</label>
            <select id="admin-status-select" class="form-select" style="width:160px; height:34px; font-size:12px;">
              <option value="reported" ${(issue.status || '').toLowerCase() === 'reported' ? 'selected' : ''}>Reported</option>
              <option value="in_progress" ${(issue.status || '').toLowerCase() === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="resolved" ${(issue.status || '').toLowerCase() === 'resolved' ? 'selected' : ''}>Resolved</option>
            </select>
            <button id="admin-btn-save-status" class="btn btn-primary btn-sm">Update Status</button>
          </div>
        </div>
      `;
    }

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
      try {
        const res = await window.api.patch(`/admin/issues/${issue.id}/status`, { status: newStatus });
        if (res.success) {
          alert(`Status successfully updated to ${newStatus}`);
          this.issueData.status = newStatus;
          this.renderDetail();
        } else {
          alert(res.message || 'Update failed');
        }
      } catch (err) {
        alert('Update error: ' + err.message);
      }
    });
  }
};
