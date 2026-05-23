// Unified sidebar builder for all admin pages
(function(){
  const BASE_ITEMS = [
    { href: 'dashboard.html',   icon: 'layout-dashboard', label: 'Main Dashboard',      roles: ['admin','investigator'] },
    { href: 'cases.html',       icon: 'file-text',        label: 'Case Detail',          roles: ['admin','investigator'] },
    { href: 'map.html',         icon: 'map',              label: 'Map View',             roles: ['admin','investigator'] },
    { href: 'assign.html',      icon: 'user-check',       label: 'Assign Investigator',  roles: ['admin'] },
    { href: 'resolved.html',    icon: 'check-circle',     label: 'Resolved Cases',       roles: ['admin'] },
    { href: 'caseList.html',    icon: 'list',             label: 'Case List',            roles: ['admin','investigator'] },
    { href: 'report.html',      icon: 'bar-chart-3',      label: 'Report Screen',        roles: ['admin'] }
  ];

  function buildSidebar() {
    const menuEl = document.getElementById('sidebarMenu') || document.querySelector('.menu');
    if (!menuEl) return;

    const userRole = (localStorage.getItem('userRole') || 'investigator').toLowerCase();
    const currentPage = window.location.pathname.split('/').pop();

    const visible = BASE_ITEMS.filter(i => i.roles.includes(userRole));

    menuEl.innerHTML = `<p class="menu-title">NAVIGATION</p>` +
      visible.map(i => `
        <a href="${i.href}" class="${i.href === currentPage ? 'active' : ''}" style="display:flex;align-items:center;gap:10px;">
          <i data-lucide="${i.icon}"></i>
          <span class="menu-label">${i.label}</span>
        </a>
      `).join('') +
      `
      <a href="login.html" id="logoutBtn" style="display:flex;align-items:center;gap:10px;">
        <i data-lucide="log-out"></i>
        <span class="menu-label">Logout</span>
      </a>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', (e) => { localStorage.clear(); });
  }

  // Build on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSidebar);
  } else buildSidebar();

  // Expose for manual rebuild if needed
  window.buildUnifiedSidebar = buildSidebar;
})();
