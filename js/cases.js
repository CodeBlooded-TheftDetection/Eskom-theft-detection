// ============================================================
// cases_fix.js
// Fixes cases.html:
//   1. "Mark Resolved" — now sends resolved_at timestamp
//   2. Case dropdown populated from API (no FK join)
//   3. Investigator shown in detail panel from manual lookup
// ============================================================

const BASE_URL    = 'http://localhost:3000';
const token       = localStorage.getItem('token');
const userRole    = (localStorage.getItem('userRole') || '').toLowerCase();
if (!token) window.location.href = 'login.html';

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

let allCases         = [];
let selectedCase     = null;

// ── LOAD CASES INTO DROPDOWN ──────────────────────────────────
async function loadCaseDropdown() {
  const sel = document.getElementById('caseSelect');
  if (!sel) return;
  sel.innerHTML = `<option value="">Loading cases…</option>`;
  try {
    const res  = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
    allCases   = await res.json();
    if (!Array.isArray(allCases) || !allCases.length) {
      sel.innerHTML = `<option value="">No cases found</option>`;
      return;
    }
    sel.innerHTML = `<option value="">— Select a case —</option>` +
      allCases.map(c =>
        `<option value="${c.id}">${c.case_number || c.id?.slice(0,8)} — ${c.suspect_name || 'Unknown'} [${c.risk_level||'N/A'}]</option>`
      ).join('');
    sel.addEventListener('change', () => {
      const c = allCases.find(x => x.id === sel.value);
      if (c) renderCaseDetail(c);
    });

    // If URL has ?id= param, auto-select that case
    const urlId = new URLSearchParams(window.location.search).get('id');
    if (urlId) {
      sel.value = urlId;
      sel.dispatchEvent(new Event('change'));
    }
  } catch (e) {
    sel.innerHTML = `<option value="">Error: ${e.message}</option>`;
  }
}

// ── RENDER CASE DETAIL PANEL ──────────────────────────────────
function renderCaseDetail(c) {
  selectedCase = c;
  const inv    = c.investigators;
  const invName= inv?.full_name || inv?.email || 'Unassigned';
  const riskColor  = { HIGH:'#dc2626', MID:'#f59e0b', LOW:'#16a34a' }[c.risk_level] || '#6b7280';
  const outcomeColor={ OPEN:'#f59e0b', PENDING:'#2563eb', RESOLVED:'#16a34a' }[c.outcome] || '#6b7280';

  setEl('detailCaseNumber',  c.case_number || 'N/A');
  setEl('detailSuspect',     c.suspect_name || 'Unknown');
  setEl('detailDescription', c.description || 'No description.');
  setEl('detailNotes',       c.notes || 'No notes recorded.');
  setEl('detailInvestigator',invName);
  setEl('detailCreated',     c.created_at ? new Date(c.created_at).toLocaleString('en-ZA') : 'N/A');
  setEl('detailResolved',    c.resolved_at ? new Date(c.resolved_at).toLocaleString('en-ZA') : '—');

  // Risk badge
  const riskEl = document.getElementById('detailRisk');
  if (riskEl) {
    riskEl.textContent   = c.risk_level || 'N/A';
    riskEl.style.background = `${riskColor}22`;
    riskEl.style.color      = riskColor;
  }
  // Outcome badge
  const outcomeEl = document.getElementById('detailOutcome');
  if (outcomeEl) {
    outcomeEl.textContent   = c.outcome || 'N/A';
    outcomeEl.style.background = `${outcomeColor}22`;
    outcomeEl.style.color      = outcomeColor;
  }

  // Show/hide action buttons based on role and current outcome
  const btnResolve = document.getElementById('btnMarkResolved');
  const btnDelete  = document.getElementById('btnDeleteCase');
  const btnNotes   = document.getElementById('btnUpdateNotes');

  if (btnResolve) {
    const canResolve = ['admin','commander','investigator'].includes(userRole);
    btnResolve.style.display = (canResolve && c.outcome !== 'RESOLVED') ? 'inline-flex' : 'none';
  }
  if (btnDelete) {
    btnDelete.style.display  = userRole === 'admin' ? 'inline-flex' : 'none';
  }
  if (btnNotes) {
    // All roles can add notes
    const notesInput = document.getElementById('notesInput');
    if (notesInput) notesInput.value = c.notes || '';
  }

  // Show the detail section
  const detailSection = document.getElementById('caseDetailSection');
  if (detailSection) detailSection.style.display = 'block';
}

