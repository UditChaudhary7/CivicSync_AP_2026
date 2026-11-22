// public/js/components/IssueMap.js - Leaflet GIS Map with Colored Severity Markers

window.IssueMap = class IssueMap {
  constructor(elementId, options = {}) {
    this.elementId = elementId;
    this.options = options;
    this.map = null;
    this.markersGroup = null;
    this.radiusCircle = null;
    this.pickerMarker = null;
    this.defaultCenter = [28.9931, 77.0151]; // Sonipat Municipal Center, Haryana, India
  }

  // Initialize Leaflet map and tile layer
  init() {
    const el = document.getElementById(this.elementId);
    if (!el || typeof L === 'undefined') return;

    if (this.map) this.map.remove();

    this.map = L.map(this.elementId, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(this.options.center || this.defaultCenter, this.options.zoom || 14);

    // Standard OpenStreetMap tiles (100% free, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersGroup = L.featureGroup().addTo(this.map);

    // Click-to-pick GPS location for reporting an issue
    if (this.options.enablePicker) {
      this.map.on('click', (e) => {
        this.setPickerLocation(e.latlng.lat, e.latlng.lng);
        if (this.options.onLocationPicked) {
          this.options.onLocationPicked(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    setTimeout(() => this.map && this.map.invalidateSize(), 200);
  }

  // Move or create the draggable location picker pin
  setPickerLocation(lat, lng) {
    if (!this.map) return;
    if (this.pickerMarker) {
      this.pickerMarker.setLatLng([lat, lng]);
    } else {
      this.pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.pickerMarker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        if (this.options.onLocationPicked) {
          this.options.onLocationPicked(pos.lat, pos.lng);
        }
      });
    }
    this.map.panTo([lat, lng]);
  }

  // Render colored issue markers on the map
  renderIssues(issues = []) {
    if (!this.markersGroup) return;
    this.markersGroup.clearLayers();

    issues.forEach(issue => {
      if (!issue.latitude || !issue.longitude) return;

      // Color code: Green=Resolved, Red=Critical, Orange=High, Yellow=Medium, Blue=Low
      let markerClass = 'marker-low';
      const st = (issue.status || '').toLowerCase();
      const sev = (issue.severity || '').toLowerCase();
      if (st === 'resolved') markerClass = 'marker-resolved';
      else if (sev === 'critical') markerClass = 'marker-critical';
      else if (sev === 'high') markerClass = 'marker-high';
      else if (sev === 'medium') markerClass = 'marker-medium';

      const icon = L.divIcon({
        className: `custom-map-marker ${markerClass}`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const popupHtml = `
        <div style="font-family:sans-serif; font-size:12px; max-width:200px;">
          <div style="font-size:10px; font-weight:700; color:#6B7280;">${issue.tracking_number}</div>
          <div style="font-weight:700; margin:2px 0 4px 0;">${window.api.escapeHtml(issue.title)}</div>
          <div style="margin-bottom:6px;">
            ${window.StatusBadge.renderStatus(issue.status)}
            ${window.StatusBadge.renderSeverity(issue.severity)}
          </div>
          <a href="#/issues/${issue.id}" style="color:#1E3A8A; font-weight:600; text-decoration:underline;">View Details →</a>
        </div>
      `;

      const marker = L.marker([issue.latitude, issue.longitude], { icon }).bindPopup(popupHtml);
      this.markersGroup.addLayer(marker);
    });

    if (issues.length > 0 && !this.options.preventFitBounds) {
      try {
        this.map.fitBounds(this.markersGroup.getBounds(), { padding: [30, 30], maxZoom: 15 });
      } catch (e) {}
    }
  }

  // Draw an interactive radius circle (2 km, 5 km, 10 km)
  setRadiusCircle(lat, lng, radiusMeters) {
    if (!this.map) return;
    if (this.radiusCircle) {
      this.map.removeLayer(this.radiusCircle);
      this.radiusCircle = null;
    }
    if (radiusMeters && radiusMeters !== 'all') {
      this.radiusCircle = L.circle([lat, lng], {
        radius: parseFloat(radiusMeters),
        color: '#1E3A8A',
        fillColor: '#BFDBFE',
        fillOpacity: 0.15,
        weight: 1.5
      }).addTo(this.map);
    }
  }
};
