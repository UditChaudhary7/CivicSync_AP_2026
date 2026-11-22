// frontend/js/views/DbmsView.js - Interactive Showcase for DBMS Normalization & SQL Queries (CP1, CP2, CP3)

window.DbmsView = {
  async render() {
    return `
      <div class="container" style="padding: 40px 16px;">
        <div style="margin-bottom: 24px;">
          <span style="background: #E0E7FF; color: #3730A3; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px;">DBMS COURSEWORK DELIVERABLES</span>
          <h1 style="font-size: 28px; font-weight: 800; margin-top: 8px;">Relational Database & SQL Queries</h1>
          <p style="color: var(--color-text-secondary); max-width: 800px; margin-top: 4px;">
            Linked from repository <a href="https://github.com/UditChaudhary7/CivicSync_AP_2026" target="_blank" style="color: var(--color-accent-primary); font-weight: 600;">UditChaudhary7/CivicSync_AP_2026</a>.
            Includes 11 fully normalized relational entities (3NF/BCNF) and parameterized SQL queries.
          </p>
        </div>

        <!-- Table Overview Cards -->
        <div style="background: #fff; border: 1px solid var(--color-border); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">📊 Live Database Entities (dev.db / SQLite)</h3>
          <div id="dbms-table-counts" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;">
            <div style="padding: 12px; background: #F8FAFC; border-radius: 6px; text-align: center;">Loading tables...</div>
          </div>
        </div>

        <!-- SQL Tabs Navigation -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">
          <button id="btn-tab-departments" class="btn btn-sm btn-primary">Query 2.1: Departments</button>
          <button id="btn-tab-categories" class="btn btn-sm btn-secondary">Query 2.2: Categories & SLAs</button>
          <button id="btn-tab-wards" class="btn btn-sm btn-secondary">Query 2.4: Municipal Wards</button>
          <button id="btn-tab-kpi" class="btn btn-sm btn-secondary">Query 10.1: KPI Metrics</button>
          <button id="btn-tab-console" class="btn btn-sm btn-secondary">Live SQL Console</button>
        </div>

        <!-- Result Box -->
        <div id="dbms-active-content" style="background: #fff; border: 1px solid var(--color-border); border-radius: 8px; padding: 20px;">
          <div id="dbms-query-title" style="font-weight: 700; margin-bottom: 8px; color: #1E293B;"></div>
          <pre id="dbms-query-sql" style="background: #0F172A; color: #38BDF8; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin-bottom: 16px;"></pre>
          <div id="dbms-query-result" style="overflow-x: auto;">Loading results...</div>
        </div>
      </div>
    `;
  },

  async afterMount() {
    // 1. Fetch live table stats
    try {
      const res = await fetch('/api/dbms/overview');
      const json = await res.json();
      if (json.success && json.tables) {
        const container = document.getElementById('dbms-table-counts');
        container.innerHTML = Object.entries(json.tables).map(([name, count]) => `
          <div style="padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: 800; color: #1E3A8A;">${count}</div>
            <div style="font-size: 11px; font-weight: 600; color: #64748B; font-family: monospace; text-transform: uppercase;">${name}</div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }

    // Tab Handlers
    const tabDept = document.getElementById('btn-tab-departments');
    const tabCat = document.getElementById('btn-tab-categories');
    const tabWard = document.getElementById('btn-tab-wards');
    const tabKpi = document.getElementById('btn-tab-kpi');
    const tabConsole = document.getElementById('btn-tab-console');

    const resetButtons = () => {
      [tabDept, tabCat, tabWard, tabKpi, tabConsole].forEach(b => {
        b.className = 'btn btn-sm btn-secondary';
      });
    };

    const showTable = (columns, rows) => {
      if (!rows || rows.length === 0) return '<p style="color:#64748B;">No rows returned.</p>';
      return `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
              ${columns.map(c => `<th style="text-align: left; padding: 8px 12px;">${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                ${columns.map(c => `<td style="padding: 8px 12px; font-family: ${typeof r[c] === 'number' ? 'monospace' : 'inherit'};">${r[c] !== null && r[c] !== undefined ? r[c] : '<span style="color:#94A3B8;">NULL</span>'}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    };

    const loadDepartments = async () => {
      resetButtons();
      tabDept.className = 'btn btn-sm btn-primary';
      document.getElementById('dbms-query-title').innerText = 'Query 2.1 — Municipal Departments Directory with Category Counts';
      document.getElementById('dbms-query-sql').innerText = `SELECT d.department_id, d.name AS department_name, d.contact_email, d.contact_phone, COUNT(c.category_id) AS total_categories_managed\nFROM departments d\nLEFT JOIN categories c ON d.department_id = c.department_id\nGROUP BY d.department_id, d.name, d.contact_email, d.contact_phone\nORDER BY d.name ASC;`;
      const res = await fetch('/api/dbms/departments');
      const json = await res.json();
      document.getElementById('dbms-query-result').innerHTML = showTable(['department_id', 'department_name', 'contact_email', 'contact_phone', 'total_categories_managed'], json.data);
    };

    const loadCategories = async () => {
      resetButtons();
      tabCat.className = 'btn btn-sm btn-primary';
      document.getElementById('dbms-query-title').innerText = 'Query 2.2 — Civic Issue Categories, Responsible Department & SLA';
      document.getElementById('dbms-query-sql').innerText = `SELECT c.category_id, c.name AS category_name, c.description, d.name AS department_name, c.default_priority, c.sla_hours\nFROM categories c\nINNER JOIN departments d ON c.department_id = d.department_id\nORDER BY c.name ASC;`;
      const res = await fetch('/api/dbms/categories');
      const json = await res.json();
      document.getElementById('dbms-query-result').innerHTML = showTable(['category_id', 'category_name', 'department_name', 'default_priority', 'sla_hours', 'description'], json.data);
    };

    const loadWards = async () => {
      resetButtons();
      tabWard.className = 'btn btn-sm btn-primary';
      document.getElementById('dbms-query-title').innerText = 'Query 2.4 — Administrative Wards & Municipal Zones';
      document.getElementById('dbms-query-sql').innerText = `SELECT w.ward_id, w.ward_number, w.ward_name, w.zone_name\nFROM wards w\nORDER BY w.ward_id ASC;`;
      const res = await fetch('/api/dbms/wards');
      const json = await res.json();
      document.getElementById('dbms-query-result').innerHTML = showTable(['ward_id', 'ward_number', 'ward_name', 'zone_name'], json.data);
    };

    const loadKpis = async () => {
      resetButtons();
      tabKpi.className = 'btn btn-sm btn-primary';
      document.getElementById('dbms-query-title').innerText = 'Query 10.1 — Complaint Status Breakdown & Critical KPI Metrics';
      document.getElementById('dbms-query-sql').innerText = `SELECT \n  COUNT(*) AS total_complaints,\n  COUNT(CASE WHEN status = 'REPORTED' THEN 1 END) AS reported_count,\n  COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) AS in_progress_count,\n  COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS resolved_count,\n  COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) AS critical_count\nFROM complaints;`;
      const res = await fetch('/api/dbms/kpi');
      const json = await res.json();
      document.getElementById('dbms-query-result').innerHTML = showTable(['total_complaints', 'reported_count', 'in_progress_count', 'resolved_count', 'critical_count'], [json.data]);
    };

    const loadConsole = () => {
      resetButtons();
      tabConsole.className = 'btn btn-sm btn-primary';
      document.getElementById('dbms-query-title').innerText = 'Interactive SQL Query Console';
      document.getElementById('dbms-query-sql').innerText = `-- Enter any read query (e.g. SELECT * FROM complaints LIMIT 5;) and click Run.`;
      document.getElementById('dbms-query-result').innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <textarea id="console-sql-input" style="width: 100%; height: 90px; padding: 10px; font-family: monospace; font-size: 13px; border: 1px solid #CBD5E1; border-radius: 4px;">SELECT * FROM complaints LIMIT 5;</textarea>
          <div>
            <button id="btn-run-sql" class="btn btn-sm btn-primary">Run SQL Query</button>
          </div>
          <div id="console-output" style="margin-top: 12px;"></div>
        </div>
      `;

      document.getElementById('btn-run-sql').onclick = async () => {
        const query = document.getElementById('console-sql-input').value;
        const out = document.getElementById('console-output');
        out.innerHTML = '<span style="color:#64748B;">Executing query...</span>';
        try {
          const res = await fetch('/api/dbms/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
          });
          const json = await res.json();
          if (json.success && json.data) {
            if (json.data.length === 0) {
              out.innerHTML = '<p style="color:#64748B;">Query returned 0 rows.</p>';
            } else {
              const cols = Object.keys(json.data[0]);
              out.innerHTML = showTable(cols, json.data);
            }
          } else {
            out.innerHTML = `<p style="color:#DC2626; font-weight:600;">Error: ${json.error || json.message}</p>`;
          }
        } catch (e) {
          out.innerHTML = `<p style="color:#DC2626; font-weight:600;">Execution failed: ${e.message}</p>`;
        }
      };
    };

    tabDept.onclick = loadDepartments;
    tabCat.onclick = loadCategories;
    tabWard.onclick = loadWards;
    tabKpi.onclick = loadKpis;
    tabConsole.onclick = loadConsole;

    // Load initial tab
    loadDepartments();
  }
};
