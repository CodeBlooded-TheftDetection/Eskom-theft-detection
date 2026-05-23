// ============================================================
// report.js — Report Screen (report.html)
// ============================================================
// WHAT THIS FILE DOES:
//   Fetches the specific case selected by the user (stored in
//   localStorage as "selectedCaseId") from the backend API and
//   populates all the report HTML fields with real database values.
//
//   Replaces the old hardcoded `caseData` object entirely.
//   All field values now come from the live Supabase database.
//
// HOW IT FITS IN THE PROJECT:
//   report.html → report.js → GET /api/cases → filter by ID
//                           → populates HTML fields dynamically
//
// NOTE ON STATUS:
//   The case status ("Open", "Assigned", "Resolved") is fetched
//   from the database and displayed clearly — satisfying the
//   requirement to show whether a case is Open or Resolved.
// ============================================================

const BASE_URL = "http://localhost:3000";

// ── GUARD: Must be logged in ──────────────────────────────────
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

// ── AUTH HEADERS ──────────────────────────────────────────────
const authHeaders = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
};

// ── FETCH THE SELECTED CASE FROM THE DATABASE ─────────────────
// The case ID is stored in localStorage by cases.js or
// dashboard.js when the user clicks "Generate Report".
// We fetch all cases and find the one with the matching ID.
async function loadReport() {
  const selectedId = localStorage.getItem("selectedCaseId");

  if (!selectedId) {
    // No case was selected — prompt to go back and pick one
    showError("No case selected. Please go back and choose a case to report on.");
    return;
  }

  // Update the report subtitle immediately so the user sees
  // which case is loading while the fetch completes
  setById("reportSubtitle", `Case Report — ${selectedId}`);

  try {
    // Fetch all cases the user has access to, then find the selected one.
    // (A dedicated GET /api/cases/:id endpoint would be more efficient,
    // but the existing server only has GET /api/cases — this works correctly.)
    const res = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const cases = await res.json();

    // Find the specific case the user selected
    const c = cases.find(x => String(x.id) === String(selectedId));

    if (!c) {
      showError(`Case "${selectedId}" was not found. It may have been deleted.`);
      return;
    }

    // Populate all report fields with real database values
    populateReport(c);

  } catch (err) {
    showError(`Failed to load case data: ${err.message}`);
  }
}

// ── POPULATE REPORT FIELDS ────────────────────────────────────
// Takes a case object returned from the API and injects each
// field into the corresponding HTML element.
// All values are live from Supabase — nothing is faked.
function populateReport(c) {
  // Header / subtitle
  setById("reportSubtitle", `Case Report — ${c.id}`);
  setById("caseNumber",     c.id);

  // Core case fields from the 'cases' table
  setById("suspectName",         c.suspect_name   || "Not recorded");
  setById("caseStatus",          c.status         || "Unknown");
  setById("description",         c.description    || "No description on file");
  setById("assignedInvestigator",c.assigned_to    || "Unassigned");

  // Date the case was created (formatted for South Africa locale)
  setById("dateReported", c.created_at
    ? new Date(c.created_at).toLocaleDateString("en-ZA")
    : "Unknown"
  );

  // Date the case was resolved, if applicable
  setById("dateResolved", c.resolved_at
    ? new Date(c.resolved_at).toLocaleDateString("en-ZA")
    : "N/A"
  );

  // Outcome and investigator notes (filled in via record.html)
  setById("outcome", c.outcome || "Pending");
  setById("notes",   c.notes   || "None");

  // ── STATUS BADGE ──────────────────────────────────────────
  // The status element shows whether the case is Open or Resolved.
  // This satisfies the requirement to clearly indicate case status.
  const statusEl = document.getElementById("caseStatusBadge");
  if (statusEl) {
    const status = (c.status || "Open");
    statusEl.textContent = status;

    // Apply the correct colour class so "Resolved" appears green
    // and "Open" appears blue (matching dashboard.css badge classes)
    statusEl.className = "badge " + status.toLowerCase().replace(/\s+/g, "");
  }

  // ── RISK BADGE ────────────────────────────────────────────
  const riskBadge = document.getElementById("riskBadge");
  if (riskBadge) {
    const risk = (c.risk_level || "LOW").toUpperCase();
    riskBadge.textContent = `${risk} RISK`;

    // Apply colour overrides for medium and low (high uses the default red)
    if (risk === "MEDIUM") {
      riskBadge.style.background = "#fef3c7";
      riskBadge.style.color      = "#92400e";
    } else if (risk === "LOW") {
      riskBadge.style.background = "#dcfce7";
      riskBadge.style.color      = "#166534";
    }
  }

  setById("riskLevel", c.risk_level || "Not assessed");

  // ── GENERATION TIMESTAMP ──────────────────────────────────
  // Shows when this report view was opened (not the case date)
  const now = new Date();
  setById("genDate",
    "Generated on: " +
    now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) +
    " at " +
    now.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })
  );
}

// ── DOWNLOAD / PRINT ──────────────────────────────────────────
// Triggers the browser's native print dialog.
// report.css has @media print rules that hide the sidebar/topbar
// so the printed output looks like a clean document.
function downloadPDF() {
  window.print();
}

// ── ERROR DISPLAY ─────────────────────────────────────────────
// Shows a user-friendly error message in the report content area
// instead of leaving the page blank or crashing silently.
function showError(message) {
  const body = document.querySelector(".doc-body") || document.querySelector(".content");
  if (body) {
    body.innerHTML = `
      <div style="padding:30px; color:#dc2626;">
        <strong>⚠ Error:</strong> ${message}
        <br><br>
        <button onclick="window.history.back()">← Go Back</button>
      </div>`;
  }
}

// ── HELPER ────────────────────────────────────────────────────
// Safely sets an element's text content by ID.
// Silently does nothing if the element doesn't exist,
// so the same script works across different report page layouts.
function setById(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── INIT ──────────────────────────────────────────────────────
// Run immediately when the script loads (report.html places the
// <script> tag at the bottom of the body).
loadReport();