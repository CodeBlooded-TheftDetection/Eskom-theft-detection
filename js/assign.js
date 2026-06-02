// assign.js — Assign Investigator Page
const BASE_URL = ''; // Relative URLs: /api/... resolves to current domain

const token    = localStorage.getItem("token");
const userRole = localStorage.getItem("userRole") || "";

if (!token) window.location.href = "login.html";

const authHeaders = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
};

let selectedInvestigatorId = null;
let selectedCaseIds        = new Set();   // multi-case selection
let allCases               = [];
let allInvestigators       = [];
let activeSortOrder        = "desc";      // "asc" | "desc" — sort by cases assigned

// ── SORT ORDER ────────────────────────────────────────────────
function setSortOrder(order) {
  activeSortOrder = order;

  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.sort === order);
  });

  renderInvestigators();
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
        <a href="admin.html" style="color:#16a34a;font-weight:600;">Add via User Management (role: Investigator) →</a>
      </p>`;
      return;
    }

    renderInvestigators();

  } catch (err) {
    document.getElementById("investigatorList").innerHTML =
      `<p style="color:#ef4444;font-size:13px;">Error: ${err.message}</p>`;
  }
}

function investigatorStatus(inv) {
  const openCases = Math.max(0, (inv.assigned || 0) - (inv.resolved || 0));
  if (inv.is_active === false) return "inactive";
  return openCases > 0 ? "occupied" : "available";
}

function renderInvestigators() {
  const listEl = document.getElementById("investigatorList");
  if (!listEl) return;

  // Sort by assigned cases
  const sorted = allInvestigators.slice().sort((a, b) => {
    const diff = (a.assigned || 0) - (b.assigned || 0);
    return activeSortOrder === "asc" ? diff : -diff;
  });

  if (sorted.length === 0) {
    listEl.innerHTML = `<p style="color:#9ca3af;font-size:13px;text-align:center;padding:24px 0;">No investigators found.</p>`;
    return;
  }

  listEl.innerHTML = "";
  sorted.forEach(inv => {
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
    if (String(inv.id) === String(selectedInvestigatorId)) card.classList.add("selected");
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
      document.querySelectorAll(".inv-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedInvestigatorId = inv.id;
      showMessage(`Investigator selected: ${name}. Now pick one or more cases and click Assign.`, "info");
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
    const isSelected = selectedCaseIds.has(c.id);
    return `
      <div class="case-result-item${isSelected ? " selected" : ""}"
           onclick="toggleCase('${c.id}')" data-case-id="${c.id}">
        <div class="case-assigned-dot ${isAssigned ? "assigned" : "unassigned"}"
             title="${isAssigned ? "Already assigned" : "Unassigned"}"></div>
        <span class="case-num">${escapeHtml(c.case_number || c.id?.slice(0, 8) || "N/A")}</span>
        <span class="case-suspect">${escapeHtml(c.suspect_name || "Unknown")}</span>
        <span class="case-risk-badge ${riskClass}">${c.risk_level || "N/A"}</span>
        <span style="margin-left:auto;flex-shrink:0;" title="${isSelected ? 'Deselect' : 'Select'}">
          ${isSelected
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>`
          }
        </span>
      </div>`;
  }).join("");
}

// ── FILTER CASES ──────────────────────────────────────────────
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

// ── TOGGLE CASE SELECTION (multi-select) ─────────────────────
function toggleCase(caseId) {
  if (selectedCaseIds.has(caseId)) {
    selectedCaseIds.delete(caseId);
  } else {
    selectedCaseIds.add(caseId);
  }
  updateSelectionBar();

  // Re-render to update checkmarks
  const q = document.getElementById("caseSearch")?.value || "";
  renderCaseResults(q);

  // Update case summary panel
  updateCaseSummary();
}

function clearCaseSelections() {
  selectedCaseIds.clear();
  updateSelectionBar();
  const q = document.getElementById("caseSearch")?.value || "";
  renderCaseResults(q);
  updateCaseSummary();
}

function updateSelectionBar() {
  const bar   = document.getElementById("selectedCasesBar");
  const label = document.getElementById("selectedCasesLabel");
  if (!bar || !label) return;
  const count = selectedCaseIds.size;
  if (count === 0) {
    bar.classList.remove("visible");
  } else {
    bar.classList.add("visible");
    label.textContent = `${count} case${count === 1 ? "" : "s"} selected`;
  }
}

// ── CASE SUMMARY PANEL ────────────────────────────────────────
function updateCaseSummary() {
  const summaryEl = document.getElementById("caseSummary");
  if (!summaryEl) return;

  const ids = [...selectedCaseIds];
  if (ids.length === 0) {
    summaryEl.className = "";
    summaryEl.innerHTML = `<p style="color:#9ca3af;font-size:13px;margin:0;">
      Select one or more cases above to see details.</p>`;
    return;
  }

  if (ids.length === 1) {
    const c = allCases.find(x => x.id === ids[0]);
    if (!c) return;
    const inv     = c.investigators;
    const invName = inv?.full_name || inv?.email || "Unassigned";
    const riskClass = (c.risk_level || "low").toLowerCase();
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
      </div>`;
    return;
  }

  // Multiple cases selected
  summaryEl.className = "has-data";
  const casesList = ids.map(id => {
    const c = allCases.find(x => x.id === id);
    return c ? escapeHtml(c.case_number || id) : id;
  });
  summaryEl.innerHTML = `
    <p style="font-size:13px;font-weight:700;color:#052e16;margin:0 0 6px;">
      ${ids.length} cases selected
    </p>
    <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;">
      ${casesList.join(" &nbsp;·&nbsp; ")}
    </p>`;
}

// Legacy — keep selectCase for backwards compatibility but redirect to toggle
function selectCase(caseId) { toggleCase(caseId); }

// ── ASSIGN ────────────────────────────────────────────────────
async function assignInvestigator() {
  if (!selectedInvestigatorId) {
    showMessage("Please click an investigator card first.", "error"); return;
  }
  if (selectedCaseIds.size === 0) {
    showMessage("Please select at least one case first.", "error"); return;
  }

  const ids = [...selectedCaseIds];
  showMessage(`Assigning ${ids.length} case${ids.length === 1 ? "" : "s"}…`, "info");

  const results = { ok: 0, fail: 0, errors: [] };

  for (const caseId of ids) {
    try {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}`, {
        method:  "PUT",
        headers: authHeaders,
        body:    JSON.stringify({ assigned_investigator_id: selectedInvestigatorId })
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || e.error || `HTTP ${res.status}`);
      }
      results.ok++;
    } catch (err) {
      results.fail++;
      results.errors.push(err.message);
    }
  }

  if (results.fail === 0) {
    showMessage(`✔ ${results.ok} case${results.ok === 1 ? "" : "s"} assigned successfully!`, "success");
  } else {
    showMessage(`${results.ok} assigned, ${results.fail} failed: ${results.errors[0]}`, results.ok > 0 ? "info" : "error");
  }

  // Reset selections
  selectedCaseIds.clear();
  selectedInvestigatorId = null;

  document.querySelectorAll(".inv-card").forEach(c => c.classList.remove("selected"));

  const summaryEl = document.getElementById("caseSummary");
  if (summaryEl) {
    summaryEl.className = "";
    summaryEl.innerHTML = `<p style="color:#9ca3af;font-size:13px;margin:0;">
      Search and select cases above to see details.</p>`;
  }
  const searchEl = document.getElementById("caseSearch");
  if (searchEl) searchEl.value = "";

  updateSelectionBar();

  await Promise.all([loadCases(), loadInvestigators()]);
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