// ============================================================
// evaluations.js — Team Performance Evaluation System
// ============================================================
// WHAT THIS FILE DOES:
//   Provides the full investigator evaluation system for Admins
//   and Commanders. Investigators are hard-blocked from this page.
//
// KEY RULES ENFORCED HERE + ON THE SERVER:
//   1. Only Admins and Commanders can create/view evaluations.
//   2. One evaluation per evaluator per investigator.
//      Re-submitting updates the existing record (upsert).
//   3. Investigators MUST NEVER see this page or any evaluation data.
//
// EVALUATION FORM FIELDS:
//   - Investigator selection dropdown (from DB)
//   - Rating score (1–5 stars): overall, communication, case handling,
//     professionalism, completion speed
//   - Written feedback, strengths, weaknesses, recommendations
//   - Evaluation date (auto-set to today)
//   - Evaluator name (auto-filled from logged-in user)
//
// HOW IT FITS IN THE PROJECT:
//   evaluations.html → evaluations.js
//     → GET /api/investigators  → populate investigator dropdown
//                                 (backed by users WHERE role='investigator')
//     → GET /api/evaluations    → load existing evaluations
//     → POST /api/evaluations   → save/update an evaluation
// ============================================================

const BASE_URL = window.location.origin;

// ── GUARD: Redirect if not logged in ─────────────────────────
const token    = localStorage.getItem("token");
const userRole = (localStorage.getItem("userRole") || "").toLowerCase();

if (!token) {
  window.location.href = "login.html";
}

// ── GUARD: Investigators are NEVER allowed on this page ───────
// This is the frontend guard. The backend also returns 403 for
// investigators hitting /api/evaluations — both layers enforce it.
if (userRole === "investigator") {
  alert("Access denied. Investigators cannot access evaluations.");
  window.location.href = "dashboard.html";
}

const authHeaders = {
  "Content-Type":  "application/json",
  "Authorization": `Bearer ${token}`
};

// ── STATE ─────────────────────────────────────────────────────
let investigators  = [];  // Loaded from DB; used to populate dropdown
let existingEvalId = null; // If an eval already exists for the selected investigator, store its id

// ── STAR RATING COMPONENT ─────────────────────────────────────
// Renders interactive star inputs for each rating category.
// The stars write their value to a hidden input field.

function renderStars(containerId, fieldName, defaultValue = 0) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className  = `star ${i <= defaultValue ? "filled" : ""}`;
    star.innerHTML = '<i class="fa-regular fa-star"></i>';
    star.dataset.value = i;

    // On click: update hidden input and re-render filled stars
    star.addEventListener("click", () => {
      document.getElementById(fieldName).value = i;
      container.querySelectorAll(".star").forEach((s, idx) => {
        const filled = idx < i;
        s.classList.toggle("filled", filled);
        s.innerHTML = filled ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
      });
    });
    container.appendChild(star);
  }

  // Hidden input holds the numeric value for form submission
  if (!document.getElementById(fieldName)) {
    const hiddenInput    = document.createElement("input");
    hiddenInput.type     = "hidden";
    hiddenInput.id       = fieldName;
    hiddenInput.name     = fieldName;
    hiddenInput.value    = defaultValue;
    container.appendChild(hiddenInput);
  }
}

// ── LOAD INVESTIGATORS INTO DROPDOWN ─────────────────────────
// Fetches the investigators table and builds the selector.
// When the evaluator picks an investigator, we check if they
// already have an evaluation from this evaluator and pre-fill
// the form if so.

async function loadInvestigatorDropdown() {
  try {
    const res = await fetch(`${BASE_URL}/api/investigators`, { headers: authHeaders });
    if (!res.ok) return;
    investigators = await res.json();

    const select = document.getElementById("investigatorSelect");
    if (!select) return;

    select.innerHTML = `<option value="">-- Select an investigator --</option>`;
    investigators.forEach(inv => {
      const opt       = document.createElement("option");
      opt.value       = inv.id;
      opt.textContent = inv.full_name || inv.email;
      select.appendChild(opt);
    });

    // When the evaluator picks an investigator, check for an existing evaluation
    select.addEventListener("change", () => {
      const invId = select.value;
      if (invId) loadExistingEvaluation(invId);
      else clearForm();
    });

  } catch (err) {
    console.error("Failed to load investigators:", err.message);
  }
}

