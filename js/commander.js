// ============================================================
// commander.js — Report Generation Page (commander.html)
// ============================================================
// WHAT THIS FILE DOES:
//   1. Fetches all cases from the database on page load.
//   2. Populates a <select> dropdown so the user can choose
//      which case to generate a report for.
//   3. When "Generate Report" is clicked it calls the backend
//      Report API (GET /api/reports/:caseId) which builds a PDF,
//      uploads it to Supabase Storage, and returns a public URL.
//   4. Displays the returned URL as a download link.
//
// HOW IT FITS IN THE PROJECT:
//   commander.html → commander.js
//     → GET /api/cases           → populate dropdown
//     → GET /api/reports/:id     → generate + upload PDF
//     → Supabase Storage         → PDF returned as public URL
//
// REQUIREMENT MET:
//   "Before generating a report, the system must prompt the user
//    to select which case they want to generate the report for."
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

// ── DOM REFERENCES ────────────────────────────────────────────
// These IDs must exist in commander.html
const caseSelect    = document.getElementById("caseSelect");      // <select> for picking a case
const generateBtn   = document.getElementById("generateBtn");     // "Generate Report" button
const reportCard    = document.getElementById("reportCard");      // Card showing generated report info
const reportTitle   = document.getElementById("reportTitle");     // <h3> inside the card
const reportContent = document.getElementById("reportContent");   // <div> for report details
const downloadLink  = document.getElementById("downloadLink");    // <a> for the PDF URL

// ── FETCH CASES AND POPULATE DROPDOWN ────────────────────────
// Loads all cases from the DB and adds them as <option> elements
// in the case selector. The user must pick one before the report
// button becomes active.
async function loadCaseOptions() {
  try {
    const res = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    const cases = await res.json();

    // Clear existing options (in case of a refresh) and add a placeholder
    caseSelect.innerHTML = `<option value="">-- Select a case --</option>`;

    cases.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id; // The case UUID/ID used to call the report API
      // Display: case ID + suspect name + status for easy identification
      opt.textContent = `${c.id} — ${c.suspect_name || "Unknown"} (${c.status || "Open"})`;
      caseSelect.appendChild(opt);
    });

    // If the page was reached via "Generate Report" on another page,
    // pre-select that case in the dropdown
    const preselected = localStorage.getItem("selectedCaseId");
    if (preselected) {
      caseSelect.value = preselected;
      // Clear it so future visits start fresh
      localStorage.removeItem("selectedCaseId");
    }

  } catch (err) {
    if (reportContent) {
      reportContent.innerHTML = `<p style="color:red;">Failed to load cases: ${err.message}</p>`;
    }
  }
}

// ── GENERATE REPORT ───────────────────────────────────────────
// Called when the user clicks "Generate Report".
// Validates that a case is selected, then calls the backend
// report endpoint which produces a PDF and returns its URL.
async function generateReport() {
  const caseId = caseSelect ? caseSelect.value : null;

  // Enforce case selection — the user cannot skip this step
  if (!caseId) {
    alert("Please select a case before generating a report.");
    return;
  }

  // Disable the button while the PDF is being generated
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.textContent = "Generating…";
  }

  try {
    // GET /api/reports/:caseId — the backend fetches the case and
    // any linked property, builds a PDF with PDFKit, uploads it to
    // Supabase Storage, and returns the public download URL.
    const res = await fetch(`${BASE_URL}/api/reports/${caseId}`, {
      headers: authHeaders
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Server error ${res.status}`);
    }

    const data = await res.json();

    // Display the title and a clickable download link in the report card
    if (reportTitle)  reportTitle.textContent = `Report for Case: ${caseId}`;
    if (reportContent) {
      // Also show selected case dropdown value as context
      const selectedText = caseSelect.options[caseSelect.selectedIndex]?.text || caseId;
      reportContent.innerHTML = `
        <p><strong>Case:</strong> ${selectedText}</p>
        <p style="margin-top:12px;">Your PDF report has been generated and is ready to download.</p>
      `;
    }

    // Show the download link with the Supabase Storage public URL
    if (downloadLink && data.url) {
      downloadLink.href    = data.url;
      downloadLink.style.display = "inline-block";
      downloadLink.textContent   = "⬇ Download PDF Report";
    }

    if (reportCard) reportCard.style.display = "block";

  } catch (err) {
    alert(`Report generation failed: ${err.message}`);
  } finally {
    // Re-enable the button regardless of success or failure
    if (generateBtn) {
      generateBtn.disabled    = false;
      generateBtn.textContent = "Generate Report";
    }
  }
}

// ── NAVIGATION HELPER ─────────────────────────────────────────
// "Back to Cases" button calls this to return the user to the
// case list (used in the original commander.js).
function goBack() {
  window.location.href = "cases.html";
}

// ── INIT ──────────────────────────────────────────────────────
// Populate the case dropdown as soon as the page loads.
loadCaseOptions();

// Wire up the Generate button if it exists on this page
if (generateBtn) {
  generateBtn.addEventListener("click", generateReport);
}