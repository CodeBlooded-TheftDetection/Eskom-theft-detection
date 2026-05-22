// ============================================================
// map_fix.js
// Fixes map.html:
//   1. Real address search via OpenStreetMap Nominatim (free, no API key)
//   2. Load cases from DB and auto-place markers for those with coords
//   3. Geocode addresses that have no coords stored yet
//   4. "Place Marker" button works on selected search result
// ============================================================
// SETUP: Add Leaflet to your map.html <head>:
//   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
//   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
// Then add <div id="map" style="height:500px;border-radius:12px;"></div> to your HTML
// and <script src="../js/map_fix.js"></script> at the bottom of body.
// ============================================================

const BASE_URL    = '';
const token       = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// ── INIT MAP (Leaflet + OpenStreetMap) ────────────────────────
// Default centre: Johannesburg, South Africa
let map, pendingLatLng = null, markers = [];

function initMap() {
  if (typeof L === 'undefined') {
    console.error('Leaflet not loaded. Add Leaflet CDN links to your <head>.');
    return;
  }
  map = L.map('map').setView([-26.2041, 28.0473], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // Allow clicking map to place marker manually
  map.on('click', (e) => {
    pendingLatLng = e.latlng;
    showMapStatus(`Location selected: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)} — click "Place Marker" to confirm.`, 'info');
    // Preview marker
    if (window._previewMarker) map.removeLayer(window._previewMarker);
    window._previewMarker = L.circleMarker(e.latlng, { color:'#2563eb', radius:8, fillOpacity:.5 }).addTo(map);
  });
}

// ── ADDRESS SEARCH (Nominatim — free, no key needed) ──────────
let searchTimeout = null;
async function searchAddress() {
  const query = (document.getElementById('addressSearch')?.value || '').trim();
  if (query.length < 3) return;

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const resultsEl = document.getElementById('searchResults');
    if (resultsEl) resultsEl.innerHTML = `<div style="padding:10px;color:#6b7280;font-size:13px;">Searching…</div>`;

    try {
      // Nominatim: append South Africa for better local results
      const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', South Africa')}&format=json&limit=5&addressdetails=1`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();

      if (!data.length) {
        if (resultsEl) resultsEl.innerHTML = `<div style="padding:10px;color:#dc2626;font-size:13px;">No results found. Try a more specific address.</div>`;
        return;
      }

      if (resultsEl) {
        resultsEl.innerHTML = data.map((r, i) =>
          `<div onclick="selectSearchResult(${r.lat}, ${r.lon}, '${r.display_name.replace(/'/g,"\\'")}', ${i})"
            style="padding:10px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;font-size:13px;color:#374151;"
            onmouseover="this.style.background='#f0f7ff'" onmouseout="this.style.background=''">
            <i class=\"fa-solid fa-location-dot\" style=\"color:#2563eb;margin-right:8px;\"></i> ${r.display_name}
          </div>`
        ).join('');
      }
    } catch(e) {
      if (resultsEl) resultsEl.innerHTML = `<div style="padding:10px;color:#dc2626;font-size:13px;">Search error: ${e.message}</div>`;
    }
  }, 400); // debounce
}

function selectSearchResult(lat, lon, label, idx) {
  pendingLatLng = L.latLng(parseFloat(lat), parseFloat(lon));

  // Fly to location
  map.flyTo(pendingLatLng, 15);

  // Nudge the map so the selected location appears centered (not pinned to top)
  setTimeout(() => {
    try { map.panBy([0, -Math.round(map.getSize().y * 0.12)]); } catch(e) {}
  }, 350);

  // Preview marker
  if (window._previewMarker) map.removeLayer(window._previewMarker);
  window._previewMarker = L.circleMarker(pendingLatLng, { color:'#2563eb', radius:8, fillOpacity:.5 })
    .addTo(map)
    .bindPopup(`<strong>Selected:</strong><br>${label}`)
    .openPopup();

  // Update the address input and clear results
  const input = document.getElementById('addressSearch');
  if (input) input.value = label;
  const resultsEl = document.getElementById('searchResults');
  if (resultsEl) resultsEl.innerHTML = '';

  showMapStatus(`Address selected. Click "Place Marker" to confirm.`, 'info');
}

// ── PLACE MARKER ──────────────────────────────────────────────
function placeMarker() {
  if (!pendingLatLng) {
    showMapStatus('Search for an address first, or click on the map.', 'error');
    return;
  }
  const label = document.getElementById('addressSearch')?.value || 'Custom location';

  // Remove preview
  if (window._previewMarker) { map.removeLayer(window._previewMarker); window._previewMarker = null; }

  // Place confirmed marker
  const marker = L.marker(pendingLatLng)
    .addTo(map)
    .bindPopup(`<strong>${label}</strong>`)
    .openPopup();
  markers.push(marker);

  pendingLatLng = null;
  showMapStatus(`✔ Marker placed: ${label}`, 'success');
}

// ── GEOCODE an address string → { lat, lon } ──────────────────
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data= await res.json();
    if (data.length) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch(e) {}
  return null;
}

// ── LOAD CASES FROM DB ────────────────────────────────────────
async function loadCasesFromDB() {
  const btn = document.getElementById('btnLoadCases');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  showMapStatus('Fetching cases from database…', 'info');

  try {
    const res   = await fetch(`${BASE_URL}/api/cases`, { headers: authHeaders });
    const cases = await res.json();

    // Clear existing case markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    let placed = 0, geocoded = 0, skipped = 0;

    for (const c of (Array.isArray(cases) ? cases : [])) {
      const riskColor = { HIGH:'#dc2626', MID:'#f59e0b', LOW:'#16a34a' }[c.risk_level] || '#6b7280';

      if (c.latitude && c.longitude) {
        // Already have coords — place marker immediately
        placeDBMarker(c.latitude, c.longitude, c, riskColor);
        placed++;
      } else if (c.address || c.suspect_address || c.location) {
        // Try to geocode the address
        const addr   = c.address || c.suspect_address || c.location;
        const coords = await geocodeAddress(addr);
        if (coords) {
          placeDBMarker(coords.lat, coords.lon, c, riskColor);
          geocoded++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    showMapStatus(
      `✔ Loaded ${placed} stored + ${geocoded} geocoded markers. ${skipped} cases had no location data.`,
      'success'
    );

    // Fit map to show all markers
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  } catch (e) {
    showMapStatus(`Failed to load cases: ${e.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Load Cases from Database'; }
  }
}

