document.addEventListener('DOMContentLoaded', function () {
  const rootPath = window.location.pathname.replace(/\\/g, '/');
  const isInPagesFolder = rootPath.includes('/pages/');
  const basePath = isInPagesFolder ? '../' : '';

  if (document.querySelector('.global-navbar')) {
    document.body.classList.add('has-global-navbar');
    return;
  }

  const nav = document.createElement('nav');
  nav.className = 'global-navbar';
  nav.setAttribute('aria-label', 'Global application navigation');
  nav.innerHTML = `
    <a class="nav-brand" href="${basePath}index.html">
      <span class="nav-brand-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.25 2.75L6.5 12.25H11.5L10.25 21.25L16.5 11.75H11.5L12.75 2.75H11.25Z" fill="currentColor"/>
        </svg>
      </span>
      <span class="nav-brand-text">
        <span class="title">Eskom Detection</span>
        <span class="subtitle">Theft Detection System</span>
      </span>
    </a>
    <div class="nav-actions">
      <ul class="nav-links">
        <li><a href="${basePath}index.html">Home</a></li>
        <li><a href="${basePath}index.html#features">Features</a></li>
        <li><a href="${basePath}index.html#how-it-works">How It Works</a></li>
        <li><a href="${basePath}index.html#contact">Contact</a></li>
      </ul>
      <a class="nav-cta" href="${basePath}pages/login.html">Get Started</a>
    </div>
  `;

  document.body.insertBefore(nav, document.body.firstChild);
  document.body.classList.add('has-global-navbar');

  const links = nav.querySelectorAll('.nav-links a');
  links.forEach((link) => {
    if (link.href === window.location.href || link.href === window.location.origin + window.location.pathname) {
      link.classList.add('active');
    }
  });
});
