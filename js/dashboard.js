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
    { href: 'dashboard.html',   icon: 'layout-dashboard', label: 'Main Dashboard',      roles: ['admin','investigator'] },
    { href: 'cases.html',       icon: 'file-text',        label: 'Case Detail',          roles: ['admin','investigator'] },
    { href: 'map.html',         icon: 'map',              label: 'Map View',             roles: ['admin','investigator'] },
    { href: 'report.html',      icon: 'bar-chart-3',      label: 'Report Screen',        roles: ['admin'] },
    { href: 'record.html',      icon: 'edit-3',           label: 'Record Outcome',       roles: ['investigator'] },
    { href: 'caseList.html',    icon: 'list',             label: 'Case List',            roles: ['admin','investigator'] },
    { href: 'resolved.html',    icon: 'check-circle',     label: 'Resolved Cases',       roles: ['admin'] },
    { href: 'assign.html',      icon: 'user-check',       label: 'Assign Investigator',  roles: ['admin'] },
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
    setEl('statMid',      data.byRisk?.MID         ?? 0);
    setEl('statLow',      data.byRisk?.LOW         ?? 0);
    setEl('statOpen',     data.byOutcome?.OPEN     ?? 0);
    setEl('statResolved', data.byOutcome?.RESOLVED ?? 0);
<<<<<<< Updated upstream
=======
    // High risk will be set by the live alert banner data so the headline count
    // and banner stay consistent with pending review performance.
    // Render admin chart if chart.js is available
    try { renderAdminChart(data); } catch(e) {}
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
function renderAdminChart(data) {
  const ctx = document.getElementById('adminChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const high = data.byRisk?.HIGH || 0;
  const mid  = data.byRisk?.MID  || 0;
  const low  = data.byRisk?.LOW  || 0;
  const chart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['High','Medium','Low'],
      datasets: [{
        data: [high, mid, low],
        backgroundColor: ['#ef4444','#f59e0b','#10b981'],
        borderColor: '#ffffff',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 14,
            padding: 16,
            color: '#334155',
            usePointStyle: true,
          }
        },
        tooltip: {
          bodyColor: '#0f172a',
          backgroundColor: '#f8fafc',
          borderColor: '#cbd5e1',
          borderWidth: 1,
          titleColor: '#111827',
        }
      }
    }
  });
}

>>>>>>> Stashed changes
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

    const sortedCases = cases.slice().sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at) : new Date(0);
      const db = b.created_at ? new Date(b.created_at) : new Date(0);
      return db - da;
    });

    renderCases(sortedCases, container);
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

  const visibleCases = cases.slice(0, 8);
  const moreCount = Math.max(0, cases.length - visibleCases.length);

  container.innerHTML = `${moreCount > 0 ? `<div class="section-note">Showing ${visibleCases.length} of ${cases.length} recent cases. Click "View All" to explore the full case list.</div>` : ''}` +
    visibleCases.map(c => {
    const inv        = c.investigators;
    const invName    = inv?.full_name || inv?.email || 'Unassigned';
    const riskClass  = (c.risk_level || 'UNKNOWN').toString().toLowerCase().includes('high') ? 'high' :
                       (c.risk_level || '').toString().toUpperCase().trim() === 'MID' ? 'mid' :
                       (c.risk_level || '').toString().toUpperCase().trim() === 'LOW' ? 'low' : 'low';
    const outClass   = (c.outcome || 'OPEN').toString().toUpperCase().trim() === 'RESOLVED' ? 'resolved' :
                       (c.outcome || 'OPEN').toString().toUpperCase().trim() === 'PENDING' ? 'pending' : 'open';
    const date       = c.created_at ? new Date(c.created_at).toLocaleDateString('en-ZA') : 'N/A';

    return `<article class="case-card">
      <div class="case-card-info">
        <div class="case-card-title">${c.case_number || c.id || 'Unknown case'}</div>
        <div class="case-card-tags">
          <span class="case-tag ${riskClass}">${(c.risk_level || 'N/A').toUpperCase()}</span>
          <span class="case-tag ${outClass}">${(c.outcome || 'N/A').toUpperCase()}</span>
        </div>
        <p class="case-card-subtitle">${c.suspect_name || 'Unknown suspect'}</p>
        <p class="case-card-description">${c.description || 'No description provided.'}</p>
        <div class="case-card-meta">
          <span><i class="fa-solid fa-user"></i>${invName}</span>
          <span><i class="fa-regular fa-calendar-days"></i>${date}</span>
        </div>
<<<<<<< Updated upstream
        <p style="font-size:13.5px;font-weight:600;color:#1e293b;margin:0 0 4px;">${c.suspect_name || 'Unknown Suspect'}</p>
        <p style="font-size:12.5px;color:#64748b;margin:0 0 6px;">${c.description || 'No description.'}</p>
        <p style="font-size:12px;color:#9ca3af;margin:0;">🔍 ${invName} &nbsp;|&nbsp; 📅 ${date}</p>
=======
>>>>>>> Stashed changes
      </div>
      <div class="case-card-actions">
        <a href="cases.html?id=${c.id}" class="case-view-btn">View details →</a>
      </div>
    </article>`;
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
  if (userRole !== 'admin') {
    container.style.display = 'none';
    return;
  }

  const endpoints = [
    `${BASE_URL}/api/dashboard/team`,
    `${BASE_URL}/api/commander/stats`
  ];

  let invs = [];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      invs = data.investigatorPerformance || [];
      if (invs && invs.length > 0) break;
    } catch (err) {
      console.warn(`Failed to load team performance from ${url}:`, err.message);
    }
  }

  if (!invs || invs.length === 0) {
    console.warn('Using mock team data: no investigator data returned.');
    renderTeamPerformance(mockTeam, container);
    return;
  }

  renderTeamPerformance(invs, container);
}

