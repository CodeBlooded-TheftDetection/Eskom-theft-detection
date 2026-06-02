// ============================================================
// map.js  (DB-backed markers)
// Changes from previous version:
//   1. Manual markers are saved to / deleted from the DB
//      via /api/map-markers — localStorage is no longer used.
//   2. Markers placed from admin.html (cases table) are NEVER
//      touched; map delete only calls DELETE /api/map-markers/:id.
//   3. "Load Cases from DB" skips RESOLVED cases; they reappear
//      only if the case is reopened in record.html.
//   4. Marker IDs are now UUIDs returned by the DB (not local ints).
// ============================================================

const BASE_URL = ''; // Relative URLs: /api/... resolves to current domain
const token       = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

let map, pendingLatLng = null;
let markers      = [];   // ALL Leaflet layers currently on map
let manualPlaced = [];   // user-placed markers  { id: UUID, marker, label }

// ── INIT MAP ──────────────────────────────────────────────────
function initMap() {
  if (typeof L === 'undefined') {
    console.error('Leaflet not loaded.');
    return;
  }

  map = L.map('map').setView([-26.2041, 28.0473], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // Click on map → set pending location with a preview dot
  map.on('click', (e) => {
    pendingLatLng = e.latlng;
    showMapStatus(
      `Location selected: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)} — click "Place Marker" to confirm.`,
      'info'
    );
    if (window._previewMarker) map.removeLayer(window._previewMarker);
    window._previewMarker = L.circleMarker(e.latlng, {
      color: '#2563eb', radius: 8, fillOpacity: 0.5
    }).addTo(map);
  });

  // Toolbar buttons
  document.getElementById('btnPlaceMarker')?.addEventListener('click', placeMarker);
  document.getElementById('btnLoadCases')?.addEventListener('click', loadCasesFromDB);
  document.getElementById('btnManageMarkers')?.addEventListener('click', openMarkerManager);

  // Search
  document.getElementById('addressSearch')?.addEventListener('input', searchAddress);

  // Close autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#addressSearch') && !e.target.closest('#searchResults')) {
      const r = document.getElementById('searchResults');
      if (r) { r.innerHTML = ''; r.style.display = 'none'; }
    }
  });

  loadCaseStats();
  loadMarkersFromDB(); // restore persisted map markers from the database
}

// ── DB-BACKED MARKER PERSISTENCE ──────────────────────────────

/**
 * On page load — fetch all map_markers rows and re-draw them.
 * These are ONLY markers placed from this map page.
 * Admin-created cases in the cases table are untouched.
 */
async function loadMarkersFromDB() {
  try {
    const res  = await fetch(`${BASE_URL}/api/map-markers`, { headers: authHeaders });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return;

    data.forEach(({ id, label, latitude, longitude }) => {
      _addManualMarker(L.latLng(latitude, longitude), label, id);
    });

    showMapStatus(`✔ ${data.length} saved marker(s) restored.`, 'success');
  } catch (e) {
    console.warn('Could not restore map markers from DB:', e.message);
  }
}

/**
 * POST a new marker to the DB.
 * Returns the UUID assigned by Supabase.
 */
