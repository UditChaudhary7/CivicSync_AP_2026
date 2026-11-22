// public/js/views/CitizenReportView.js - Civic Issue Reporting with Map Picker & Duplicate Warning

window.CitizenReportView = {
  mapInstance: null,

  async render() {
    if (!window.api.getUser()) {
      return `
        <div class="container" style="padding-top:40px; text-align:center;">
          <div class="card" style="max-width:480px; margin:0 auto; padding:32px;">
            <h2 style="margin-bottom:8px;">Citizen Authentication Required</h2>
            <p style="color:var(--color-text-secondary); margin-bottom:20px; font-size:14px;">
              Please sign in to submit a verified civic issue to the municipality.
            </p>
            <a href="#/login" class="btn btn-primary">Login or Register</a>
          </div>
        </div>
      `;
    }

    return `
      <div class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-10); max-width:800px;">
        <h1 style="font-size:var(--text-xl); font-weight:800; margin-bottom:4px;">Report a Civic Issue</h1>
        <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:var(--space-6);">
          Pinpoint the issue on the map, describe the problem, and attach a photo for municipal inspection.
        </p>

        <!-- Dynamic Duplicate Alert Box -->
        <div id="duplicate-warning-box" style="display:none;" class="alert-duplicate"></div>

        <form id="report-issue-form" class="card" style="padding:24px;">
          <!-- Title -->
          <div class="form-group">
            <label class="form-label" for="report-title">Issue Title *</label>
            <input type="text" id="report-title" class="form-input" placeholder="e.g. Deep pothole cluster near Subhash Chowk" required />
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <!-- Category -->
            <div class="form-group">
              <label class="form-label" for="report-category">Category *</label>
              <select id="report-category" class="form-select" required>
                <option value="road_pothole">Road / Pothole</option>
                <option value="streetlight">Streetlight</option>
                <option value="garbage">Garbage / Sanitation</option>
                <option value="drainage_sewage">Drainage / Sewage</option>
                <option value="water_leakage">Water Leakage</option>
                <option value="public_infrastructure">Public Infrastructure</option>
              </select>
            </div>

            <!-- Severity -->
            <div class="form-group">
              <label class="form-label" for="report-severity">Severity Level *</label>
              <select id="report-severity" class="form-select" required>
                <option value="low">Low (Minor inconvenience)</option>
                <option value="medium" selected>Medium (Standard attention)</option>
                <option value="high">High (Urgent disruption)</option>
                <option value="critical">Critical (Immediate safety hazard)</option>
              </select>
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label class="form-label" for="report-desc">Description *</label>
            <textarea id="report-desc" class="form-textarea" rows="3" placeholder="Provide clear details about the hazard..." required></textarea>
          </div>

          <!-- Map Picker -->
          <div class="form-group">
            <label class="form-label">Location on Map (Click to pinpoint) *</label>
            <div id="report-map" class="map-viewport" style="height:260px; margin-bottom:8px;"></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label style="font-size:11px; color:var(--color-text-secondary);">Latitude</label>
                <input type="text" id="report-lat" class="form-input" value="28.9931" readonly />
              </div>
              <div>
                <label style="font-size:11px; color:var(--color-text-secondary);">Longitude</label>
                <input type="text" id="report-lng" class="form-input" value="77.0151" readonly />
              </div>
            </div>
          </div>

          <!-- Address -->
          <div class="form-group">
            <label class="form-label" for="report-address">Street / Landmark Address</label>
            <input type="text" id="report-address" class="form-input" placeholder="e.g. Subhash Chowk, Kakroi Road, Sonipat" />
          </div>

          <!-- Photo Upload (Single image, max 2MB) -->
          <div class="form-group">
            <label class="form-label" for="report-photo">Photo Evidence (Optional, max 2 MB)</label>
            <input type="file" id="report-photo" class="form-input" accept="image/*" />
          </div>

          <!-- Submit Button -->
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
            <a href="#/explore" class="btn btn-secondary">Cancel</a>
            <button type="submit" id="btn-submit-report" class="btn btn-primary">Submit Report</button>
          </div>
        </form>
      </div>
    `;
  },

  async afterMount() {
    if (!window.api.getUser()) return;

    const latInput = document.getElementById('report-lat');
    const lngInput = document.getElementById('report-lng');

    // Initialize Map with location picker enabled
    this.mapInstance = new window.IssueMap('report-map', {
      center: [28.9931, 77.0151],
      zoom: 15,
      enablePicker: true,
      onLocationPicked: (lat, lng) => {
        latInput.value = lat.toFixed(6);
        lngInput.value = lng.toFixed(6);
        this.checkDuplicates();
      }
    });
    this.mapInstance.init();
    this.mapInstance.setPickerLocation(28.9931, 77.0151);

    document.getElementById('report-category')?.addEventListener('change', () => this.checkDuplicates());

    // Submit form handler
    document.getElementById('report-issue-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-report');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      const formData = new FormData();
      formData.append('title', document.getElementById('report-title').value);
      formData.append('description', document.getElementById('report-desc').value);
      formData.append('category', document.getElementById('report-category').value);
      formData.append('severity', document.getElementById('report-severity').value);
      formData.append('latitude', latInput.value);
      formData.append('longitude', lngInput.value);
      formData.append('address', document.getElementById('report-address').value);

      const fileInput = document.getElementById('report-photo');
      if (fileInput.files.length > 0) {
        formData.append('photo', fileInput.files[0]);
      }

      try {
        const res = await window.api.postForm('/issues', formData);
        if (res.success) {
          alert('Issue reported successfully!');
          window.location.hash = `#/issues/${res.data.issue.id}`;
        } else {
          alert(res.message || 'Failed to submit issue');
          if (res.message && (res.message.includes('token') || res.message.includes('session') || res.message.includes('sign in'))) {
            window.location.hash = '#/login';
          }
          btn.disabled = false;
          btn.textContent = 'Submit Report';
        }
      } catch (err) {
        alert('Submission failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Submit Report';
      }
    });
  },

  // Check for candidate duplicates within 500 meters
  async checkDuplicates() {
    const category = document.getElementById('report-category')?.value;
    const lat = document.getElementById('report-lat')?.value;
    const lng = document.getElementById('report-lng')?.value;
    if (!category || !lat || !lng) return;

    try {
      const res = await window.api.post('/issues/check-duplicate', { category, latitude: lat, longitude: lng });
      const warningBox = document.getElementById('duplicate-warning-box');
      if (res.success && res.data.duplicates.length > 0) {
        const top = res.data.duplicates[0];
        warningBox.style.display = 'block';
        warningBox.innerHTML = `
          <strong>⚠️ Possible Duplicate Issue Nearby:</strong><br />
          Another issue (<em>"${window.api.escapeHtml(top.title)}"</em>) was reported <strong>${top.distance_meters} meters away</strong> in this category.
          <br /><a href="#/issues/${top.id}" style="color:#C2410C; font-weight:700; text-decoration:underline;">Click here to view and upvote that issue</a> instead of submitting a new one.
        `;
      } else if (warningBox) {
        warningBox.style.display = 'none';
      }
    } catch (e) {
      console.error(e);
    }
  }
};
