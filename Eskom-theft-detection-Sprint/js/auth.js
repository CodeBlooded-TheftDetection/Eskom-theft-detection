// ============================================================
// auth.js — Shared Authentication Utility
// ============================================================
// This module provides helper functions for all protected pages.
//
// localStorage keys used across the app:
//   token     → JWT bearer token  (sent as Authorization header)
//   userRole  → 'admin' | 'commander' | 'investigator' | 'user'
//   userId    → UUID of the logged-in user
//   full_name → Display name of the logged-in user
//
// Login / signup logic lives inline in pages/login.html.
// ============================================================

const BASE_URL = ''; // Relative URLs: /api/... resolves to current domain

// ── HELPERS ───────────────────────────────────────────────────

/** Returns the stored JWT token (or null). */
function getToken() {
  return localStorage.getItem('token');
}

/** Returns Authorization + Content-Type headers for fetch calls. */
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

/** Returns the stored role (lowercase), defaulting to 'user'. */
function getUserRole() {
  return (localStorage.getItem('userRole') || 'user').toLowerCase();
}

/** Returns the stored user ID. */
function getUserId() {
  return localStorage.getItem('userId');
}

/** Returns the stored display name. */
function getFullName() {
  return localStorage.getItem('full_name') || '';
}

/**
 * Guards a page: if the user is not logged in, or their role is not in
 * allowedRoles, redirect them to the login page.
 *
 * @param {string[]} [allowedRoles]  If omitted, any logged-in role is accepted.
 */
function requireAuth(allowedRoles) {
  const token = getToken();
  if (!token) {
    window.location.href = '../pages/login.html';
    return false;
  }
  if (allowedRoles && allowedRoles.length > 0) {
    const role = getUserRole();
    if (!allowedRoles.includes(role)) {
      alert(`Access denied. This page requires: ${allowedRoles.join(', ')}.`);
      window.location.href = '../pages/login.html';
      return false;
    }
  }
  return true;
}

/** Clears all auth data and redirects to the login page. */
function logout() {
  localStorage.clear();
  window.location.href = '../pages/login.html';
}

// ── ROLE-BASED REDIRECT (used after login) ────────────────────
const ROLE_REDIRECTS = {
  admin:       '../pages/dashboard.html',
  commander:   '../pages/dashboard.html',
  investigator:'../pages/dashboard.html',
  user:        '../pages/user-dashboard.html',
};