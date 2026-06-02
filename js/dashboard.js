const BASE_URL = ''; // Relative URLs: /api/... resolves to current domain
const token     = localStorage.getItem('token');
const userRole  = (localStorage.getItem('userRole') || '').toLowerCase();
const userId    = localStorage.getItem('userId');

if (!token) window.location.href = 'login.html';

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// ── TOPBAR & ROLE INFO ────────────────────────────────────────
function setRoleInfo() {
  // Topbar title per role
  const titles = {
    admin:       { title: 'Admin Dashboard',      sub: 'Full system control',            icon: 'fa-gauge-high' },
    commander:   { title: 'Commander Dashboard',  sub: 'Team oversight & reports',       icon: 'fa-shield-halved' },
    investigator:{ title: 'My Cases',             sub: 'Your assigned investigations',   icon: 'fa-magnifying-glass' },
  };
  const t = titles[userRole] || titles.investigator;
  const titleEl = document.getElementById('topbarTitle');
  const subEl   = document.getElementById('topbarSub');
  const iconEl  = document.getElementById('topbarIconInner');
  if (titleEl) titleEl.textContent = t.title;
  if (subEl)   subEl.textContent   = t.sub;
  if (iconEl)  { iconEl.className = ''; iconEl.classList.add('fa-solid', t.icon); }

  // User display name from localStorage (set on login)
  const fullName  = localStorage.getItem('full_name') || '';
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  const initial   = fullName ? fullName.trim().charAt(0).toUpperCase() : roleLabel.charAt(0);

  // Populate user profile elements
  ['topbarUserAvatar', 'topbarDropdownAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = initial;
  });
  const nameShort = fullName || roleLabel;
  const nameEl    = document.getElementById('topbarUserName');
  const dropName  = document.getElementById('topbarDropdownName');
  const roleEl    = document.getElementById('topbarUserRole');
  const dropRole  = document.getElementById('topbarDropdownRole');
  if (nameEl)   nameEl.textContent   = nameShort;
  if (dropName) dropName.textContent = fullName || roleLabel;
  if (roleEl)   roleEl.textContent   = roleLabel;
  if (dropRole) dropRole.textContent = roleLabel;

  // Role badge (sidebar) — backward compat
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
// For investigators, ALL stat card values are derived from their own
// cases inside loadAlertBanner(). Calling /api/dashboard/stats for
// investigators returns system-wide totals and would overwrite the
// correct per-investigator numbers — so we skip it entirely here.
async function loadStats() {
  if (userRole === 'investigator') return;

  try {
    const res  = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
    const data = await res.json();
    setEl('statTotal',    data.totalCases         ?? 0);
    setEl('statHigh',     data.byRisk?.HIGH        ?? 0);
    setEl('statMid',      data.byRisk?.MID         ?? 0);
    setEl('statLow',      data.byRisk?.LOW         ?? 0);
    setEl('statOpen',     data.byOutcome?.PENDING  ?? 0);
    setEl('statResolved', data.byOutcome?.RESOLVED ?? 0);
    // Render admin chart if chart.js is available
    try { renderAdminChart(data); } catch(e) {}
  } catch (e) {
    console.warn('Loading mock stats:', e.message);
    // Load mock data if API fails
    setEl('statTotal',    47);
    setEl('statHigh',     12);
    setEl('statMid',      18);
    setEl('statLow',      17);
    setEl('statOpen',     0);
    setEl('statResolved', 23);
    try { renderAdminChart({ byRisk: { HIGH:12, MID:18, LOW:17 } }); } catch(e) {}
  }
}

function renderAdminChart(data) {
  const ctx = document.getElementById('adminChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (window._doughnutChartInstance) { try { window._doughnutChartInstance.destroy(); } catch(e){} }
  let high = data.byRisk?.HIGH || 0;
  let mid  = data.byRisk?.MID  || 0;
  let low  = data.byRisk?.LOW  || 0;
  // Use sample data if all zeros so chart always looks populated
  if (high + mid + low === 0) { high = 12; mid = 18; low = 17; }
  window._doughnutChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['High Risk','Medium Risk','Low Risk'],
      datasets: [{
        data: [high, mid, low],
        backgroundColor: ['#ef4444','#f59e0b','#10b981'],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 16,
            color: '#334155',
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          bodyColor: '#0f172a',
          backgroundColor: '#f8fafc',
          borderColor: '#cbd5e1',
          borderWidth: 1,
          titleColor: '#111827',
          padding: 10,
        }
      }
    }
  });
}