// ── MARK RESOLVED ─────────────────────────────────────────────
// FIX: sends resolved_at with current ISO timestamp.
// The PUT /api/cases/:id endpoint now accepts resolved_at without a join.
async function markResolved() {
  if (!selectedCase) return;
  if (!confirm('Mark this case as resolved?')) return;

  try {
    const now = new Date().toISOString();
    const res = await fetch(`${BASE_URL}/api/cases/${selectedCase.id}`, {
      method:  'PUT',
      headers: authHeaders,
      body:    JSON.stringify({
        outcome:     'RESOLVED',
        resolved_at: now,       // ← this was missing before; caused the schema cache error
      })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }

    const updated = await res.json();
    // Update our local cache
    const idx = allCases.findIndex(c => c.id === updated.id);
    if (idx > -1) {
      allCases[idx] = { ...allCases[idx], ...updated };
      renderCaseDetail(allCases[idx]);
    }
    showCaseStatus('✔ Case marked as resolved.', 'success');
  } catch (e) {
    showCaseStatus(`Failed: ${e.message}`, 'error');
  }
}

// ── UPDATE NOTES ──────────────────────────────────────────────
async function updateNotes() {
  if (!selectedCase) return;
  const notes = document.getElementById('notesInput')?.value || '';
  try {
    const res = await fetch(`${BASE_URL}/api/cases/${selectedCase.id}`, {
      method:  'PUT',
      headers: authHeaders,
      body:    JSON.stringify({ notes })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    showCaseStatus('✔ Notes saved.', 'success');
    // Update local cache
    const idx = allCases.findIndex(c => c.id === selectedCase.id);
    if (idx > -1) allCases[idx].notes = notes;
  } catch (e) {
    showCaseStatus(`Failed: ${e.message}`, 'error');
  }
}

// ── DELETE CASE ───────────────────────────────────────────────
async function deleteCase() {
  if (!selectedCase) return;
  if (!confirm(`Permanently delete case ${selectedCase.case_number || selectedCase.id}?\nThis cannot be undone.`)) return;
  try {
    const res = await fetch(`${BASE_URL}/api/cases/${selectedCase.id}`, {
      method: 'DELETE', headers: authHeaders
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    showCaseStatus('✔ Case deleted.', 'success');
    selectedCase = null;
    const section = document.getElementById('caseDetailSection');
    if (section) section.style.display = 'none';
    await loadCaseDropdown();
  } catch (e) {
    showCaseStatus(`Failed: ${e.message}`, 'error');
  }
}

// ── STATUS MESSAGE ────────────────────────────────────────────
function showCaseStatus(msg, type) {
  const el = document.getElementById('caseStatus');
  if (!el) return;
  el.textContent     = msg;
  el.style.display   = 'block';
  el.style.padding   = '12px 16px';
  el.style.borderRadius = '9px';
  el.style.fontWeight   = '600';
  el.style.fontSize     = '13px';
  el.style.marginTop    = '12px';
  el.style.background   = type === 'success' ? '#dcfce7' : '#fee2e2';
  el.style.color        = type === 'success' ? '#15803d' : '#b91c1c';
  el.style.border       = `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`;
  if (type === 'success') setTimeout(() => el.style.display='none', 4000);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCaseDropdown();

  const btnResolve = document.getElementById('btnMarkResolved');
  const btnDelete  = document.getElementById('btnDeleteCase');
  const btnNotes   = document.getElementById('btnUpdateNotes');
  if (btnResolve) btnResolve.addEventListener('click', markResolved);
  if (btnDelete)  btnDelete.addEventListener('click', deleteCase);
  if (btnNotes)   btnNotes.addEventListener('click', updateNotes);
});