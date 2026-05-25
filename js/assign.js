// assign.js — Assign Investigator Page
const BASE_URL = "http://localhost:3000";

const token    = localStorage.getItem("token");
const userRole = localStorage.getItem("userRole") || "";

if (!token) window.location.href = "login.html";

const authHeaders = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
};

let selectedInvestigatorId = null;
let selectedCaseId         = null;
let allCases               = [];
let allInvestigators       = [];
let activeFilter           = "all";   // "all" | "available" | "occupied"

// ── INVESTIGATOR FILTER TABS ──────────────────────────────────
// "available" = no open (unresolved) cases currently active
// "occupied"  = has at least one open case assigned
function setFilter(filter) {
  activeFilter = filter;

  // Update tab active states
  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.filter === filter);
  });

  renderInvestigators();
}

function investigatorStatus(inv) {
  // Active open cases = assigned minus resolved
  const openCases = (inv.assigned || 0) - (inv.resolved || 0);
  if (inv.is_active === false) return "inactive";
  return openCases > 0 ? "occupied" : "available";
}

// ── LOAD INVESTIGATORS ────────────────────────────────────────
async function loadInvestigators() {
  const listEl = document.getElementById("investigatorList");
  if (!listEl) return;
  listEl.innerHTML = `<p style="color:#9ca3af;font-size:13px;">Loading investigators…</p>`;

  try {
    const res = await fetch(`${BASE_URL}/api/investigators`, { headers: authHeaders });
    if (!res.ok) {
      const err = await res.json();
      listEl.innerHTML = `<p style="color:#ef4444;font-size:13px;">Error: ${err.error || err.message}</p>`;
      return;
    }

    allInvestigators = await res.json();

    if (!Array.isArray(allInvestigators) || allInvestigators.length === 0) {
      listEl.innerHTML = `<p style="color:#9ca3af;font-size:13px;text-align:center;">
        No investigators found.<br>
        <a href="admin.html" style="color:#16a34a;font-weight:600;">Add via User Management →</a>
      </p>`;
      return;
    }

    updateTabCounts();
    renderInvestigators();

  } catch (err) {
    document.getElementById("investigatorList").innerHTML =
      `<p style="color:#ef4444;font-size:13px;">Error: ${err.message}</p>`;
  }
}

function updateTabCounts() {
  const counts = { all: 0, available: 0, occupied: 0, inactive: 0 };
  allInvestigators.forEach(inv => {
    counts.all++;
    const s = investigatorStatus(inv);
    if (s === "available") counts.available++;
    else if (s === "occupied") counts.occupied++;
    else counts.inactive++;
  });
  document.getElementById("countAll").textContent       = counts.all;
  document.getElementById("countAvailable").textContent = counts.available;
  document.getElementById("countOccupied").textContent  = counts.occupied;
}