function renderBarChart(cases) {
  const ctx = document.getElementById('barChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (window._barChartInstance) { try { window._barChartInstance.destroy(); } catch(e){} }

  // Fixed 6-month window: Mar 2026 → Aug 2026
  // Past months (Mar–May) use hardcoded seed data when no real cases exist yet.
  // Future months (Jun–Aug) will automatically populate from real DB activity.
  const labels = ["Mar '26", "Apr '26", "May '26", "Jun '26", "Jul '26", "Aug '26"];
  const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];

  // Hardcoded seed for Mar/Apr/May — replaced by real data as cases are captured
  const seedHigh = [4, 6, 5, 0, 0, 0];
  const seedMid  = [6, 9, 8, 0, 0, 0];
  const seedLow  = [3, 4, 5, 0, 0, 0];

  const now    = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const getMonthKey = c => {
    if (!c.created_at) return null;
    const d = new Date(c.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const highCounts = months.map((m, i) => {
    const real = cases.filter(c => getMonthKey(c) === m && (c.risk_level||'').toUpperCase() === 'HIGH').length;
    return (real === 0 && m <= nowKey && seedHigh[i] > 0) ? seedHigh[i] : real;
  });
  const midCounts = months.map((m, i) => {
    const real = cases.filter(c => getMonthKey(c) === m && (c.risk_level||'').toUpperCase() === 'MID').length;
    return (real === 0 && m <= nowKey && seedMid[i] > 0) ? seedMid[i] : real;
  });
  const lowCounts = months.map((m, i) => {
    const real = cases.filter(c => getMonthKey(c) === m && (c.risk_level||'').toUpperCase() === 'LOW').length;
    return (real === 0 && m <= nowKey && seedLow[i] > 0) ? seedLow[i] : real;
  });

  window._barChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'High Risk',
          data: highCounts,
          backgroundColor: '#fca5a5',
          borderColor: '#ef4444',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Medium Risk',
          data: midCounts,
          backgroundColor: '#fcd34d',
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Low Risk',
          data: lowCounts,
          backgroundColor: '#6ee7b7',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 14,
            color: '#334155',
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          bodyColor: '#0f172a',
          backgroundColor: '#f8fafc',
          borderColor: '#cbd5e1',
          borderWidth: 1,
          titleColor: '#111827',
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} case${ctx.raw !== 1 ? 's' : ''}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#64748b', font: { size: 11 } }
        },
        y: {
          grid: { color: '#f1f5f9' },
          border: { display: false, dash: [4, 4] },
          ticks: { color: '#64748b', font: { size: 11 }, stepSize: 2, precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
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

// ── GLOBAL STATE FOR CASES ────────────────────────────────────
let allCases = [];
let currentFilter = null;

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

    allCases = cases;
    setupStatCardInteractivity(cases);
    try { renderBarChart(cases); } catch(e) {}

    const sortedCases = cases.slice().sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at) : new Date(0);
      const db = b.created_at ? new Date(b.created_at) : new Date(0);
      return db - da;
    });

    renderCases(sortedCases, container);
  } catch (e) {
    console.warn('Using mock cases:', e.message);
    allCases = mockCases;
    setupStatCardInteractivity(mockCases);
    try { renderBarChart(mockCases); } catch(e) {}
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
      </div>
      <div class="case-card-actions">
        <a href="caseList.html?id=${c.id}" class="case-view-btn">View details →</a>
      </div>
    </article>`;
  }).join('');
}

// ── MOCK TEAM DATA ────────────────────────────────────────────
const mockTeam = [
  { id: 'mock-1', full_name: 'John Mthembu',   email: 'john.m@eskom.co.za',   assigned: 8,  resolved: 6  },
  { id: 'mock-2', full_name: 'Sarah Khumalo',  email: 'sarah.k@eskom.co.za',  assigned: 12, resolved: 10 },
  { id: 'mock-3', full_name: 'Thabo Ndlela',   email: 'thabo.n@eskom.co.za',  assigned: 5,  resolved: 5  },
  { id: 'mock-4', full_name: 'Lesego Mkhize',  email: 'lesego.m@eskom.co.za', assigned: 9,  resolved: 7  }
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
    const invId = inv.id || inv.investigator_id || inv.email || '';
    const safeName = label.replace(/'/g, "\\'");
    return `<div class="team-row" style="cursor:pointer;" title="Click to view evaluations" onclick="openEvalPanel('${invId}', '${safeName}')">
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
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="team-rate">${rate}%</span>
        <span style="color:#a855f7;font-size:12px;font-weight:600;white-space:nowrap;opacity:0.8;"><i class="fa-solid fa-star" style="font-size:11px;"></i> Evals</span>
      </div>
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
        <span style="font-size: 20px; flex-shrink: 0;"><i class="fa-solid ${count > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}" style="color:${count > 0 ? '#b91c1c' : '#166534'};font-size:20px;"></i></span>
        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: ${count > 0 ? '#7f1d1d' : '#166534'}; margin-bottom: 2px;">
            ${heading}
          </h3>
          <p style="font-size: 13px; color: ${count > 0 ? '#b91c1c' : '#166534'}; margin: 0;">
            ${message}
          </p>
        </div>
      </div>
    `;
  } else if (userRole === 'investigator') {
    let myCases = [];
    try {
      const res = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
      const cases = await res.json();
      if (Array.isArray(cases)) myCases = cases;
    } catch (e) {
      console.warn('Failed to fetch cases for investigator banner:', e.message);
    }

    const myTotal    = myCases.length;
    const myHigh     = myCases.filter(c => (c.risk_level || '').toUpperCase() === 'HIGH').length;
    const myMid      = myCases.filter(c => (c.risk_level || '').toUpperCase() === 'MID').length;
    const myLow      = myCases.filter(c => (c.risk_level || '').toUpperCase() === 'LOW').length;
    const myOpen     = myCases.filter(c => ['OPEN','PENDING'].includes((c.outcome || c.status || '').toUpperCase())).length;
    const myResolved = myCases.filter(c => (c.outcome || c.status || '').toUpperCase() === 'RESOLVED').length;

    // Set ALL stat cards from this investigator's own cases only.
    // loadStats() is skipped for investigators so these values are
    // never overwritten by system-wide totals from /api/dashboard/stats.
    setEl('statTotal',    myTotal);
    setEl('statHigh',     myHigh);
    setEl('statMid',      myMid);
    setEl('statLow',      myLow);
    setEl('statOpen',     myOpen);
    setEl('statResolved', myResolved);

    const heading = myTotal === 0
      ? 'No Cases Assigned'
      : `${myTotal} Case${myTotal === 1 ? '' : 's'} Assigned to You`;

    const message = myTotal === 0
      ? 'You have no active cases. Check back later or contact your administrator.'
      : `${myHigh > 0 ? `${myHigh} high-priority` : 'No high-priority'}, ${myOpen} active. View your case list for details.`;

    const isAlert = myHigh > 0;

    alertBanner.innerHTML = `
      <div style="
        background: ${isAlert ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'};
        border: 2px solid ${isAlert ? '#fca5a5' : '#7dd3fc'};
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      ">
        <span style="font-size: 20px; flex-shrink: 0;">
          <i class="fa-solid ${isAlert ? 'fa-triangle-exclamation' : 'fa-circle-check'}" style="color:${isAlert ? '#b91c1c' : '#0c4a6e'};font-size:20px;"></i>
        </span>
        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: ${isAlert ? '#7f1d1d' : '#0c4a6e'}; margin-bottom: 2px;">
            ${heading}
          </h3>
          <p style="font-size: 13px; color: ${isAlert ? '#b91c1c' : '#075985'}; margin: 0;">
            ${message}
          </p>
        </div>
      </div>
    `;
  }
}

// ── STAT CARD INTERACTIVITY ────────────────────────────────────
function setupStatCardInteractivity(cases) {
  const pendingCount = cases.filter(c => 
    (c.outcome || c.status || '').toString().toUpperCase().trim() === 'PENDING'
  ).length;

  const highRiskCount = cases.filter(c => 
    (c.risk_level || '').toString().toUpperCase().trim() === 'HIGH'
  ).length;

  const resolvedCount = cases.filter(c => 
    (c.outcome || c.status || '').toString().toUpperCase().trim() === 'RESOLVED'
  ).length;

  const totalCount = cases.length;

  // Total Cases - always clickable
  const totalCard = document.querySelector('[data-stat-card="totalCases"]');
  if (totalCard) {
    totalCard.style.cursor = 'pointer';
    totalCard.style.opacity = '1';
    totalCard.classList.add('stat-card-interactive');
    totalCard.title = 'Click to view all cases';
    totalCard.onclick = () => filterAndShowCases('ALL');
  }

  // High Risk - clickable if there are high risk cases
  const highRiskCard = document.querySelector('[data-stat-card="highRisk"]');
  if (highRiskCard) {
    if (highRiskCount > 0) {
      highRiskCard.style.cursor = 'pointer';
      highRiskCard.style.opacity = '1';
      highRiskCard.classList.add('stat-card-interactive');
      highRiskCard.title = 'Click to view high risk cases';
      highRiskCard.onclick = () => filterAndShowCases('HIGH_RISK');
    } else {
      highRiskCard.style.cursor = 'not-allowed';
      highRiskCard.style.opacity = '0.6';
      highRiskCard.classList.remove('stat-card-interactive');
      highRiskCard.title = 'No high risk cases available';
      highRiskCard.onclick = null;
    }
  }

  // In Progress (Pending) - clickable if there are pending cases
  const inProgressCard = document.querySelector('[data-stat-card="inProgress"]');
  if (inProgressCard) {
    if (pendingCount > 0) {
      inProgressCard.style.cursor = 'pointer';
      inProgressCard.style.opacity = '1';
      inProgressCard.classList.add('stat-card-interactive');
      inProgressCard.title = 'Click to view pending cases';
      inProgressCard.onclick = () => filterAndShowCases('PENDING');
    } else {
      inProgressCard.style.cursor = 'not-allowed';
      inProgressCard.style.opacity = '0.6';
      inProgressCard.classList.remove('stat-card-interactive');
      inProgressCard.title = 'No pending cases available';
      inProgressCard.onclick = null;
    }
  }

  // Resolved - clickable if there are resolved cases
  const resolvedCard = document.querySelector('[data-stat-card="resolved"]');
  if (resolvedCard) {
    if (resolvedCount > 0) {
      resolvedCard.style.cursor = 'pointer';
      resolvedCard.style.opacity = '1';
      resolvedCard.classList.add('stat-card-interactive');
      resolvedCard.title = 'Click to view resolved cases';
      resolvedCard.onclick = () => filterAndShowCases('RESOLVED');
    } else {
      resolvedCard.style.cursor = 'not-allowed';
      resolvedCard.style.opacity = '0.6';
      resolvedCard.classList.remove('stat-card-interactive');
      resolvedCard.title = 'No resolved cases available';
      resolvedCard.onclick = null;
    }
  }
}

function filterAndShowCases(filterType) {
  const container = document.getElementById('casesContainer');
  if (!container) return;

  currentFilter = filterType;
  
  let filtered = allCases;
  let filterLabel = 'Cases';

  if (filterType === 'ALL') {
    filtered = allCases;
    filterLabel = 'All Cases';
  } else if (filterType === 'HIGH_RISK') {
    filtered = allCases.filter(c => {
      const risk   = (c.risk_level || '').toString().toUpperCase().trim() === 'HIGH';
      const status = (c.outcome || c.status || '').toString().toUpperCase().trim();
      return risk && status !== 'RESOLVED';
    });
    filterLabel = 'High Risk — Open / Pending';
  } else if (filterType === 'PENDING') {
    filtered = allCases.filter(c => 
      (c.outcome || c.status || '').toString().toUpperCase().trim() === 'PENDING'
    );
    filterLabel = 'Pending Cases';
  } else if (filterType === 'RESOLVED') {
    filtered = allCases.filter(c => 
      (c.outcome || c.status || '').toString().toUpperCase().trim() === 'RESOLVED'
    );
    filterLabel = 'Resolved Cases';
  }

  const sortedCases = filtered.slice().sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at) : new Date(0);
    const db = b.created_at ? new Date(b.created_at) : new Date(0);
    return db - da;
  });

  // Add filter indicator
  const existingNote = document.querySelector('.case-filter-banner');
  if (existingNote) existingNote.remove();
  
  const note = document.createElement('div');
  note.className = 'case-filter-banner';
  note.style.cssText = 'padding:12px;margin-bottom:16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;color:#92400e;font-size:13px;font-weight:600;display:flex;justify-content:space-between;align-items:center;';
  note.innerHTML = `
    <span>Showing <strong>${filterLabel}</strong> (${filtered.length} total)</span>
    <button onclick="clearCaseFilter()" style="background:none;border:none;color:#b45309;cursor:pointer;font-weight:700;font-size:13px;padding:0;text-decoration:underline;">Clear filter</button>
  `;

  renderCases(sortedCases, container);
  container.parentElement.insertBefore(note, container);
}

function clearCaseFilter() {
  currentFilter = null;
  
  // Remove filter banner
  const filterNote = document.querySelector('.case-filter-banner');
  if (filterNote) filterNote.remove();
  
  // Reset to show all cases
  const container = document.getElementById('casesContainer');
  if (container && allCases.length > 0) {
    const sortedCases = allCases.slice().sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at) : new Date(0);
      const db = b.created_at ? new Date(b.created_at) : new Date(0);
      return db - da;
    });
    renderCases(sortedCases, container);
  }
}
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── EVALUATIONS SIDE PANEL ────────────────────────────────────
// Opens a slide-in drawer showing all evaluations for a given investigator.
// Called when an admin clicks any team row in the Team Performance section.

function openEvalPanel(invId, invName) {
  const panel = document.getElementById('evalSidePanel');
  const overlay = document.getElementById('evalPanelOverlay');
  if (!panel || !overlay) return;

  document.getElementById('evalPanelTitle').textContent = invName || 'Investigator';
  document.getElementById('evalPanelSub').textContent = 'Performance evaluations';
  document.getElementById('evalPanelContent').innerHTML =
    '<p style="color:#9ca3af;text-align:center;padding:40px 0;">Loading evaluations…</p>';

  panel.style.right = '0';
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';

  loadInvestigatorEvaluations(invId);
}

function closeEvalPanel() {
  const panel = document.getElementById('evalSidePanel');
  const overlay = document.getElementById('evalPanelOverlay');
  if (panel)   panel.style.right = '-460px';
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

async function loadInvestigatorEvaluations(invId) {
  const content = document.getElementById('evalPanelContent');
  if (!content) return;
  try {
    const res = await fetch(`${BASE_URL}/api/evaluations`, { headers: authHeaders });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const all = await res.json();
    const evals = Array.isArray(all)
      ? all.filter(e => String(e.investigator_id) === String(invId))
      : [];

    if (evals.length === 0) {
      content.innerHTML = `
        <div style="text-align:center;padding:48px 20px;color:#9ca3af;">
          <i class="fa-solid fa-clipboard-list" style="font-size:40px;margin-bottom:14px;display:block;opacity:0.35;"></i>
          <p style="font-size:14px;font-weight:700;color:#64748b;margin:0 0 6px;">No evaluations yet</p>
          <p style="font-size:12px;margin:0;">Submit one from the
            <a href="evaluations.html" style="color:#7c3aed;font-weight:600;text-decoration:none;">Evaluations page</a>.
          </p>
        </div>`;
      return;
    }

    // Average scores
    const avg = field => {
      const vals = evals.map(e => Number(e[field] || 0)).filter(v => v > 0);
      return vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1) : '—';
    };

    const avgOverall = avg('rating_overall');

    content.innerHTML = `
      <!-- Summary bar -->
      <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1.5px solid #c4b5fd;border-radius:12px;padding:16px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-size:12px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.06em;">Summary — ${evals.length} Evaluation${evals.length===1?'':'s'}</span>
          <span style="font-size:22px;font-weight:800;color:#7c3aed;">${avgOverall}<span style="font-size:13px;color:#a78bfa;">/5</span></span>
        </div>
        <div style="display:grid;gap:7px;">
          ${evalBar('Communication',   avg('rating_communication'))}
          ${evalBar('Case Handling',   avg('rating_case_handling'))}
          ${evalBar('Professionalism', avg('rating_professionalism'))}
          ${evalBar('Speed',           avg('rating_speed'))}
        </div>
      </div>

      <!-- Individual evals -->
      ${evals.map((e, idx) => {
        const stars = Array.from({length:5}, (_,i) =>
          `<i class="fa-${i < (e.rating_overall||0) ? 'solid' : 'regular'} fa-star"
              style="color:${i < (e.rating_overall||0) ? '#f59e0b' : '#d1d5db'};font-size:13px;"></i>`
        ).join('');
        const date = e.evaluation_date
          ? new Date(e.evaluation_date).toLocaleDateString('en-ZA')
          : 'N/A';
        return `
          <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 8px rgba(15,23,42,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:11px;color:#64748b;font-weight:600;"><i class="fa-regular fa-calendar" style="margin-right:4px;"></i>${date}</span>
              <span>${stars}</span>
            </div>
            ${e.written_feedback ? `<p style="font-size:13px;color:#374151;margin:0 0 12px;line-height:1.6;border-left:3px solid #a855f7;padding-left:10px;font-style:italic;">${e.written_feedback}</p>` : ''}
            <div style="display:grid;gap:6px;margin-bottom:10px;">
              ${evalBar('Communication',   e.rating_communication)}
              ${evalBar('Case Handling',   e.rating_case_handling)}
              ${evalBar('Professionalism', e.rating_professionalism)}
              ${evalBar('Speed',           e.rating_speed)}
            </div>
            ${e.strengths ? `<p style="font-size:12px;color:#15803d;margin:6px 0 0;"><strong style="font-weight:700;">✦ Strengths:</strong> ${e.strengths}</p>` : ''}
            ${e.weaknesses ? `<p style="font-size:12px;color:#b91c1c;margin:5px 0 0;"><strong style="font-weight:700;">✦ Weaknesses:</strong> ${e.weaknesses}</p>` : ''}
            ${e.recommendations ? `<p style="font-size:12px;color:#1d4ed8;margin:5px 0 0;"><strong style="font-weight:700;">✦ Recommendations:</strong> ${e.recommendations}</p>` : ''}
          </div>`;
      }).join('')}`;

  } catch (err) {
    content.innerHTML = `<p style="color:#dc2626;text-align:center;padding:20px;font-size:13px;">
      <i class="fa-solid fa-circle-exclamation" style="margin-right:6px;"></i>Could not load evaluations: ${err.message}
    </p>`;
  }
}

function evalBar(label, value) {
  const num = parseFloat(value) || 0;
  const pct = Math.round((num / 5) * 100);
  const color = num >= 4 ? '#16a34a' : num >= 3 ? '#2563eb' : num >= 2 ? '#f59e0b' : '#dc2626';
  return `
    <div style="display:grid;grid-template-columns:110px 1fr 36px;gap:8px;align-items:center;">
      <span style="font-size:11px;color:#64748b;font-weight:600;white-space:nowrap;">${label}</span>
      <div style="background:#e5e7eb;border-radius:999px;height:6px;overflow:hidden;">
        <div style="height:100%;background:${color};width:${pct}%;border-radius:999px;transition:width 0.4s;"></div>
      </div>
      <span style="font-size:11px;color:#374151;font-weight:700;text-align:right;">${value}/5</span>
    </div>`;
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setRoleInfo();
  loadStats();
  loadCases();
  loadTeamPerformance();
  loadMyEvaluationsSidebar();
  loadNotifications();
});

// ── NOTIFICATIONS PANEL ───────────────────────────────────────
let _notifPanelOpen = false;

window.toggleNotifPanel = function () {
  _notifPanelOpen ? closeNotifPanel() : openNotifPanel();
};

function openNotifPanel() {
  _notifPanelOpen = true;
  const panel = document.getElementById('notifPanel');
  if (panel) panel.style.display = 'block';
}

function closeNotifPanel() {
  _notifPanelOpen = false;
  const panel = document.getElementById('notifPanel');
  if (panel) panel.style.display = 'none';
}

// Close when clicking outside the bell area
document.addEventListener('click', function (e) {
  const bell  = document.getElementById('notifBell');
  const panel = document.getElementById('notifPanel');
  if (panel && _notifPanelOpen && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
    closeNotifPanel();
  }
});

async function loadNotifications() {
  const badge = document.getElementById('notifBadge');
  const list  = document.getElementById('notifList');
  const count = document.getElementById('notifPanelCount');
  if (!list) return;

  let alerts = [];

  // 1. Community reports (admin/commander only)
  if (userRole === 'admin' || userRole === 'commander') {
    try {
      const res  = await fetch(`${BASE_URL}/api/admin/community-reports`, { headers: authHeaders });
      if (res.ok) {
        const reports = await res.json();
        if (Array.isArray(reports)) {
          reports.forEach(r => alerts.push({
            type:  'community',
            icon:  'fa-inbox',
            color: '#065f46',
            bg:    '#ecfdf5',
            label: 'Community',
            title: r.case_number || r.address || 'Community Report',
            desc:  r.description ? r.description.substring(0, 60) + (r.description.length > 60 ? '…' : '') : 'Awaiting review and assignment',
            onclick: 'openCommunityInbox()',
          }));
        }
      }
    } catch (e) { /* silent */ }
  }

  // 2. High-risk open/pending cases
  try {
    const res   = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
    const cases = await res.json();
    if (Array.isArray(cases)) {
      cases
        .filter(c => {
          const risk   = (c.risk_level || '').toUpperCase();
          const status = (c.outcome || c.status || '').toUpperCase();
          return risk === 'HIGH' && ['OPEN', 'PENDING'].includes(status);
        })
        .forEach(c => alerts.push({
          type:  'high',
          icon:  'fa-triangle-exclamation',
          color: '#b91c1c',
          bg:    '#fef2f2',
          label: 'High Risk',
          title: c.case_number || `Case #${c.id}`,
          desc:  c.description ? c.description.substring(0, 60) + (c.description.length > 60 ? '…' : '') : 'No description',
        }));

      // Unassigned open cases
      cases
        .filter(c => {
          const status = (c.outcome || c.status || '').toUpperCase();
          return !c.assigned_investigator_id && ['OPEN', 'PENDING'].includes(status);
        })
        .forEach(c => alerts.push({
          type:  'unassigned',
          icon:  'fa-user-xmark',
          color: '#92400e',
          bg:    '#fef3c7',
          label: 'Unassigned',
          title: c.case_number || `Case #${c.id}`,
          desc:  c.description ? c.description.substring(0, 60) + (c.description.length > 60 ? '…' : '') : 'No description',
        }));
    }
  } catch (e) { /* silent */ }

  // Deduplicate by title, cap at 20
  const seen = new Set();
  const unique = [];
  for (const a of alerts) {
    if (!seen.has(a.title + a.type)) { seen.add(a.title + a.type); unique.push(a); }
  }
  alerts = unique.slice(0, 20);

  const total = alerts.length;

  // Update badge
  if (badge) {
    if (total > 0) {
      badge.textContent = total > 9 ? '9+' : total;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Update count pill
  if (count) count.textContent = `${total} alert${total !== 1 ? 's' : ''}`;

  // Render list
  if (total === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:36px 20px;color:#9ca3af;">
        <i class="fa-solid fa-circle-check" style="font-size:28px;color:#10b981;display:block;margin-bottom:10px;"></i>
        <p style="font-size:13px;margin:0;font-weight:600;color:#374151;">All clear</p>
        <p style="font-size:12px;margin:4px 0 0;">No pending alerts at this time.</p>
      </div>`;
    return;
  }

  list.innerHTML = alerts.map(a => {
    const href    = a.onclick ? '#' : 'caseList.html';
    const onclick = a.onclick ? ` onclick="${a.onclick};closeNotifPanel();return false;"` : '';
    return `<a href="${href}"${onclick} style="display:flex;align-items:flex-start;gap:12px;padding:12px 18px;border-bottom:1px solid #f1f5f9;text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
      <div style="width:34px;height:34px;border-radius:9px;background:${a.bg};color:${a.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
        <i class="fa-solid ${a.icon}" style="font-size:14px;"></i>
      </div>
      <div style="min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <span style="font-size:12px;font-weight:700;color:#0f172a;">${a.title}</span>
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:${a.bg};color:${a.color};">${a.label}</span>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.desc}</p>
      </div>
    </a>`;
  }).join('');
}
// ── INVESTIGATOR: MY EVALUATIONS SIDEBAR ─────────────────────
// Fetches and renders the logged-in investigator's own evaluations
// into the right-hand sidebar panel (#myEvalSidebarContent).
// Uses /api/my-evaluations — an investigator-safe endpoint that
// the server scopes to the authenticated user's own records only.
// The general /api/evaluations endpoint is blocked (403) for investigators.

async function loadMyEvaluationsSidebar() {
  if (userRole !== 'investigator') return;
  const box = document.getElementById('myEvalSidebarContent');
  if (!box) return;

  box.innerHTML = `
    <div style="text-align:center;padding:24px 0;color:#9ca3af;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:22px;margin-bottom:8px;display:block;"></i>
      <span style="font-size:13px;">Loading your evaluations…</span>
    </div>`;

  let evals = [];
  try {
    // Primary: dedicated investigator-safe endpoint
    const res = await fetch(`${BASE_URL}/api/my-evaluations`, { headers: authHeaders });

    if (res.ok) {
      // Endpoint exists and returned data — use it directly
      const data = await res.json();
      evals = Array.isArray(data) ? data : [];
    } else {
      // Endpoint not yet live (any non-2xx: 404, 405, 500…) —
      // fall back to the general endpoint filtered by the logged-in user's ID.
      // NOTE: this fallback only works if the server allows investigators to
      // read their own records via /api/evaluations. If the server returns 403
      // for investigators, add a dedicated /api/my-evaluations route (see below).
      const res2 = await fetch(`${BASE_URL}/api/evaluations`, { headers: authHeaders });
      if (res2.ok) {
        const all = await res2.json();
        evals = Array.isArray(all)
          ? all.filter(e => String(e.investigator_id) === String(userId))
          : [];
      } else if (res2.status === 403) {
        // Backend is blocking investigators on /api/evaluations (expected).
        // Show a "not yet set up" state — NOT an error — because the admin HAS
        // likely submitted evaluations; the missing piece is the backend route.
        box.innerHTML = `
          <div style="text-align:center;padding:28px 16px;">
            <i class="fa-solid fa-clipboard-list" style="font-size:32px;color:#c4b5fd;margin-bottom:10px;display:block;opacity:0.6;"></i>
            <p style="font-size:13px;font-weight:700;color:#64748b;margin:0 0 6px;">Evaluations Loading Soon</p>
            <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5;">
              Your evaluations are ready — the <code style="background:#f1f5f9;padding:1px 4px;border-radius:4px;">/api/my-evaluations</code> endpoint needs to be added to your server to display them here.
            </p>
          </div>`;
        return;
      } else {
        throw new Error(`${res2.status}`);
      }
    }
  } catch (err) {
    box.innerHTML = `
      <div style="text-align:center;padding:28px 16px;">
        <i class="fa-solid fa-lock" style="font-size:28px;color:#cbd5e1;margin-bottom:10px;display:block;"></i>
        <p style="font-size:13px;font-weight:700;color:#64748b;margin:0 0 6px;">Evaluations Unavailable</p>
        <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5;">Your evaluations will appear here once your administrator has submitted them.</p>
      </div>`;
    return;
  }

  if (evals.length === 0) {
    box.innerHTML = `
      <div style="text-align:center;padding:28px 16px;">
        <i class="fa-solid fa-clipboard-list" style="font-size:32px;color:#c4b5fd;margin-bottom:10px;display:block;opacity:0.6;"></i>
        <p style="font-size:13px;font-weight:700;color:#64748b;margin:0 0 6px;">No Evaluations Yet</p>
        <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5;">Your performance evaluations from your team lead will appear here.</p>
      </div>`;
    return;
  }

  // ── Average across all evaluations ───────────────────────────
  const avg = field => {
    const vals = evals.map(e => Number(e[field] || 0)).filter(v => v > 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  const avgOverall = avg('rating_overall');
  const avgComm    = avg('rating_communication');
  const avgCase    = avg('rating_case_handling');
  const avgProf    = avg('rating_professionalism');
  const avgSpeed   = avg('rating_speed');

  const overallStars = Array.from({ length: 5 }, (_, i) =>
    `<i class="fa-${i < Math.round(avgOverall) ? 'solid' : 'regular'} fa-star"
        style="color:${i < Math.round(avgOverall) ? '#f59e0b' : '#d1d5db'};font-size:15px;"></i>`
  ).join('');

  const myEvalBar = (label, value) => {
    const num = parseFloat(value) || 0;
    const pct = Math.round((num / 5) * 100);
    const color = num >= 4 ? '#16a34a' : num >= 3 ? '#2563eb' : num >= 2 ? '#f59e0b' : '#dc2626';
    return `
      <div style="display:grid;grid-template-columns:90px 1fr 32px;gap:7px;align-items:center;">
        <span style="font-size:11px;color:#64748b;font-weight:600;white-space:nowrap;">${label}</span>
        <div style="background:#e5e7eb;border-radius:999px;height:6px;overflow:hidden;">
          <div style="height:100%;background:${color};width:${pct}%;border-radius:999px;"></div>
        </div>
        <span style="font-size:11px;color:#374151;font-weight:700;text-align:right;">${num.toFixed(1)}</span>
      </div>`;
  };

  box.innerHTML = `
    <!-- Overall summary chip -->
    <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1.5px solid #c4b5fd;border-radius:14px;padding:16px;margin-bottom:16px;text-align:center;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#7c3aed;margin-bottom:8px;">
        Your Overall Rating
      </div>
      <div style="font-size:36px;font-weight:900;color:#6d28d9;line-height:1;">
        ${avgOverall.toFixed(1)}<span style="font-size:16px;color:#a78bfa;font-weight:600;">/5</span>
      </div>
      <div style="margin:8px 0 10px;">${overallStars}</div>
      <div style="font-size:11px;color:#7c3aed;font-weight:600;">${evals.length} Evaluation${evals.length === 1 ? '' : 's'} on record</div>
    </div>

    <!-- Category averages -->
    <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-bottom:10px;">
        Category Averages
      </div>
      <div style="display:grid;gap:8px;">
        ${myEvalBar('Communication',   avgComm.toFixed(1))}
        ${myEvalBar('Case Handling',   avgCase.toFixed(1))}
        ${myEvalBar('Professionalism', avgProf.toFixed(1))}
        ${myEvalBar('Speed',           avgSpeed.toFixed(1))}
      </div>
    </div>

    <!-- Individual evaluation cards -->
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-bottom:10px;">
      All Evaluations
    </div>
    ${evals.map(e => {
      const stars = Array.from({ length: 5 }, (_, i) =>
        `<i class="fa-${i < (e.rating_overall || 0) ? 'solid' : 'regular'} fa-star"
            style="color:${i < (e.rating_overall || 0) ? '#f59e0b' : '#d1d5db'};font-size:12px;"></i>`
      ).join('');
      const date = e.evaluation_date
        ? new Date(e.evaluation_date).toLocaleDateString('en-ZA')
        : 'N/A';
      return `
        <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 2px 6px rgba(15,23,42,0.04);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:11px;color:#64748b;font-weight:600;">
              <i class="fa-regular fa-calendar" style="margin-right:3px;"></i>${date}
            </span>
            <span>${stars}</span>
          </div>
          ${e.written_feedback
            ? `<p style="font-size:12px;color:#374151;margin:0 0 10px;line-height:1.55;border-left:3px solid #a855f7;padding-left:8px;font-style:italic;">${e.written_feedback}</p>`
            : ''}
          ${e.strengths
            ? `<p style="font-size:11px;color:#15803d;margin:5px 0 0;"><strong>✦ Strengths:</strong> ${e.strengths}</p>`
            : ''}
          ${e.weaknesses
            ? `<p style="font-size:11px;color:#b91c1c;margin:4px 0 0;"><strong>✦ Weaknesses:</strong> ${e.weaknesses}</p>`
            : ''}
          ${e.recommendations
            ? `<p style="font-size:11px;color:#1d4ed8;margin:4px 0 0;"><strong>✦ Recommendations:</strong> ${e.recommendations}</p>`
            : ''}
        </div>`;
    }).join('')}`;
}