// public/js/views/AdminDashboardView.js - Municipal Operations Dashboard

window.AdminDashboardView = {
  async render() {
    if (!window.api.isAdmin()) {
      return `
        <div class="container" style="padding-top:40px; text-align:center;">
          <div class="card" style="max-width:440px; margin:0 auto; padding:24px;">
            <h2 style="color:var(--color-status-critical);">Access Restricted</h2>
            <p style="color:var(--color-text-secondary); margin:12px 0 20px 0;">This panel is restricted to municipal administrators.</p>
            <a href="#/login" class="btn btn-primary">Admin Sign In</a>
          </div>
        </div>
      `;
    }

    return `
      <div class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-10);">
        <div style="margin-bottom: var(--space-6);">
          <h1 style="font-size:var(--text-xl); font-weight:800; margin-bottom:4px;">Municipal Operations Dashboard</h1>
          <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:0;">Live status management for all civic complaints across Sonipat.</p>
        </div>

        <!-- Metric Cards -->
        <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
          <div class="metric-card">
            <div class="metric-label">Total Complaints</div>
            <div class="metric-value" id="admin-stat-total">-</div>
            <div class="metric-sub">All logged reports</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Reported (Pending)</div>
            <div class="metric-value" id="admin-stat-reported" style="color:var(--color-status-medium);">-</div>
            <div class="metric-sub">Awaiting field crew</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">In Progress</div>
            <div class="metric-value" id="admin-stat-progress" style="color:var(--color-status-low);">-</div>
            <div class="metric-sub">Active repairs</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Resolved</div>
            <div class="metric-value" id="admin-stat-resolved" style="color:var(--color-status-resolved);">-</div>
            <div class="metric-sub">Closed tickets</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">SLA Breached</div>
            <div class="metric-value" id="admin-stat-breached" style="color:var(--color-status-critical);">-</div>
            <div class="metric-sub">Overdue resolution</div>
          </div>
        </div>

        <!-- Municipal Resolution Efficiency Bar -->
        <div style="background:#FFFFFF; border:1px solid var(--color-border-subtle); border-radius:var(--radius-sm); padding:12px 16px; margin-bottom:var(--space-6); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="font-size:12px; font-weight:600; color:var(--color-text-primary);">
            Municipal Resolution Efficiency: <span id="admin-resolution-rate" style="font-weight:800; color:#1E3A8A;">0%</span>
          </div>
          <div style="flex:1; max-width:320px; height:8px; background:#E2E8F0; border-radius:4px; overflow:hidden;">
            <div id="admin-resolution-bar" style="width:0%; height:100%; background:#16A34A; transition:width 0.5s;"></div>
          </div>
        </div>

        <!-- Issues Management Table -->
        <div class="card" style="padding:0; overflow:hidden;">
          <div style="padding:16px; border-bottom:1px solid var(--color-border-subtle); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <h3 style="font-size:14px; font-weight:700;">All Municipal Reports</h3>
              <span style="font-size:11px; color:var(--color-text-tertiary);">Change status in real time and track SLA compliance</span>
            </div>
            <button id="btn-export-csv" class="btn btn-secondary btn-sm" style="display:flex; align-items:center; gap:6px;">
              📥 Export to CSV
            </button>
          </div>

          <div style="overflow-x:auto;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Title & Location</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>SLA Status</th>
                  <th>Current Status</th>
                  <th>Update Action</th>
                </tr>
              </thead>
              <tbody id="admin-issues-table-body">
                <tr><td colspan="8" style="text-align:center; padding:24px;">Loading complaints...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async afterMount() {
    if (!window.api.isAdmin()) return;

    try {
      // 1. Fetch Metrics
      const statsRes = await window.api.get('/admin/stats');
      if (statsRes.success) {
        const s = statsRes.data.stats;
        document.getElementById('admin-stat-total').textContent = s.total;
        document.getElementById('admin-stat-reported').textContent = s.reported;
        document.getElementById('admin-stat-progress').textContent = s.in_progress;
        document.getElementById('admin-stat-resolved').textContent = s.resolved;
        if (document.getElementById('admin-stat-breached')) {
          document.getElementById('admin-stat-breached').textContent = s.sla_breached || 0;
        }
        if (document.getElementById('admin-resolution-rate')) {
          document.getElementById('admin-resolution-rate').textContent = `${s.resolution_rate || 0}%`;
        }
        if (document.getElementById('admin-resolution-bar')) {
          document.getElementById('admin-resolution-bar').style.width = `${s.resolution_rate || 0}%`;
        }
      }

      // Bind CSV export button
      document.getElementById('btn-export-csv')?.addEventListener('click', async () => {
        try {
          const token = window.api.getToken();
          const response = await fetch('/api/admin/export/csv', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Failed to generate CSV export');
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `civicsync-complaints-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (err) {
          alert('Export error: ' + err.message);
        }
      });

      // 2. Fetch All Issues
      const issuesRes = await window.api.get('/issues', { limit: 50 });
      const tbody = document.getElementById('admin-issues-table-body');
      if (!tbody || !issuesRes.success) return;

      const issues = issuesRes.data.issues || [];
      if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px;">No complaints recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = issues.map(issue => `
        <tr>
          <td style="font-weight:700; font-size:11px; color:#1E3A8A;">${issue.tracking_number}</td>
          <td>
            <a href="#/issues/${issue.id}" style="font-weight:600; color:var(--color-text-primary); text-decoration:none;">${window.api.escapeHtml(issue.title)}</a>
            <div style="font-size:11px; color:var(--color-text-muted);">${window.api.escapeHtml(issue.address || '')}</div>
          </td>
          <td style="font-size:12px;">${issue.category.replace(/_/g, ' ')}</td>
          <td>${window.StatusBadge.renderSeverity(issue.severity)}</td>
          <td>${window.StatusBadge.renderPriority(issue.priority)}</td>
          <td>${window.StatusBadge.renderSLA ? window.StatusBadge.renderSLA(issue) : ''}</td>
          <td>${window.StatusBadge.renderStatus(issue.status)}</td>
          <td>
            <select class="form-select admin-row-status-select" data-id="${issue.id}" style="height:30px; font-size:11px; width:120px;">
              <option value="reported" ${(issue.status || '').toLowerCase() === 'reported' ? 'selected' : ''}>Reported</option>
              <option value="in_progress" ${(issue.status || '').toLowerCase() === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="resolved" ${(issue.status || '').toLowerCase() === 'resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </td>
        </tr>
      `).join('');

      // Bind quick status update change events
      tbody.querySelectorAll('.admin-row-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const id = select.getAttribute('data-id');
          const newStatus = select.value;
          try {
            const res = await window.api.patch(`/admin/issues/${id}/status`, { status: newStatus });
            if (res.success) {
              alert(`Updated #${res.data.issue.tracking_number} to ${newStatus}`);
              window.AdminDashboardView.afterMount(); // Refresh stats and rows
            } else {
              alert(res.message || 'Failed to update status');
            }
          } catch (err) {
            alert('Error updating status: ' + err.message);
          }
        });
      });

    } catch (e) {
      console.error('Failed to load admin dashboard:', e);
    }
  }
};