async function saveMarkerToDB(label, lat, lng) {
  const res = await fetch(`${BASE_URL}/api/map-markers`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({ label, latitude: lat, longitude: lng }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  const data = await res.json();
  return data.id; // UUID string
}

/**
 * DELETE a single marker from the DB by its UUID.
 * This ONLY deletes from map_markers — the cases table is never touched.
 */
async function deleteMarkerFromDB(id) {
  try {
    const res = await fetch(`${BASE_URL}/api/map-markers/${id}`, {
      method: 'DELETE', headers: authHeaders,
    });
    if (!res.ok) console.warn(`Failed to delete map marker ${id}:`, res.status);
  } catch (e) {
    console.warn(`Network error deleting marker ${id}:`, e.message);
  }
}

/**
 * Internal helper — creates a Leaflet marker and registers it in manualPlaced.
 * @param {L.LatLng} latlng
 * @param {string}   label
 * @param {string}   id     — UUID from the DB
 */
function _addManualMarker(latlng, label, id) {
  const leafletMarker = L.marker(latlng)
    .addTo(map)
    .bindPopup(`
      <div style="font-family:Inter,sans-serif;min-width:160px;">
        <strong style="font-size:13px;">${label}</strong><br>
        <small style="color:#6b7280;">Map pin</small>
      </div>
    `);

  manualPlaced.push({ id, label, marker: leafletMarker });
  markers.push(leafletMarker);
  updateManageButton();
}

// ── ADDRESS SEARCH ─────────────────────────────────────────────
let searchTimeout = null;

async function searchAddress() {
  const query = (document.getElementById('addressSearch')?.value || '').trim();
  const resultsEl = document.getElementById('searchResults');
  if (!resultsEl) return;

  if (query.length < 3) { resultsEl.innerHTML = ''; resultsEl.style.display = 'none'; return; }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `<div style="padding:10px;color:#6b7280;font-size:13px;">Searching…</div>`;

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: 8,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        'accept-language': 'en',
        countrycodes: 'za',
        viewbox: '16.4,-34.9,32.9,-22.1',  // tight bounding box around South Africa
        bounded: 1,
      });

      const res  = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'EskomTheftDetectionApp/1.0' }
      });
      const data = await res.json();

      if (!data.length) {
        resultsEl.innerHTML = `<div style="padding:10px;color:#dc2626;font-size:13px;">No results found. Try a broader query.</div>`;
        return;
      }

      resultsEl.innerHTML = data.map((r) => {
        const name    = r.namedetails?.name || r.display_name.split(',')[0];
        const context = r.display_name.split(',').slice(1, 3).join(',').trim();
        const icon    = getPoiIcon(r);
        return `<div class="suggestion-item"
                     data-lat="${r.lat}"
                     data-lon="${r.lon}"
                     data-display="${encodeURIComponent(r.display_name)}">
                  <span class="sug-icon">${icon}</span>
                  <span class="sug-text">
                    <strong>${name}</strong>
                    ${context ? `<span class="sug-context">${context}</span>` : ''}
                  </span>
                </div>`;
      }).join('');

      resultsEl.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          const lat   = parseFloat(el.dataset.lat);
          const lon   = parseFloat(el.dataset.lon);
          const label = decodeURIComponent(el.dataset.display);
          selectSearchResult(lat, lon, label);
        });
      });

    } catch (e) {
      resultsEl.innerHTML = `<div style="padding:10px;color:#dc2626;font-size:13px;">Search error — check connection.</div>`;
    }
  }, 350);
}

/** Pick a simple emoji icon based on Nominatim category/type */
function getPoiIcon(r) {
  const cat     = r.extratags?.amenity || r.extratags?.leisure || r.type || r.class || '';
  const iconMap = {
    golf_course: '⛳', sports_centre: '🏟', stadium: '🏟', club: '🏌️',
    school: '🏫', hospital: '🏥', restaurant: '🍽', cafe: '☕',
    hotel: '🏨', fuel: '⛽', park: '🌳', place_of_worship: '⛪',
    residential: '🏘', road: '🛣', administrative: '🏛',
  };
  for (const [k, v] of Object.entries(iconMap)) {
    if (cat.toLowerCase().includes(k)) return v;
  }
  return '<i class="fa-solid fa-location-dot" style="color:#2563eb"></i>';
}

function selectSearchResult(lat, lon, label) {
  pendingLatLng = L.latLng(lat, lon);
  map.flyTo(pendingLatLng, 15);
  setTimeout(() => { try { map.panBy([0, -Math.round(map.getSize().y * 0.12)]); } catch (e) {} }, 350);

  if (window._previewMarker) map.removeLayer(window._previewMarker);
  window._previewMarker = L.circleMarker(pendingLatLng, {
    color: '#2563eb', radius: 8, fillOpacity: 0.5
  }).addTo(map).bindPopup(`<strong>Selected:</strong><br>${label}`).openPopup();

  const input = document.getElementById('addressSearch');
  if (input) input.value = label.split(',')[0].trim();

  const resultsEl = document.getElementById('searchResults');
  if (resultsEl) { resultsEl.innerHTML = ''; resultsEl.style.display = 'none'; }

  showMapStatus(`Address selected. Click "Place Marker" to confirm.`, 'info');
}

