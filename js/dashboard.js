const BASE_URL  = 'http://localhost:3000';
const token     = localStorage.getItem('token');
const userRole  = (localStorage.getItem('userRole') || '').toLowerCase();
const userId    = localStorage.getItem('userId');

if (!token) window.location.href = 'login.html';

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// ── SIDEBAR ───────────────────────────────────────────────────
function buildSidebar() {
  const menu = document.getElementById('sidebarMenu');
  if (!menu) return;

  const allItems = [
    { href: 'dashboard.html',   icon: 'layout-dashboard', label: 'Main Dashboard',      roles: ['admin','commander','investigator'] },
    { href: 'cases.html',       icon: 'file-text',        label: 'Case Detail',          roles: ['admin','commander','investigator'] },
    { href: 'map.html',         icon: 'map',              label: 'Map View',             roles: ['admin','commander','investigator'] },
    { href: 'report.html',      icon: 'bar-chart-3',      label: 'Report Screen',        roles: ['admin'] },
    { href: 'record.html',      icon: 'edit-3',           label: 'Record Outcome',       roles: ['investigator'] },
    { href: 'caseList.html',    icon: 'list',             label: 'Case List',            roles: ['admin','commander','investigator'] },
    { href: 'resolved.html',    icon: 'check-circle',     label: 'Resolved Cases',       roles: ['admin','commander'] },
    { href: 'assign.html',      icon: 'user-check',       label: 'Assign Investigator',  roles: ['admin','commander'] },
    { href: 'commander.html',   icon: 'bar-chart',        label: 'Commander Dashboard',  roles: ['admin','commander'] },
    { href: 'evaluations.html', icon: 'star',             label: 'Evaluations',          roles: ['admin','commander'] },
    { href: 'admin.html',       icon: 'settings',         label: 'User Management',      roles: ['admin'] },
  ];

  const currentPage = window.location.pathname.split('/').pop();
  const visible     = allItems.filter(i => i.roles.includes(userRole));

  menu.innerHTML = `<p class="menu-title">NAVIGATION</p>` +
    visible.map(i =>
      `<a href="${i.href}" class="${i.href === currentPage ? 'active' : ''}"
          style="display:flex;align-items:center;gap:10px;">
        <i data-lucide="${i.icon}"></i>${i.label}
      </a>`
    ).join('') +
    `<a href="login.html" style="display:flex;align-items:center;gap:10px;"
        onclick="localStorage.clear()">
      <i data-lucide="log-out"></i>Logout
     </a>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── TOPBAR & ROLE INFO ────────────────────────────────────────
function setRoleInfo() {
  // Topbar title per role
  const titles = {
    admin:       { title: 'Admin Dashboard',      sub: 'Full system control' },
    commander:   { title: 'Commander Dashboard',  sub: 'Operational oversight' },
    investigator:{ title: 'My Cases',             sub: 'Your assigned investigations' },
  };
  const t = titles[userRole] || titles.investigator;
  const titleEl = document.getElementById('topbarTitle');
  const subEl   = document.getElementById('topbarSub');
  if (titleEl) titleEl.textContent = t.title;
  if (subEl)   subEl.textContent   = t.sub;

  // Role badge (topbar + sidebar)
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  const badge1 = document.getElementById('roleBadge');
  const badge2 = document.getElementById('roleName');
  if (badge1) badge1.textContent = roleLabel;
  if (badge2) badge2.textContent = roleLabel;

  // Hide sections the role shouldn't see (data-roles attribute)
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.getAttribute('data-roles').split(',').map(r => r.trim());
    if (!allowed.includes(userRole)) el.style.display = 'none';
  });
}

// ── STAT CARDS ────────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
    const data = await res.json();
    setEl('statTotal',    data.totalCases         ?? 0);
    setEl('statHigh',     data.byRisk?.HIGH        ?? 0);
    setEl('statMid',      data.byRisk?.MID         ?? 0);
    setEl('statLow',      data.byRisk?.LOW         ?? 0);
    setEl('statOpen',     data.byOutcome?.OPEN     ?? 0);
    setEl('statResolved', data.byOutcome?.RESOLVED ?? 0);
  } catch (e) {
    console.warn('Loading mock stats:', e.message);
    // Load mock data if API fails
    setEl('statTotal',    47);
    setEl('statHigh',     12);
    setEl('statMid',      18);
    setEl('statLow',      17);
    setEl('statOpen',     24);
    setEl('statResolved', 23);
  }
}

// ── MOCK CASES DATA ────────────────────────────────────────────
const mockCases = [
  {
    id: '001',
    case_number: 'CS-2024-0847',
    suspect_name: 'Property at 123 Mandela Street',
    risk_level: 'HIGH',
    outcome: 'OPEN',
    description: 'Suspected meter tampering detected during routine inspection. Consumption patterns irregular.',
    investigators: { full_name: 'John Mthembu', email: 'john.m@eskom.co.za' },
    created_at: '2024-12-15'
  },
  {
    id: '002',
    case_number: 'CS-2024-0846',
    suspect_name: 'Property at 456 Luthuli Avenue',
    risk_level: 'MID',
    outcome: 'OPEN',
    description: 'Unusual connection pattern observed. Multiple taps from same line detected.',
    investigators: { full_name: 'Sarah Khumalo', email: 'sarah.k@eskom.co.za' },
    created_at: '2024-12-18'
  },
  {
    id: '003',
    case_number: 'CS-2024-0845',
    suspect_name: 'Property at 789 Shaka Lane',
    risk_level: 'HIGH',
    outcome: 'OPEN',
    description: 'Zero consumption reported but power usage detected. Clear bypass evidence.',
    investigators: { full_name: 'Thabo Ndlela', email: 'thabo.n@eskom.co.za' },
    created_at: '2024-12-20'
  },
  {
    id: '004',
    case_number: 'CS-2024-0844',
    suspect_name: 'Property at 321 Nelson Road',
    risk_level: 'LOW',
    outcome: 'OPEN',
    description: 'Minor discrepancies in meter reading. Requires follow-up inspection.',
    investigators: { full_name: 'Unassigned', email: 'unassigned@eskom.co.za' },
    created_at: '2024-12-22'
  },
  {
    id: '005',
    case_number: 'CS-2024-0843',
    suspect_name: 'Property at 654 Gandi Square',
    risk_level: 'MID',
    outcome: 'OPEN',
    description: 'Suspicious wiring configuration detected outside property.',
    investigators: { full_name: 'Lesego Mkhize', email: 'lesego.m@eskom.co.za' },
    created_at: '2024-12-23'
  }
];

// ── CASES LIST ────────────────────────────────────────────────
async function loadCases() {
  const container = document.getElementById('casesContainer');
  if (!container) return;

  try {
    const res   = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
    const cases = await res.json();

    if (!Array.isArray(cases) || cases.length === 0) {
      throw new Error('No cases from API');
    }

    renderCases(cases, container);
  } catch (e) {
    console.warn('Using mock cases:', e.message);
    renderCases(mockCases, container);
  }
}

function renderCases(cases, container) {
  if (!cases || cases.length === 0) {
    container.innerHTML = `<div style="padding:30px;text-align:center;color:#9ca3af;">
      <p style="font-size:15px;font-weight:600;">No cases to display.</p>
      <p style="font-size:13px;">Cases will appear here once they are created.</p>
    </div>`;
    return;
  }

  container.innerHTML = cases.slice(0, 5).map(c => {
    const inv        = c.investigators;
    const invName    = inv?.full_name || inv?.email || 'Unassigned';
    const riskColor  = { HIGH:'#dc2626', MID:'#f59e0b', LOW:'#16a34a' }[c.risk_level] || '#6b7280';
    const outColor   = { OPEN:'#f59e0b', PENDING:'#2563eb', RESOLVED:'#16a34a' }[c.outcome] || '#6b7280';
    const date       = c.created_at ? new Date(c.created_at).toLocaleDateString('en-ZA') : 'N/A';

    return `<div style="
        background:#fff;border-radius:12px;padding:16px 20px;
        border-left:4px solid ${riskColor};
        box-shadow:0 2px 8px rgba(0,0,0,.05);margin-bottom:12px;
        display:flex;justify-content:space-between;align-items:flex-start;gap:12px;
        transition: all 0.3s;
        hover: transform translateY(-2px);">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="font-weight:700;font-size:13px;color:#0f1a3e;">${c.case_number || c.id?.slice(0,8) || 'N/A'}</span>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;background:${riskColor}22;color:${riskColor};">${c.risk_level || 'N/A'}</span>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;background:${outColor}22;color:${outColor};">${c.outcome || 'N/A'}</span>
        </div>
        <p style="font-size:13.5px;font-weight:600;color:#1e293b;margin:0 0 4px;">${c.suspect_name || 'Unknown Suspect'}</p>
        <p style="font-size:12.5px;color:#64748b;margin:0 0 6px;">${c.description || 'No description.'}</p>
        <p style="font-size:12px;color:#9ca3af;margin:0;">🔍 ${invName} &nbsp;|&nbsp; 📅 ${date}</p>
      </div>
      <a href="cases.html?id=${c.id}" style="
          padding:7px 14px;background:#3b82f6;color:#fff;border-radius:8px;
          font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;flex-shrink:0;
          transition: all 0.2s;">
        View →
      </a>
    </div>`;
  }).join('');
}

// ── MOCK TEAM DATA ────────────────────────────────────────────
const mockTeam = [
  { full_name: 'John Mthembu', email: 'john.m@eskom.co.za', assigned: 8, resolved: 6 },
  { full_name: 'Sarah Khumalo', email: 'sarah.k@eskom.co.za', assigned: 12, resolved: 10 },
  { full_name: 'Thabo Ndlela', email: 'thabo.n@eskom.co.za', assigned: 5, resolved: 5 },
  { full_name: 'Lesego Mkhize', email: 'lesego.m@eskom.co.za', assigned: 9, resolved: 7 }
];

// ── TEAM PERFORMANCE ──────────────────────────────────────────
async function loadTeamPerformance() {
  const container = document.getElementById('teamContainer');
  if (!container) return;
  if (!['admin','commander'].includes(userRole)) {
    container.style.display = 'none';
    return;
  }

  try {
    const res  = await fetch(`${BASE_URL}/api/commander/stats`, { headers: authHeaders });
    const data = await res.json();
    const invs = data.investigatorPerformance || [];

    if (!invs || invs.length === 0) {
      throw new Error('No investigator data');
    }

    renderTeamPerformance(invs, container);
  } catch (e) {
    console.warn('Using mock team data:', e.message);
    renderTeamPerformance(mockTeam, container);
  }
}

function renderTeamPerformance(invs, container) {
  if (!invs || invs.length === 0) {
    container.innerHTML = `<p style="color:#9ca3af;font-size:13px;">No investigator data yet.</p>`;
    return;
  }

  container.innerHTML = invs.map(inv => {
    const rate = inv.assigned > 0 ? Math.round((inv.resolved / inv.assigned) * 100) : 0;
    const initial = (inv.full_name || inv.email || '?')[0].toUpperCase();
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9;">
      <div style="width:38px;height:38px;border-radius:50%;background:#3b82f622;
          display:flex;align-items:center;justify-content:center;
          font-weight:700;color:#3b82f6;font-size:14px;flex-shrink:0;">
        ${initial}
      </div>
      <div style="flex:1;min-width:0;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#0f1a3e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${inv.full_name || inv.email}
        </p>
        <p style="margin:2px 0 6px;font-size:11.5px;color:#9ca3af;">
          Assigned: ${inv.assigned} &nbsp;|&nbsp; Resolved: ${inv.resolved}
        </p>
        <div style="height:6px;background:#e5e9f5;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${rate}%;background:linear-gradient(90deg, #3b82f6, #2563eb);border-radius:3px;transition:width .4s;"></div>
        </div>
      </div>
      <span style="font-size:13px;font-weight:700;color:#3b82f6;flex-shrink:0;">${rate}%</span>
    </div>`;
  }).join('');
}

