// public/js/components/Navbar.js - Role-based navigation bar

window.Navbar = {
  // Render navbar links based on user session role (Guest, Citizen, Admin)
  render() {
    const user = window.api.getUser();
    const currentHash = window.location.hash || '#/';

    let navLinksHtml = `
      <li><a href="#/" class="nav-link ${currentHash === '#/' ? 'active' : ''}">Home</a></li>
      <li><a href="#/explore" class="nav-link ${currentHash === '#/explore' ? 'active' : ''}">Explore</a></li>
      <li><a href="#/map" class="nav-link ${currentHash === '#/map' ? 'active' : ''}">Live Map</a></li>
      <li><a href="#/dbms" class="nav-link ${currentHash === '#/dbms' ? 'active' : ''}">SQL / DBMS</a></li>
    `;

    if (!user) {
      navLinksHtml += `
        <li><a href="#/report" class="btn btn-primary btn-sm">Report Issue</a></li>
        <li><a href="#/login" class="btn btn-secondary btn-sm">Login</a></li>
      `;
    } else if (user.role === 'admin') {
      navLinksHtml += `
        <li><a href="#/admin" class="nav-link ${currentHash === '#/admin' ? 'active' : ''}">Admin Dashboard</a></li>
        <li style="font-size:12px; font-weight:700; color:var(--color-accent-primary);">${window.api.escapeHtml(user.full_name)} (Admin)</li>
        <li><button id="nav-btn-logout" class="btn btn-secondary btn-sm">Logout</button></li>
      `;
    } else {
      navLinksHtml += `
        <li><a href="#/report" class="btn btn-primary btn-sm">Report Issue</a></li>
        <li><a href="#/my-reports" class="nav-link ${currentHash === '#/my-reports' ? 'active' : ''}">My Reports</a></li>
        <li style="font-size:12px; font-weight:600; color:var(--color-text-secondary);">${window.api.escapeHtml(user.full_name)}</li>
        <li><button id="nav-btn-logout" class="btn btn-secondary btn-sm">Logout</button></li>
      `;
    }

    const html = `
      <nav class="navbar">
        <div class="container navbar-inner">
          <a href="#/" class="navbar-brand">
            <span style="font-weight:900; letter-spacing:-0.5px;">CIVICSYNC</span>
            <span style="font-size:10px; background:#EFF6FF; color:#1E3A8A; padding:2px 6px; border-radius:2px; font-weight:700;">SONIPAT</span>
          </a>
          <ul class="navbar-nav">
            ${navLinksHtml}
          </ul>
        </div>
      </nav>
    `;

    const root = document.getElementById('navbar-root');
    if (root) {
      root.innerHTML = html;
      document.getElementById('nav-btn-logout')?.addEventListener('click', () => {
        window.api.clearSession();
        window.Navbar.render();
        window.location.hash = '#/login';
      });
    }
  }
};