// ── PLACE MARKER ──────────────────────────────────────────────
async function placeMarker() {
  if (!pendingLatLng) {
    showMapStatus('Search for an address first, or click on the map.', 'error');
    return;
  }

  const rawLabel = document.getElementById('addressSearch')?.value || 'Custom location';
  const label    = rawLabel.trim() || 'Custom location';

  if (window._previewMarker) { map.removeLayer(window._previewMarker); window._previewMarker = null; }

  // Disable button while saving to DB
  const btn = document.getElementById('btnPlaceMarker');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }

  try {
    // Save to DB first — get the UUID back
    const dbId = await saveMarkerToDB(label, pendingLatLng.lat, pendingLatLng.lng);
    _addManualMarker(pendingLatLng, label, dbId);
    showMapStatus(`✔ Marker saved: ${label}`, 'success');
  } catch (e) {
    showMapStatus(`Failed to save marker: ${e.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-map-pin"></i> Place Marker';
    }
    pendingLatLng = null;
  }
}

// ── MARKER MANAGER (selective delete) ─────────────────────────

function updateManageButton() {
  const btn = document.getElementById('btnManageMarkers');
  if (!btn) return;
  const n = manualPlaced.length;
  btn.innerHTML = `<i class="fa-solid fa-layer-group"></i> Manage Markers${n ? ` <span class="badge">${n}</span>` : ''}`;
  btn.disabled  = n === 0;
}

function openMarkerManager() {
  if (!manualPlaced.length) { showMapStatus('No manual markers to manage.', 'info'); return; }

  let panel = document.getElementById('markerManagerPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'markerManagerPanel';
    document.body.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="mm-overlay" id="mmOverlay"></div>
    <div class="mm-drawer">
      <div class="mm-header">
        <h3><i class="fa-solid fa-layer-group"></i> Manual Markers</h3>
        <button class="mm-close" id="mmClose" title="Close">✕</button>
      </div>
      <p class="mm-hint">Select markers to remove, then click <strong>Delete Selected</strong>.<br>
        Only map-placed pins are listed here — case markers from admin are separate.</p>
      <div class="mm-actions-top">
        <button class="mm-btn mm-btn-ghost" id="mmSelectAll">Select All</button>
        <button class="mm-btn mm-btn-ghost" id="mmSelectNone">Select None</button>
      </div>
      <ul class="mm-list" id="mmList">
        ${manualPlaced.map(({ id, label }) => `
          <li class="mm-item" data-id="${id}">
            <label>
              <input type="checkbox" class="mm-check" data-id="${id}" />
              <span class="mm-marker-icon"><i class="fa-solid fa-map-pin"></i></span>
              <span class="mm-label" title="${label}">${label}</span>
              <span class="mm-id">…${id.slice(-6)}</span>
            </label>
          </li>
        `).join('')}
      </ul>
      <div class="mm-footer">
        <span class="mm-sel-count" id="mmSelCount">0 selected</span>
        <button class="mm-btn mm-btn-ghost" id="mmCancel">Cancel</button>
        <button class="mm-btn mm-btn-danger" id="mmDeleteSel" disabled>
          <i class="fa-solid fa-trash"></i> Delete Selected
        </button>
      </div>
    </div>
  `;

  document.body.classList.add('mm-open');

  const close = () => {
    document.body.classList.remove('mm-open');
    panel.innerHTML = '';
  };

  document.getElementById('mmClose').addEventListener('click', close);
  document.getElementById('mmCancel').addEventListener('click', close);
  document.getElementById('mmOverlay').addEventListener('click', close);

  const checks     = () => Array.from(panel.querySelectorAll('.mm-check'));
  const countSel   = () => checks().filter(c => c.checked).length;

  const refreshCount = () => {
    const n = countSel();
    document.getElementById('mmSelCount').textContent = `${n} selected`;
    document.getElementById('mmDeleteSel').disabled   = n === 0;
    checks().forEach(c => {
      c.closest('.mm-item').classList.toggle('mm-item--selected', c.checked);
    });
  };

  panel.addEventListener('change', refreshCount);

  document.getElementById('mmSelectAll').addEventListener('click', () => {
    checks().forEach(c => c.checked = true); refreshCount();
  });
  document.getElementById('mmSelectNone').addEventListener('click', () => {
    checks().forEach(c => c.checked = false); refreshCount();
  });

  document.getElementById('mmDeleteSel').addEventListener('click', async () => {
    const toRemove = new Set(
      checks().filter(c => c.checked).map(c => c.dataset.id) // UUID strings
    );

    // Show deleting state
    const deleteBtn = document.getElementById('mmDeleteSel');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting…';
    }

    // Delete from DB in parallel — ONLY deletes from map_markers table,
    // cases table (admin.html) is completely untouched.
    await Promise.all([...toRemove].map(id => deleteMarkerFromDB(id)));

    // Remove Leaflet layers
    manualPlaced
      .filter(({ id }) => toRemove.has(id))
      .forEach(({ marker }) => {
        map.removeLayer(marker);
        markers = markers.filter(m => m !== marker);
      });

    // Remove from tracking array
    manualPlaced = manualPlaced.filter(({ id }) => !toRemove.has(id));

    updateManageButton();
    showMapStatus(`✔ ${toRemove.size} marker(s) deleted.`, 'success');

    if (manualPlaced.length === 0) { close(); return; }
    openMarkerManager(); // refresh panel with remaining markers
  });
}

