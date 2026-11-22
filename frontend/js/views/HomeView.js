// public/js/views/HomeView.js - Municipal Landing Page

window.HomeView = {
  mapInstance: null,

  async render() {
    return `
      <div class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-8);">
        <!-- Hero Section -->
        <div style="background-color: var(--color-surface-card); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: var(--space-6); margin-bottom: var(--space-6);">
          <div style="max-width: 680px;">
            <span class="badge badge-reported" style="margin-bottom: 8px;">Municipal Corporation Sonipat</span>
            <h1 style="font-size: var(--text-2xl); font-weight: 800; color: var(--color-text-primary); margin-bottom: 8px;">
              Civic Issue Reporting & Tracking Portal
            </h1>
            <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: 16px;">
              Report potholes, dark streetlights, garbage overflow, and water leakages directly to municipal authorities. Track repair progress with full transparency.
            </p>

            <!-- Quick Tracking Search -->
            <form id="home-tracking-form" style="display:flex; gap: 8px; max-width: 440px; margin-bottom: 16px;">
              <input type="text" id="home-tracking-input" class="form-input" placeholder="Enter tracking # (e.g. REP-2026-00101)" required />
              <button type="submit" class="btn btn-primary" style="white-space:nowrap;">Track</button>
            </form>

            <div style="display:flex; gap: 8px; flex-wrap:wrap;">
              <a href="#/report" class="btn btn-primary">Report an Issue</a>
              <a href="#/explore" class="btn btn-secondary">Explore Issues</a>
              <a href="#/map" class="btn btn-outline">Live Map</a>
            </div>
          </div>
        </div>

        <!-- Metrics Summary -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Total Reports</div>
            <div class="metric-value" id="home-stat-total">-</div>
            <div class="metric-sub">Citywide complaints</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Pending Triage</div>
            <div class="metric-value" id="home-stat-reported" style="color:var(--color-status-medium);">-</div>
            <div class="metric-sub">Newly reported</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">In Progress</div>
            <div class="metric-value" id="home-stat-progress" style="color:var(--color-status-low);">-</div>
            <div class="metric-sub">Under field repair</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Resolved</div>
            <div class="metric-value" id="home-stat-resolved" style="color:var(--color-status-resolved);">-</div>
            <div class="metric-sub">Repairs verified</div>
          </div>
        </div>

        <!-- Live City Map Section -->
        <div class="card" style="margin-bottom: var(--space-6);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 style="font-size:var(--text-lg); font-weight:700;">Live Geographic Map (Sonipat)</h2>
            <a href="#/map" class="btn btn-outline btn-sm">Full Map View →</a>
          </div>
          <div id="home-map" class="map-viewport" style="height:320px;"></div>
        </div>

        <!-- Recent Issues -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 style="font-size:var(--text-lg); font-weight:700;">Priority Civic Issues</h2>
            <a href="#/explore" style="font-size:var(--text-sm); color:var(--color-accent-primary); font-weight:600;">View All →</a>
          </div>
          <div id="home-recent-grid" class="issue-grid"></div>
        </div>
      </div>
    `;
  },

  async afterMount() {
    // Handle Quick Tracking Search
    document.getElementById('home-tracking-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('home-tracking-input').value.trim();
      if (code) window.location.hash = `#/issues/${encodeURIComponent(code)}`;
    });

    // Initialize Map Preview
    this.mapInstance = new window.IssueMap('home-map', { zoom: 13 });
    this.mapInstance.init();

    try {
      const res = await window.api.get('/issues', { limit: 6 });
      if (res.success) {
        const issues = res.data.issues || [];
        this.mapInstance.renderIssues(issues);

        const container = document.getElementById('home-recent-grid');
        if (container) {
          container.innerHTML = issues.map(i => window.IssueCard.render(i)).join('');
          window.IssueCard.bindEvents(container);
        }

        // Compute local counts
        document.getElementById('home-stat-total').textContent = res.data.pagination.total;
        document.getElementById('home-stat-reported').textContent = issues.filter(i => i.status === 'reported').length;
        document.getElementById('home-stat-progress').textContent = issues.filter(i => i.status === 'in_progress').length;
        document.getElementById('home-stat-resolved').textContent = issues.filter(i => i.status === 'resolved').length;
      }
    } catch (e) {
      console.error(e);
    }
  }
};