function placeDBMarker(lat, lon, caseData, color) {
  const inv  = caseData.investigators;
  const inv_name = inv?.full_name || inv?.email || 'Unassigned';
  const marker = L.circleMarker([lat, lon], {
    radius: 10, color, fillColor: color, fillOpacity: 0.7, weight: 2
  }).addTo(map);
  marker.bindPopup(`
    <div style="min-width:200px;font-family:Inter,sans-serif;">
      <strong style="font-size:14px;">${caseData.case_number || 'N/A'}</strong><br>
      <span style="color:#6b7280;font-size:12px;">${caseData.suspect_name || 'Unknown'}</span><br><br>
      <strong>Risk:</strong> ${caseData.risk_level || 'N/A'}<br>
      <strong>Status:</strong> ${caseData.outcome || 'N/A'}<br>
      <strong>Investigator:</strong> ${inv_name}<br>
      ${caseData.description ? `<br><em style="font-size:12px;">${caseData.description.slice(0,100)}…</em>` : ''}
    </div>
  `);
  markers.push(marker);
}

// ── STATUS MESSAGE ────────────────────────────────────────────
function showMapStatus(msg, type) {
  const el = document.getElementById('mapStatus');
  if (!el) return;
  el.textContent     = msg;
  el.style.display   = 'block';
  el.style.padding   = '11px 16px';
  el.style.borderRadius = '9px';
  el.style.fontWeight   = '600';
  el.style.fontSize     = '13px';
  el.style.marginBottom = '12px';
  const colors = { success:['#dcfce7','#15803d','#bbf7d0'], error:['#fee2e2','#b91c1c','#fecaca'], info:['#dbeafe','#1d4ed8','#bfdbfe'] };
  const [bg,col,border] = colors[type] || colors.info;
  el.style.background= bg; el.style.color= col; el.style.border=`1px solid ${border}`;
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  const btnPlace = document.getElementById('btnPlaceMarker');
  if (btnPlace) btnPlace.addEventListener('click', placeMarker);

  const btnLoad = document.getElementById('btnLoadCases');
  if (btnLoad) btnLoad.addEventListener('click', loadCasesFromDB);

  const searchInput = document.getElementById('addressSearch');
  if (searchInput) searchInput.addEventListener('input', searchAddress);
});