// ── GEOCODE ───────────────────────────────────────────────────
async function geocodeAddress(address) {
  try {
    const params = new URLSearchParams({ q: address, format: 'json', limit: 1 });
    const res    = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'EskomTheftDetectionApp/1.0' }
    });
    const data = await res.json();
    if (data.length) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (e) {}
  return null;
}

// ── LOAD CASES FROM DB ─────────────────────────────────────────
// RESOLVED cases are hidden — they reappear only once reopened in record.html.
// This NEVER reads from map_markers; those are loaded separately on init.
async function loadCasesFromDB() {
  const btn = document.getElementById('btnLoadCases');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading…'; }
  showMapStatus('Fetching cases from database…', 'info');

  try {
    const res   = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
    const cases = await res.json();

    // Clear previous DB case markers (leave manual map pins alone)
    markers.filter(m => m._isDBMarker).forEach(m => map.removeLayer(m));
    markers = markers.filter(m => !m._isDBMarker);

    const allCases = Array.isArray(cases) ? cases : [];

    // ── Filter out RESOLVED cases ──────────────────────────────
    // A case reappears here only if it is reopened (outcome set back to OPEN/PENDING)
    const activeCases    = allCases.filter(c => (c.outcome || '').toUpperCase() !== 'RESOLVED');
    const resolvedCount  = allCases.length - activeCases.length;

    let placed = 0, geocoded = 0, skipped = 0;

    for (const c of activeCases) {
      const riskColor = { HIGH: '#dc2626', MID: '#f59e0b', LOW: '#16a34a' }[
        (c.risk_level || '').toUpperCase()
      ] || '#6b7280';

      if (c.latitude && c.longitude) {
        placeDBMarker(c.latitude, c.longitude, c, riskColor);
        placed++;
      } else if (c.address || c.suspect_address || c.location) {
        const addr   = c.address || c.suspect_address || c.location;
        const coords = await geocodeAddress(addr);
        if (coords) { placeDBMarker(coords.lat, coords.lon, c, riskColor); geocoded++; }
        else skipped++;
      } else {
        skipped++;
      }
    }

    const resolvedNote = resolvedCount > 0 ? ` · ${resolvedCount} resolved case(s) hidden.` : '';
    showMapStatus(
      `✔ ${placed} stored + ${geocoded} geocoded markers loaded. ${skipped} had no location data.${resolvedNote}`,
      'success'
    );

    const dbMarkers = markers.filter(m => m._isDBMarker);
    if (dbMarkers.length) {
      map.fitBounds(L.featureGroup(dbMarkers).getBounds().pad(0.2));
    }
  } catch (e) {
    showMapStatus(`Failed to load cases: ${e.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Load Cases from DB';
    }
  }
}

/**
 * Creates a teardrop pin divIcon — same shape as the standard L.marker but
 * filled with the supplied colour.  Used by "Load Cases from DB" markers so
 * they share the same visual design language while still being colour-coded
 * by risk level (red / amber / green / grey).
 */
function createPinIcon(color) {
  return L.divIcon({
    className: '',   // suppress Leaflet's default white-box wrapper styles
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="25" height="41">
      <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 8.5 12.5 28.5 12.5 28.5S25 21 25 12.5C25 5.596 19.404 0 12.5 0z"
            fill="${color}" stroke="rgba(0,0,0,0.35)" stroke-width="1.2"/>
      <circle cx="12.5" cy="12" r="4.5" fill="rgba(255,255,255,0.85)"/>
    </svg>`,
    iconSize:    [25, 41],
    iconAnchor:  [12, 41],   // tip of the pin sits on the coordinate
    popupAnchor: [1, -34],
  });
}

