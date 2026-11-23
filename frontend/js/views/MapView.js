// public/js/views/MapView.js - Fullscreen Municipal GIS Map View

window.MapView = {
  mapInstance: null,

  async render() {
    return `
      <div class="container-fluid" style="padding-top: var(--space-4); padding-bottom: var(--space-6);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div>
            <h1 style="font-size:var(--text-lg); font-weight:800; margin-bottom:2px;">Municipal GIS Live Map</h1>
            <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:0;">Live spatial distribution of municipal issues across Sonipat.</p>
          </div>

          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <select id="map-ward-select" class="form-select" style="width:160px; height:34px; font-size:12px;">
              <option value="all">All Wards</option>
              <option value="ward_1">Ward 1 (Model Town)</option>
              <option value="ward_2">Ward 2 (Subhash Chowk)</option>
              <option value="ward_3">Ward 3 (Railway Station)</option>
              <option value="ward_4">Ward 4 (Murthal Road)</option>
              <option value="ward_5">Ward 5 (Sector 23)</option>
            </select>
            <select id="map-category-select" class="form-select" style="width:160px; height:34px; font-size:12px;">
              <option value="all">All Categories</option>
              <option value="road_pothole">Roads & Potholes</option>
              <option value="streetlight">Streetlights</option>
              <option value="garbage">Garbage</option>
              <option value="drainage_sewage">Drainage</option>
              <option value="water_leakage">Water Leakage</option>
              <option value="public_infrastructure">Public Infra</option>
            </select>
          </div>
        </div>

        <!-- Legend Bar -->
        <div style="display:flex; gap:16px; align-items:center; font-size:11px; margin-bottom:8px; background:#FFFFFF; padding:6px 12px; border:1px solid var(--color-border-subtle); border-radius:var(--radius-sm); flex-wrap:wrap;">
          <span style="font-weight:700; color:var(--color-text-tertiary);">LEGEND:</span>
          <span style="display:flex; align-items:center; gap:4px;"><span class="custom-map-marker marker-critical" style="width:10px; height:10px;"></span> Critical</span>
          <span style="display:flex; align-items:center; gap:4px;"><span class="custom-map-marker marker-high" style="width:10px; height:10px;"></span> High</span>
          <span style="display:flex; align-items:center; gap:4px;"><span class="custom-map-marker marker-medium" style="width:10px; height:10px;"></span> Medium</span>
          <span style="display:flex; align-items:center; gap:4px;"><span class="custom-map-marker marker-low" style="width:10px; height:10px;"></span> Low</span>
          <span style="display:flex; align-items:center; gap:4px;"><span class="custom-map-marker marker-resolved" style="width:10px; height:10px;"></span> Resolved</span>
        </div>

        <div id="full-map" class="map-viewport" style="height:calc(100vh - 200px); min-height:480px;"></div>
      </div>
    `;
  },

  async afterMount() {
    this.mapInstance = new window.IssueMap('full-map', { zoom: 14 });
    this.mapInstance.init();

    await this.refreshMap();

    document.getElementById('map-category-select')?.addEventListener('change', () => this.refreshMap());
    document.getElementById('map-ward-select')?.addEventListener('change', () => this.refreshMap());
  },

  async refreshMap() {
    const category = document.getElementById('map-category-select')?.value || 'all';
    const ward = document.getElementById('map-ward-select')?.value || 'all';
    try {
      const res = await window.api.get('/issues', { limit: 100, category, ward });
      if (res.success) {
        this.mapInstance.renderIssues(res.data.issues || []);
      }
    } catch (e) {
      console.error('Failed to load map markers:', e);
    }
  }
};