function renderTeamPerformance(invs, container) {
  if (!invs || invs.length === 0) {
    container.innerHTML = `<p style="color:#9ca3af;font-size:13px;">No investigator data yet.</p>`;
    return;
  }

  const sortedInvs = invs.slice().sort((a, b) => (b.assigned || 0) - (a.assigned || 0));
  const visibleInvs = sortedInvs.slice(0, 8);
  const moreInvs = Math.max(0, sortedInvs.length - visibleInvs.length);

  container.innerHTML = `${moreInvs > 0 ? `<div class="section-note">Showing top ${visibleInvs.length} of ${sortedInvs.length} investigators by assignment count.</div>` : ''}` +
    `<div class="team-list">${visibleInvs.map(inv => {
    const label = inv.full_name || inv.investigator_code || inv.email || inv.id || 'Unknown Investigator';
    const assigned = Number(inv.assigned || 0);
    const resolved = Number(inv.resolved || 0);
    const rate = assigned > 0 ? Math.round((resolved / assigned) * 100) : 0;
    const initial = label[0]?.toUpperCase() || '?';
    return `<div class="team-row">
      <div class="team-row-info">
        <div class="team-avatar">${initial}</div>
        <div class="team-text">
          <p class="team-name">${label}</p>
          <p class="team-email">${inv.email || 'No email provided'}</p>
        </div>
      </div>
      <div class="team-stats">
        <span>Assigned: ${assigned}</span>
        <span>Resolved: ${resolved}</span>
        <div class="team-progress"><div class="team-progress-fill" style="width:${rate}%;"></div></div>
      </div>
      <span class="team-rate">${rate}%</span>
    </div>`;
  }).join('')}</div>`;
}

// ── ALERT BANNER ──────────────────────────────────────────────
async function loadAlertBanner() {
  const alertBanner = document.getElementById('alertBanner');
  if (!alertBanner) return;

  if (userRole === 'admin') {
    let highCases = [];
    try {
      const res = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
      const cases = await res.json();
      if (Array.isArray(cases)) {
        highCases = cases.filter(c => {
          const risk   = (c.risk_level || '').toString().toUpperCase();
          const status = (c.outcome || c.status || '').toString().toUpperCase();
          const isHigh = risk === 'HIGH' || risk === 'RISK' || risk === 'HIGH RISK' || risk === 'HIGH-RISK';
          return isHigh && ['OPEN', 'PENDING'].includes(status);
        });
      }
    } catch (e) {
      console.warn('Failed to fetch high-risk cases for alert banner:', e.message);
    }

    const count   = highCases.length;
    setEl('statHigh', count);
    const topRefs = highCases.map(c => c.case_number || c.id).slice(0, 2);
    const more    = Math.max(0, count - topRefs.length);

    const heading = count > 0
      ? `${count} High-Risk Case${count === 1 ? '' : 's'} Pending Review`
      : 'No High-Risk Cases Pending Review';

    const message = count === 0
      ? 'The dashboard is up to date — no urgent high-risk cases require review right now.'
      : topRefs.length === 1
        ? `Immediate action required for case ${topRefs[0]}.`
        : `Immediate action required for cases ${topRefs.join(', ')}${more > 0 ? `, and ${more} more.` : '.'}`;

    alertBanner.innerHTML = `
      <div style="
        background: ${count > 0 ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'};
        border: 2px solid ${count > 0 ? '#fca5a5' : '#34d399'};
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      ">
<<<<<<< Updated upstream
        <span style="font-size: 20px; flex-shrink: 0;">⚠️</span>
=======
        <span style="font-size: 20px; flex-shrink: 0;"><i class="fa-solid ${count > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}" style="color:${count > 0 ? '#b91c1c' : '#166534'};font-size:20px;"></i></span>
>>>>>>> Stashed changes
        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: ${count > 0 ? '#7f1d1d' : '#166534'}; margin-bottom: 2px;">
            ${heading}
          </h3>
<<<<<<< Updated upstream
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
=======
          <p style="font-size: 13px; color: ${count > 0 ? '#b91c1c' : '#166534'}; margin: 0;">
            ${message}
>>>>>>> Stashed changes
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
document.addEventListener('DOMContentLoaded', async () => {
  buildSidebar();
  setRoleInfo();
  await loadAlertBanner();
  loadStats();
  loadCases();
  loadTeamPerformance();
});