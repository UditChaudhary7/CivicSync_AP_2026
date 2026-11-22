// public/js/views/CitizenMyReportsView.js - List of Issues Reported by Current Citizen

window.CitizenMyReportsView = {
  async render() {
    const user = window.api.getUser();
    if (!user) {
      return `
        <div class="container" style="padding-top:40px; text-align:center;">
          <div class="card" style="max-width:440px; margin:0 auto; padding:24px;">
            <h2>Please Log In</h2>
            <p style="color:var(--color-text-secondary); margin:12px 0 20px 0;">Sign in to view your submitted complaints.</p>
            <a href="#/login" class="btn btn-primary">Login</a>
          </div>
        </div>
      `;
    }

    return `
      <div class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-10);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h1 style="font-size:var(--text-xl); font-weight:800;">My Submitted Reports</h1>
            <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:0;">Track the progress and repair status of your reported issues.</p>
          </div>
          <a href="#/report" class="btn btn-primary btn-sm">+ Report Another Issue</a>
        </div>

        <div id="my-reports-list" class="issue-grid"></div>
      </div>
    `;
  },

  async afterMount() {
    if (!window.api.getUser()) return;

    try {
      const res = await window.api.get('/issues/my-reports');
      const container = document.getElementById('my-reports-list');
      if (!container || !res.success) return;

      const issues = res.data.issues || [];
      if (issues.length === 0) {
        container.innerHTML = `
          <div class="card" style="grid-column:1/-1; padding:32px; text-align:center; color:var(--color-text-secondary);">
            <p style="margin-bottom:12px;">You have not reported any civic issues yet.</p>
            <a href="#/report" class="btn btn-primary btn-sm">Report Your First Issue</a>
          </div>
        `;
      } else {
        container.innerHTML = issues.map(i => window.IssueCard.render(i)).join('');
        window.IssueCard.bindEvents(container);
      }
    } catch (e) {
      console.error('Failed to load my reports:', e);
    }
  }
};
