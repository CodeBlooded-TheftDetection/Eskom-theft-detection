// js/sidebar.js — Single source of truth for role-aware navigation
(function () {
  // Each role gets its own ordered menu — no shared base array to confuse things
  const MENUS = {
    admin: [
      { href: 'dashboard.html',   icon: 'layout-dashboard', label: 'Dashboard' },
      { href: 'map.html',         icon: 'map',              label: 'Map View' },
      { href: 'caseList.html',    icon: 'list',             label: 'Case List' },
      { href: 'assign.html',      icon: 'user-check',       label: 'Assign Cases' },
      { href: 'resolved.html',    icon: 'check-circle',     label: 'Resolved Cases' },
      { href: 'report.html',      icon: 'bar-chart-3',      label: 'Reports' },
      { href: 'evaluations.html', icon: 'star',             label: 'Evaluations' },
      { href: 'admin.html',       icon: 'settings',         label: 'User Management' },
    ],
    commander: [
      { href: 'dashboard.html',   icon: 'layout-dashboard', label: 'Dashboard' },
      { href: 'map.html',         icon: 'map',              label: 'Map View' },
      { href: 'caseList.html',    icon: 'list',             label: 'Case List' },
      { href: 'assign.html',      icon: 'user-check',       label: 'Assign Cases' },
      { href: 'resolved.html',    icon: 'check-circle',     label: 'Resolved Cases' },
      { href: 'report.html',      icon: 'bar-chart-3',      label: 'Reports' },
      { href: 'evaluations.html', icon: 'star',             label: 'Evaluations' },
    ],
    investigator: [
      { href: 'dashboard.html',   icon: 'layout-dashboard', label: 'Dashboard' },
      { href: 'map.html',         icon: 'map',              label: 'Map View' },
      { href: 'caseList.html',    icon: 'list',             label: 'Case List' },
      { href: 'record.html',      icon: 'edit-3',           label: 'Record Outcome' },
      { href: 'resolved.html',    icon: 'check-circle',     label: 'Resolved Cases' },
    ],
  };

  function buildSidebar() {
    const token = localStorage.getItem('token');
    const role  = (localStorage.getItem('userRole') || '').toLowerCase();

    if (!token)        { window.location.href = 'login.html';        return; }
    if (role === 'user') { window.location.href = 'user-dashboard.html'; return; }

    const menuEl = document.getElementById('sidebarMenu') || document.querySelector('.menu');
    if (!menuEl) return;

    const items   = MENUS[role] || MENUS.investigator;
    const current = window.location.pathname.split('/').pop();

    menuEl.innerHTML =
      `<p class="menu-title">NAVIGATION</p>` +
      items.map(i =>
        `<a href="${i.href}" class="${i.href === current ? 'active' : ''}" style="display:flex;align-items:center;gap:10px;">
          <i data-lucide="${i.icon}"></i>
          <span class="menu-label">${i.label}</span>
        </a>`
      ).join('') +
      `<a href="login.html" id="logoutBtn" style="display:flex;align-items:center;gap:10px;margin-top:8px;opacity:0.8;">
        <i data-lucide="log-out"></i>
        <span class="menu-label">Logout</span>
      </a>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => localStorage.clear());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSidebar);
  } else {
    buildSidebar();
  }

  window.buildUnifiedSidebar = buildSidebar;
})();
