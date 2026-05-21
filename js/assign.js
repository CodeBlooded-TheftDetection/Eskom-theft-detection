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

// ── LOAD INVESTIGATORS ────────────────────────────────────────
// Tries /api/investigators first (direct table, no FK join).
// Falls back to /api/commander/stats if needed.
async function loadInvestigators() {
  const listEl = document.getElementById("investigatorList");
  if (!listEl) return;

  listEl.innerHTML = `<p style="color:#6b7280;">Loading investigators…</p>`;

  try {
    const res = await fetch(`${BASE_URL}/api/investigators`, { headers: authHeaders });

    if (!res.ok) {
      const err = await res.json();
      listEl.innerHTML = `<p style="color:red;">Error: ${err.error || err.message}</p>`;
      return;
    }

    const investigators = await res.json();

    if (!Array.isArray(investigators) || investigators.length === 0) {
      listEl.innerHTML = `<p style="color:#6b7280;text-align:center;">
        No investigators found.<br>
        <a href="admin.html" style="color:#2563eb;">Add via User Management →</a>
      </p>`;
      return;
    }

    listEl.innerHTML = "";

    investigators.forEach(inv => {
      const rate   = inv.assigned > 0 ? Math.round((inv.resolved / inv.assigned) * 100) : 0;
      const active = inv.is_active !== false;
      const name   = inv.full_name || inv.email;
      const badge  = inv.badge_number || inv.investigator_code || "N/A";

      const card = document.createElement("div");
      card.className = "investigator-card";
      card.id = `inv-${inv.id}`;
      card.style.cssText = `
        padding:14px 16px;border:2px solid ${active ? "#e5e9f5" : "#fee2e2"};
        border-radius:10px;margin-bottom:10px;cursor:pointer;
        background:${active ? "#fff" : "#fff9f9"};transition:border-color .2s;
      `;
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#0f1a3e;">${name}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">${inv.email} | Code: ${badge}</p>
            <div style="display:flex;gap:8px;font-size:11.5px;color:#374151;">
              <span>📋 Assigned: <strong>${inv.assigned || 0}</strong></span>
              <span>✅ Resolved: <strong>${inv.resolved || 0}</strong></span>
            </div>
          </div>
          <span style="font-size:11px;padding:3px 8px;border-radius:6px;font-weight:700;
            background:${active ? "#dcfce7" : "#fee2e2"};color:${active ? "#15803d" : "#b91c1c"};">
            ${active ? "Available" : "Inactive"}
          </span>
        </div>
        <div style="margin-top:10px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;margin-bottom:4px;">
            <span>Resolution rate</span><span>${rate}%</span>
          </div>
          <div style="height:6px;background:#e5e9f5;border-radius:3px;">
            <div style="height:100%;width:${rate}%;background:#2563eb;border-radius:3px;"></div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        document.querySelectorAll(".investigator-card").forEach(c => {
          c.style.borderColor = "#e5e9f5";
          c.style.boxShadow   = "none";
        });
        card.style.borderColor = "#2563eb";
        card.style.boxShadow   = "0 0 0 3px #2563eb22";
        selectedInvestigatorId = inv.id;
        showMessage("Investigator selected. Now choose a case and click Assign.", "info");
      });

      listEl.appendChild(card);
    });

  } catch (err) {
    listEl.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

// ── LOAD CASES ────────────────────────────────────────────────
async function loadCases() {
  const caseSelect  = document.getElementById("caseSelect");
  const caseSummary = document.getElementById("caseSummary");
  if (!caseSelect) return;

  caseSelect.innerHTML = `<option value="">Loading cases…</option>`;

  try {
    const res = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
    if (!res.ok) return;

    allCases = await res.json();
    const open = allCases.filter(c => c.outcome !== "RESOLVED");

    if (open.length === 0) {
      caseSelect.innerHTML = `<option value="">All open cases already assigned</option>`;
      return;
    }

    caseSelect.innerHTML = `<option value="">— Select a case to assign —</option>` +
      open.map(c => {
        const label = c.assigned_investigator_id ? " [assigned]" : " [unassigned]";
        return `<option value="${c.id}">${c.case_number || c.id?.slice(0,8)} — ${c.suspect_name || "Unknown"} [${c.risk_level || "N/A"}]${label}</option>`;
      }).join("");

    caseSelect.addEventListener("change", () => {
      selectedCaseId = caseSelect.value || null;
      const c = allCases.find(x => x.id === caseSelect.value);
      if (caseSummary) {
        if (!c) {
          caseSummary.innerHTML = `<p style="color:#6b7280;">Select a case above to see its details.</p>`;
          return;
        }
        const inv     = c.investigators;
        const invName = inv?.full_name || inv?.email || "Unassigned";
        const riskColor = { HIGH:"#dc2626", MID:"#f59e0b", LOW:"#16a34a" }[c.risk_level] || "#6b7280";
        caseSummary.innerHTML = `
          <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span style="font-weight:700;color:#0f1a3e;">${c.case_number || "N/A"}</span>
            <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;
              background:${riskColor}22;color:${riskColor};">${c.risk_level || "N/A"}</span>
            <span style="font-size:11px;color:#6b7280;">${c.outcome || "N/A"}</span>
          </div>
          <p style="margin:0 0 4px;font-weight:600;color:#1e293b;">${c.suspect_name || "Unknown"}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#64748b;">${c.description || "No description."}</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">Currently: <strong>${invName}</strong></p>`;
      }
    });

  } catch (err) {
    caseSelect.innerHTML = `<option value="">Error loading cases</option>`;
  }
}

// ── ASSIGN ────────────────────────────────────────────────────
async function assignInvestigator() {
  if (!selectedInvestigatorId) {
    showMessage("Please click an investigator card first.", "error"); return;
  }
  if (!selectedCaseId) {
    showMessage("Please select a case from the dropdown.", "error"); return;
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
    selectedCaseId         = null;
    selectedInvestigatorId = null;

    document.querySelectorAll(".investigator-card").forEach(c => {
      c.style.borderColor = "#e5e9f5";
      c.style.boxShadow   = "none";
    });

    const caseSummary = document.getElementById("caseSummary");
    if (caseSummary) caseSummary.innerHTML = `<p style="color:#6b7280;">Select a case above to see its details.</p>`;

    await Promise.all([loadCases(), loadInvestigators()]);
  } catch (err) {
    showMessage(`Failed: ${err.message}`, "error");
  }
}

// ── STATUS MESSAGE ─────────────────────────────────────────────
function showMessage(msg, type) {
  const el = document.getElementById("message");
  if (!el) return;
  const styles = {
    success: "color:#15803d;background:#dcfce7;border:1px solid #bbf7d0;",
    error:   "color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;",
    info:    "color:#1d4ed8;background:#dbeafe;border:1px solid #bfdbfe;",
  };
  el.textContent = msg;
  el.style.cssText = `padding:10px 14px;border-radius:8px;font-size:13px;
    font-weight:600;display:block;margin-top:10px;${styles[type] || styles.info}`;
  if (type === "success") setTimeout(() => el.textContent = "", 4000);
}

// ── INIT ──────────────────────────────────────────────────────
loadInvestigators();
loadCases();