// ============================================================
// auth.js — Login Form Handler
// ============================================================
// UPDATED: After a successful login the server now returns
// { token, role } instead of just { token }.
// We store BOTH in localStorage so every other page can:
//   1. Include the token in API headers (authentication)
//   2. Read the role to render the correct dashboard (authorisation)
//
// RBAC frontend flow:
//   login → store token + role → redirect to dashboard.html
//   dashboard.html → reads role → renders role-specific layout
// ============================================================

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const role     = document.getElementById("role").value;

  // Show an error immediately if no role was selected.
  // The role dropdown has a blank default option so the user
  // must actively choose Admin, Commander, or Investigator.
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.classList.remove("show");

  if (!role) {
    errorMsg.textContent = "Please select a role before logging in.";
    errorMsg.classList.add("show");
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    });

    const data = await res.json();

    if (!res.ok) {
      // Server returned an error (wrong password, wrong role, etc.)
      errorMsg.textContent = data.message || "Login failed. Please try again.";
      errorMsg.classList.add("show");
      return;
    }

    // ── STORE AUTH DATA ────────────────────────────────────
    // token → sent as "Authorization: Bearer <token>" on every API call
    // role  → read by each page to render the correct UI layout
    // Both are stored in localStorage so they survive page navigation.
    localStorage.setItem("token", data.token);
    localStorage.setItem("userRole", data.role); // 'admin', 'commander', or 'investigator'

    // ── ROLE-BASED REDIRECT ────────────────────────────────
    // Redirect based on user role to appropriate dashboard
    const roleRedirects = {
      admin: "../pages/dashboard.html",
      commander: "../pages/dashboard.html",
      investigator: "../pages/dashboard.html",
      user: "../pages/user-dashboard.html"
    };

    const redirectUrl = roleRedirects[data.role] || "../pages/dashboard.html";
    window.location.href = redirectUrl;

  } catch (err) {
    errorMsg.textContent = "Server error. Make sure the backend is running.";
    errorMsg.classList.add("show");
  }
});