// public/js/app.js - Hash Router & Client Application Bootstrap

// Map URL hash paths to view components
function resolveRoute(hash) {
  const cleanHash = hash.replace(/^#\/?/, '').toLowerCase();
  const segments = cleanHash.split('/');

  if (!cleanHash || segments[0] === '') return window.HomeView;
  if (segments[0] === 'explore') return window.ExploreView;
  if (segments[0] === 'map') return window.MapView;
  if (segments[0] === 'dbms' || segments[0] === 'sql') return window.DbmsView;
  if (segments[0] === 'report') return window.CitizenReportView;
  if (segments[0] === 'my-reports') return window.CitizenMyReportsView;
  if (segments[0] === 'admin') return window.AdminDashboardView;
  if (segments[0] === 'login') return window.AuthViews.Login;
  if (segments[0] === 'register') return window.AuthViews.Register;
  if (segments[0] === 'issues' && segments[1]) return window.IssueDetailView;

  return window.HomeView;
}

// Render active view based on browser URL hash
async function handleRouting() {
  const root = document.getElementById('app-root');
  if (!root) return;

  // Re-render navbar to update active links and session state
  window.Navbar.render();

  const currentView = resolveRoute(window.location.hash);
  if (!currentView || typeof currentView.render !== 'function') {
    root.innerHTML = '<div class="container" style="padding:40px;">Page not found</div>';
    return;
  }

  // Render view template
  root.innerHTML = await currentView.render();

  // Call afterMount lifecycle hook for event listeners and data fetching
  if (typeof currentView.afterMount === 'function') {
    await currentView.afterMount();
  }

  window.scrollTo(0, 0);
}

// Bootstrap application once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('hashchange', handleRouting);
  handleRouting();
});
