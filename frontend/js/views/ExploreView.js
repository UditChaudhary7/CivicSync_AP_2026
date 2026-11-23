// public/js/views/ExploreView.js - Paginated Civic Issues Directory

window.ExploreView = {
  currentPage: 1,

  async render() {
    return `
      <div class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-10);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-4); flex-wrap:wrap; gap:12px;">
          <div>
            <h1 style="font-size:var(--text-xl); font-weight:800;">Explore Civic Issues</h1>
            <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:0;">Browse and upvote public complaints across Sonipat municipality.</p>
          </div>
          <a href="#/report" class="btn btn-primary btn-sm">+ Report New Issue</a>
        </div>

        <!-- Filter Bar -->
        <div class="card" style="margin-bottom: var(--space-4); padding: 12px;">
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:10px;">
            <input type="text" id="filter-search" class="form-input" placeholder="🔍 Search title, description, landmark, or tracking #..." style="flex:1; min-width:220px; height:34px; font-size:12px;" />
            <select id="filter-ward" class="form-select" style="width:170px; height:34px; padding:4px 8px; font-size:12px;">
              <option value="all">All Wards (Sonipat)</option>
              <option value="ward_1">Ward 1 (Sec 14 & Model Town)</option>
              <option value="ward_2">Ward 2 (Subhash & Old DC)</option>
              <option value="ward_3">Ward 3 (Railway & Atlas)</option>
              <option value="ward_4">Ward 4 (Murthal & Sec 15)</option>
              <option value="ward_5">Ward 5 (Sec 23 & Rathdhana)</option>
            </select>
            <select id="filter-sort" class="form-select" style="width:150px; height:34px; padding:4px 8px; font-size:12px;">
              <option value="priority">Highest Priority</option>
              <option value="most_upvoted">Most Upvoted</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <select id="filter-category" class="form-select" style="width:170px; height:34px; padding:4px 8px; font-size:12px;">
              <option value="all">All Categories</option>
              <option value="road_pothole">Roads & Potholes</option>
              <option value="streetlight">Street Lighting</option>
              <option value="garbage">Garbage & Sanitation</option>
              <option value="drainage_sewage">Drainage & Sewage</option>
              <option value="water_leakage">Water Leakage</option>
              <option value="public_infrastructure">Public Infrastructure</option>
            </select>

            <select id="filter-status" class="form-select" style="width:140px; height:34px; padding:4px 8px; font-size:12px;">
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select id="filter-severity" class="form-select" style="width:140px; height:34px; padding:4px 8px; font-size:12px;">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button id="btn-apply-filter" class="btn btn-primary btn-sm" style="height:34px;">Apply Filters</button>
            <button id="btn-reset-filter" class="btn btn-secondary btn-sm" style="height:34px;">Reset</button>
          </div>
        </div>

        <!-- Grid Container -->
        <div id="explore-grid" class="issue-grid" style="margin-bottom: var(--space-6);"></div>

        <!-- Pagination Controls -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--color-border-subtle); padding-top:16px;">
          <span id="explore-page-info" style="font-size:var(--text-xs); color:var(--color-text-secondary);">Page 1 of 1</span>
          <div style="display:flex; gap:8px;">
            <button id="btn-prev-page" class="btn btn-secondary btn-sm" disabled>Previous</button>
            <button id="btn-next-page" class="btn btn-secondary btn-sm" disabled>Next</button>
          </div>
        </div>
      </div>
    `;
  },

  async afterMount() {
    this.currentPage = 1;
    await this.loadIssues();

    const triggerFilter = () => {
      this.currentPage = 1;
      this.loadIssues();
    };

    document.getElementById('btn-apply-filter')?.addEventListener('click', triggerFilter);
    document.getElementById('filter-search')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerFilter();
    });
    document.getElementById('filter-ward')?.addEventListener('change', triggerFilter);
    document.getElementById('filter-sort')?.addEventListener('change', triggerFilter);
    document.getElementById('filter-category')?.addEventListener('change', triggerFilter);
    document.getElementById('filter-status')?.addEventListener('change', triggerFilter);
    document.getElementById('filter-severity')?.addEventListener('change', triggerFilter);

    document.getElementById('btn-reset-filter')?.addEventListener('click', () => {
      document.getElementById('filter-search').value = '';
      document.getElementById('filter-ward').value = 'all';
      document.getElementById('filter-sort').value = 'priority';
      document.getElementById('filter-category').value = 'all';
      document.getElementById('filter-status').value = 'all';
      document.getElementById('filter-severity').value = 'all';
      this.currentPage = 1;
      this.loadIssues();
    });

    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadIssues();
      }
    });

    document.getElementById('btn-next-page')?.addEventListener('click', () => {
      this.currentPage++;
      this.loadIssues();
    });
  },

  async loadIssues() {
    const search = document.getElementById('filter-search')?.value || '';
    const ward = document.getElementById('filter-ward')?.value || 'all';
    const sortBy = document.getElementById('filter-sort')?.value || 'priority';
    const category = document.getElementById('filter-category')?.value || 'all';
    const status = document.getElementById('filter-status')?.value || 'all';
    const severity = document.getElementById('filter-severity')?.value || 'all';

    const res = await window.api.get('/issues', {
      page: this.currentPage,
      limit: 20,
      search,
      ward,
      sortBy,
      category,
      status,
      severity
    });

    const grid = document.getElementById('explore-grid');
    if (!grid || !res.success) return;

    const issues = res.data.issues || [];
    if (issues.length === 0) {
      grid.innerHTML = '<div style="padding:32px; color:var(--color-text-secondary); grid-column:1/-1;">No issues found matching your filters.</div>';
    } else {
      grid.innerHTML = issues.map(i => window.IssueCard.render(i)).join('');
      window.IssueCard.bindEvents(grid);
    }

    const { page, totalPages, total } = res.data.pagination;
    document.getElementById('explore-page-info').textContent = `Showing page ${page} of ${totalPages || 1} (${total} total)`;
    document.getElementById('btn-prev-page').disabled = page <= 1;
    document.getElementById('btn-next-page').disabled = page >= totalPages;
  }
};