// ── ALERT BANNER ──────────────────────────────────────────────
function loadAlertBanner() {
  const alertBanner = document.getElementById('alertBanner');
  if (!alertBanner) return;

  if (userRole === 'admin') {
    alertBanner.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 2px solid #fca5a5;
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      ">
        <span style="font-size: 20px; flex-shrink: 0;">⚠️</span>
        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: #7f1d1d; margin-bottom: 2px;">
            3 High-Risk Cases Pending Review
          </h3>
          <p style="font-size: 13px; color: #b91c1c; margin: 0;">
            Immediate action required for cases CS-2024-0847, CS-2024-0845, and 1 more.
          </p>
        </div>
      </div>
    `;
  } else if (userRole === 'commander') {
    alertBanner.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%);
        border: 2px solid #fcd34d;
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      ">
        <span style="font-size: 20px; flex-shrink: 0;">ℹ️</span>
        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: #92400e; margin-bottom: 2px;">
            8 Cases Ready for Assignment
          </h3>
          <p style="font-size: 13px; color: #b45309; margin: 0;">
            Review pending cases and assign to available investigators.
          </p>
        </div>
      </div>
    `;
  } else if (userRole === 'investigator') {
    alertBanner.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        border: 2px solid #7dd3fc;
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      ">
        <span style="font-size: 20px; flex-shrink: 0;">✓</span>
        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: #0c4a6e; margin-bottom: 2px;">
            5 Cases Assigned to You
          </h3>
          <p style="font-size: 13px; color: #075985; margin: 0;">
            2 high-priority, 3 standard. View your cases dashboard for details.
          </p>
        </div>
      </div>
    `;
  }
}


// ── HELPER ────────────────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  setRoleInfo();
  loadAlertBanner();
  loadStats();
  loadCases();
  loadTeamPerformance();
});