function renderInvestigators() {
  const listEl = document.getElementById("investigatorList");
  if (!listEl) return;

  let visible = allInvestigators;
  if (activeFilter === "available") {
    visible = allInvestigators.filter(inv => investigatorStatus(inv) === "available");
  } else if (activeFilter === "occupied") {
    visible = allInvestigators.filter(inv => investigatorStatus(inv) === "occupied");
  }

  if (visible.length === 0) {
    listEl.innerHTML = `<p style="color:#9ca3af;font-size:13px;text-align:center;padding:24px 0;">
      No investigators match this filter.
    </p>`;
    return;
  }

  listEl.innerHTML = "";
  visible.forEach(inv => {
    const status   = investigatorStatus(inv);
    const rate     = inv.assigned > 0 ? Math.round((inv.resolved / inv.assigned) * 100) : 0;
    const name     = inv.full_name || inv.email;
    const badge    = inv.badge_number || inv.investigator_code || "N/A";
    const initial  = name.charAt(0).toUpperCase();
    const openCases = Math.max(0, (inv.assigned || 0) - (inv.resolved || 0));

    const statusLabels = {
      available: "Available",
      occupied:  `Occupied · ${openCases} open`,
      inactive:  "Inactive",
    };

    const card = document.createElement("div");
    card.className = `inv-card${status === "inactive" ? " inactive" : ""}`;
    card.id = `inv-${inv.id}`;

    card.innerHTML = `
      <div class="inv-card-top">
        <div class="inv-avatar-wrap">
          <div class="inv-avatar ${status}">${initial}</div>
          <div>
            <p class="inv-info-name">${name}</p>
            <p class="inv-info-sub">${inv.email} &nbsp;·&nbsp; Code: ${badge}</p>
          </div>
        </div>
        <span class="inv-status-badge ${status}">${statusLabels[status]}</span>
      </div>
      <div class="inv-stats">
        <span>Assigned: <strong>${inv.assigned || 0}</strong></span>
        <span>Resolved: <strong>${inv.resolved || 0}</strong></span>
        <span>Open: <strong>${openCases}</strong></span>
      </div>
      <div class="progress-wrap">
        <div class="progress-meta">
          <span>Resolution rate</span>
          <span>${rate}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${status === 'occupied' ? 'occupied' : ''}"
               style="width:${rate}%"></div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      // Deselect all
      document.querySelectorAll(".inv-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedInvestigatorId = inv.id;
      showMessage(`Investigator selected: ${name}. Now pick a case and click Assign.`, "info");
    });

    listEl.appendChild(card);
  });
}

// ── LOAD CASES ────────────────────────────────────────────────
async function loadCases() {
  const resultsEl = document.getElementById("caseResults");
  if (!resultsEl) return;

  resultsEl.innerHTML = `<div class="case-empty">Loading cases…</div>`;

  try {
    const res = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
    if (!res.ok) {
      resultsEl.innerHTML = `<div class="case-empty" style="color:#ef4444;">Failed to load cases.</div>`;
      return;
    }

    const raw = await res.json();
    allCases = (Array.isArray(raw) ? raw : []).filter(c => c.outcome !== "RESOLVED");

    renderCaseResults("");

  } catch (err) {
    document.getElementById("caseResults").innerHTML =
      `<div class="case-empty" style="color:#ef4444;">Error: ${err.message}</div>`;
  }
}

// ── RENDER CASE RESULTS ───────────────────────────────────────
function renderCaseResults(query) {
  const resultsEl = document.getElementById("caseResults");
  if (!resultsEl) return;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? allCases.filter(c =>
        (c.case_number || "").toLowerCase().includes(q) ||
        (c.suspect_name || "").toLowerCase().includes(q)
      )
    : allCases;

  if (filtered.length === 0) {
    resultsEl.innerHTML = `<div class="case-empty">
      ${q ? `No cases match "<strong>${escapeHtml(query)}</strong>"` : "No open cases found."}
    </div>`;
    return;
  }

  resultsEl.innerHTML = filtered.map(c => {
    const riskClass  = (c.risk_level || "low").toLowerCase();
    const isAssigned = !!c.assigned_investigator_id;
    const isSelected = c.id === selectedCaseId;
    return `
      <div class="case-result-item${isSelected ? " selected" : ""}"
           onclick="selectCase('${c.id}')" data-case-id="${c.id}">
        <div class="case-assigned-dot ${isAssigned ? "assigned" : "unassigned"}"
             title="${isAssigned ? "Already assigned" : "Unassigned"}"></div>
        <span class="case-num">${escapeHtml(c.case_number || c.id?.slice(0, 8) || "N/A")}</span>
        <span class="case-suspect">${escapeHtml(c.suspect_name || "Unknown")}</span>
        <span class="case-risk-badge ${riskClass}">${c.risk_level || "N/A"}</span>
      </div>`;
  }).join("");
}

// ── FILTER CASES (search input handler) ──────────────────────
function filterCases() {
  const q = document.getElementById("caseSearch")?.value || "";
  renderCaseResults(q);
}

// ── CLEAR CASE SEARCH ─────────────────────────────────────────
function clearCaseSearch() {
  const input = document.getElementById("caseSearch");
  if (input) { input.value = ""; input.focus(); }
  renderCaseResults("");
}

// ── SELECT A CASE ─────────────────────────────────────────────
function selectCase(caseId) {
  selectedCaseId = caseId;

  // Highlight the clicked row
  document.querySelectorAll(".case-result-item").forEach(el => {
    el.classList.toggle("selected", el.dataset.caseId === caseId);
  });

  // Update case summary panel
  const c = allCases.find(x => x.id === caseId);
  const summaryEl = document.getElementById("caseSummary");
  if (!summaryEl) return;

  if (!c) {
    summaryEl.className = "";
    summaryEl.innerHTML = `<p style="color:#9ca3af;font-size:13px;margin:0;">
      Select a case above to see its details.</p>`;
    return;
  }

  const inv      = c.investigators;
  const invName  = inv?.full_name || inv?.email || "Unassigned";
  const riskClass = (c.risk_level || "low").toLowerCase();
  const riskColor = { high: "#b91c1c", mid: "#92400e", low: "#15803d" }[riskClass] || "#6b7280";
  const riskBg    = { high: "#fee2e2", mid: "#fef3c7", low: "#dcfce7" }[riskClass] || "#f3f4f6";

  summaryEl.className = "has-data";
  summaryEl.innerHTML = `
    <div class="summary-header">
      <span class="summary-case-num">${escapeHtml(c.case_number || "N/A")}</span>
      <span class="case-risk-badge ${riskClass}">${c.risk_level || "N/A"}</span>
      <span class="summary-outcome">${c.outcome || "OPEN"}</span>
    </div>
    <p class="summary-suspect">${escapeHtml(c.suspect_name || "Unknown")}</p>
    <p class="summary-desc">${escapeHtml(c.description || "No description provided.")}</p>
    <div class="summary-inv">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Currently assigned to: <strong>${escapeHtml(invName)}</strong>
    </div>
  `;
}

// ── ASSIGN ────────────────────────────────────────────────────
async function assignInvestigator() {
  if (!selectedInvestigatorId) {
    showMessage("Please click an investigator card first.", "error"); return;
  }
  if (!selectedCaseId) {
    showMessage("Please search and select a case first.", "error"); return;
  }

  showMessage("Assigning…", "info");

  try {
    const res = await fetch(`${BASE_URL}/api/cases/${selectedCaseId}`, {
      method:  "PUT",
      headers: authHeaders,
      body:    JSON.stringify({ assigned_investigator_id: selectedInvestigatorId })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || e.error); }

    showMessage("✔ Investigator assigned successfully!", "success");

    // Reset selection state
    selectedCaseId         = null;
    selectedInvestigatorId = null;

    document.querySelectorAll(".inv-card").forEach(c => c.classList.remove("selected"));

    const summaryEl = document.getElementById("caseSummary");
    if (summaryEl) {
      summaryEl.className = "";
      summaryEl.innerHTML = `<p style="color:#9ca3af;font-size:13px;margin:0;">
        Search and select a case above to see its details.</p>`;
    }
    const searchEl = document.getElementById("caseSearch");
    if (searchEl) searchEl.value = "";

    await Promise.all([loadCases(), loadInvestigators()]);

  } catch (err) {
    showMessage(`Failed: ${err.message}`, "error");
  }
}

// ── STATUS MESSAGE ─────────────────────────────────────────────
function showMessage(msg, type) {
  const el = document.getElementById("message");
  if (!el) return;
  el.textContent = msg;
  el.className   = `show ${type}`;
  if (type === "success") setTimeout(() => { el.className = ""; el.textContent = ""; }, 4000);
}

// ── HELPERS ───────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── INIT ──────────────────────────────────────────────────────
loadInvestigators();
loadCases();