// ── LOAD EXISTING EVALUATION ─────────────────────────────────
// If this evaluator has already evaluated the selected investigator,
// pre-fill the form with the saved data so they can update it.
// This satisfies: "allow evaluators to edit their previous evaluation"

async function loadExistingEvaluation(investigatorId) {
  try {
    const res = await fetch(`${BASE_URL}/api/evaluations`, { headers: authHeaders });
    if (!res.ok) return;
    const all = await res.json();

    // Find an evaluation for this investigator authored by the current user.
    // The server already filters evaluations to those authored by the
    // logged-in user (for commanders), so this is safe.
    const existing = all.find(e => String(e.investigator_id) === String(investigatorId));

    if (existing) {
      // Pre-fill all form fields with saved data
      existingEvalId = existing.id;
      setFormValue("ratingOverall",       existing.rating_overall);
      setFormValue("ratingCommunication", existing.rating_communication);
      setFormValue("ratingCaseHandling",  existing.rating_case_handling);
      setFormValue("ratingProfessional",  existing.rating_professionalism);
      setFormValue("ratingSpeed",         existing.rating_speed);
      setFormValue("writtenFeedback",     existing.written_feedback);
      setFormValue("strengths",           existing.strengths);
      setFormValue("weaknesses",          existing.weaknesses);
      setFormValue("recommendations",     existing.recommendations);

      // Re-render stars with saved values
      renderStars("starsOverall",       "ratingOverall",       existing.rating_overall || 0);
      renderStars("starsCommunication", "ratingCommunication", existing.rating_communication || 0);
      renderStars("starsCaseHandling",  "ratingCaseHandling",  existing.rating_case_handling || 0);
      renderStars("starsProfessional",  "ratingProfessional",  existing.rating_professionalism || 0);
      renderStars("starsSpeed",         "ratingSpeed",         existing.rating_speed || 0);

      showStatusMessage("Existing evaluation loaded. You can update it below.", "info");
    } else {
      existingEvalId = null;
      clearForm();
      showStatusMessage("No existing evaluation for this investigator. Fill in the form to create one.", "neutral");
    }
  } catch (err) {
    console.error("Failed to load existing evaluation:", err.message);
  }
}

// ── SUBMIT EVALUATION ─────────────────────────────────────────
// POSTs the evaluation to the server.
// The server performs an UPSERT: if a (evaluator_id, investigator_id)
// pair already exists it updates it; otherwise it inserts a new row.
// This prevents duplicate evaluations from the same account.