function placeDBMarker(lat, lon, caseData, color) {
  const inv      = caseData.investigators;
  const inv_name = inv?.full_name || inv?.email || 'Unassigned';
  const address  = caseData.address || caseData.suspect_address || caseData.location || null;
  const marker   = L.marker([lat, lon], { icon: createPinIcon(color) }).addTo(map);

  marker._isDBMarker = true; // flag so we can clear DB markers separately

  marker.bindPopup(`
    <div style="min-width:200px;font-family:Inter,sans-serif;">
      <strong style="font-size:14px;">${caseData.case_number || 'N/A'}</strong><br>
      <span style="color:#6b7280;font-size:12px;">${caseData.suspect_name || 'Unknown'}</span><br><br>
      <strong>Risk:</strong> ${caseData.risk_level || 'N/A'}<br>
      <strong>Status:</strong> ${caseData.outcome || 'N/A'}<br>
      <strong>Investigator:</strong> ${inv_name}<br>
      ${address ? `<strong>Address:</strong> ${address}<br>` : ''}
      ${caseData.description ? `<br><em style="font-size:12px;">${caseData.description.slice(0, 100)}…</em>` : ''}
    </div>
  `);
  markers.push(marker);
}

// ── STATS BAR ─────────────────────────────────────────────────
async function loadCaseStats() {
  try {
    const res   = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
    const cases = await res.json();
    const arr   = Array.isArray(cases) ? cases : [];
    document.getElementById('statTotal').textContent = arr.length;
    document.getElementById('statHigh').textContent  = arr.filter(c => (c.risk_level || '').toUpperCase() === 'HIGH').length;
    document.getElementById('statMid').textContent   = arr.filter(c => (c.risk_level || '').toUpperCase() === 'MID').length;
    document.getElementById('statLow').textContent   = arr.filter(c => (c.risk_level || '').toUpperCase() === 'LOW').length;
  } catch (e) {}
}

// ── STATUS MESSAGE ────────────────────────────────────────────
function showMapStatus(msg, type) {
  const el = document.getElementById('mapStatus');
  if (!el) return;
  el.textContent  = msg;
  el.style.display = 'block';
  const colors = {
    success: ['#dcfce7', '#15803d', '#bbf7d0'],
    error:   ['#fee2e2', '#b91c1c', '#fecaca'],
    info:    ['#dbeafe', '#1d4ed8', '#bfdbfe'],
  };
  const [bg, col, border] = colors[type] || colors.info;
  Object.assign(el.style, {
    background: bg, color: col, border: `1px solid ${border}`,
    padding: '11px 16px', borderRadius: '9px',
    fontWeight: '600', fontSize: '13px', marginLeft: '0',
  });
  if (type !== 'error') setTimeout(() => { el.style.display = 'none'; }, 6000);
}

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initMap);