async function submitEvaluation() {
  const investigatorId = document.getElementById("investigatorSelect")?.value;

  if (!investigatorId) {
    showStatusMessage("Please select an investigator.", "error");
    return;
  }

  // Collect all rating values from hidden inputs
  const payload = {
    investigator_id:        investigatorId,
    rating_overall:         parseInt(getFormValue("ratingOverall"))        || 0,
    rating_communication:   parseInt(getFormValue("ratingCommunication"))  || 0,
    rating_case_handling:   parseInt(getFormValue("ratingCaseHandling"))   || 0,
    rating_professionalism: parseInt(getFormValue("ratingProfessional"))   || 0,
    rating_speed:           parseInt(getFormValue("ratingSpeed"))          || 0,
    written_feedback:       getFormValue("writtenFeedback"),
    strengths:              getFormValue("strengths"),
    weaknesses:             getFormValue("weaknesses"),
    recommendations:        getFormValue("recommendations"),
  };

  // Validate that at least one rating was given
  if (payload.rating_overall === 0) {
    showStatusMessage("Please provide at least an overall rating.", "error");
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving…"; }

  try {
    const res = await fetch(`${BASE_URL}/api/evaluations`, {
      method:  "POST",
      headers: authHeaders,
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Server error ${res.status}`);
    }

    const saved = await res.json();
    showStatusMessage("✔ Evaluation saved successfully.", "success");

    // Reload the saved evaluation to show it's been stored
    loadExistingEvaluation(investigatorId);

  } catch (err) {
    showStatusMessage(`Failed to save: ${err.message}`, "error");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Save Evaluation"; }
  }
}

// ── LOAD ALL EVALUATIONS (list view) ─────────────────────────
// Renders a list of evaluations this user can see.

async function loadEvaluationsList() {
  const listContainer = document.getElementById("evaluationsList");
  if (!listContainer) return;

  try {
    const res = await fetch(`${BASE_URL}/api/evaluations`, { headers: authHeaders });
    if (!res.ok) { listContainer.innerHTML = "<p>Could not load evaluations.</p>"; return; }
    const evals = await res.json();

    if (!evals || evals.length === 0) {
      listContainer.innerHTML = "<p style='color:#6b7280;'>No evaluations submitted yet.</p>";
      return;
    }

    listContainer.innerHTML = evals.map(e => {
      // Look up investigator name from our loaded list
      const inv  = investigators.find(i => String(i.id) === String(e.investigator_id));
      const name = inv ? (inv.full_name || inv.email) : e.investigator_id;
      const stars = ('<i class="fa-solid fa-star"></i>').repeat(e.rating_overall || 0)
            + ('<i class="fa-regular fa-star"></i>').repeat(5 - (e.rating_overall || 0));
      return `
        <div class="eval-card">
          <div class="eval-header">
            <strong>${name}</strong>
            <span class="eval-stars">${stars}</span>
            <span class="eval-date">${e.evaluation_date ? new Date(e.evaluation_date).toLocaleDateString("en-ZA") : "N/A"}</span>
          </div>
          <p class="eval-feedback">${e.written_feedback || "No written feedback"}</p>
          <div class="eval-ratings">
            ${renderRatingBar("Communication",  e.rating_communication)}
            ${renderRatingBar("Case Handling",  e.rating_case_handling)}
            ${renderRatingBar("Professionalism",e.rating_professionalism)}
            ${renderRatingBar("Speed",          e.rating_speed)}
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Failed to load evaluations list:", err.message);
  }
}

function renderRatingBar(label, value) {
  const pct = Math.round(((value || 0) / 5) * 100);
  return `
    <div class="rating-row">
      <span class="rating-label">${label}</span>
      <div class="rating-bar-bg"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
      <span class="rating-num">${value || 0}/5</span>
    </div>
  `;
}

// ── UTILITIES ─────────────────────────────────────────────────

function clearForm() {
  ["writtenFeedback", "strengths", "weaknesses", "recommendations"].forEach(id => setFormValue(id, ""));
  ["ratingOverall", "ratingCommunication", "ratingCaseHandling", "ratingProfessional", "ratingSpeed"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 0;
  });
  ["starsOverall", "starsCommunication", "starsCaseHandling", "starsProfessional", "starsSpeed"].forEach((containerId, i) => {
    const fields = ["ratingOverall","ratingCommunication","ratingCaseHandling","ratingProfessional","ratingSpeed"];
    renderStars(containerId, fields[i], 0);
  });
}

function getFormValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function setFormValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

function showStatusMessage(msg, type) {
  const el = document.getElementById("statusMsg");
  if (!el) return;
  el.textContent  = msg;
  el.className    = `status-msg ${type}`;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 5000);
}

// ── INIT ──────────────────────────────────────────────────────

async function init() {
  // Render star components for each rating category
  renderStars("starsOverall",       "ratingOverall");
  renderStars("starsCommunication", "ratingCommunication");
  renderStars("starsCaseHandling",  "ratingCaseHandling");
  renderStars("starsProfessional",  "ratingProfessional");
  renderStars("starsSpeed",         "ratingSpeed");

  await loadInvestigatorDropdown();
  await loadEvaluationsList();

  // Wire up the submit button
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.addEventListener("click", submitEvaluation);
}

init();