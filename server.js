require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const multer    = require('multer');
const csv       = require('csv-parser');
const PDFKit    = require('pdfkit');
const stream    = require('stream');
const { createClient } = require('@supabase/supabase-js');
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcrypt');
const https     = require('https');

// ── SERVER-SIDE GEOCODER (Nominatim) ─────────────────────────
// Runs on the server — no browser CORS restrictions.
// Restricted to South Africa via countrycodes=za.
function geocodeAddress(address) {
    return new Promise((resolve) => {
        const query = encodeURIComponent(address);
        const url   = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=za&addressdetails=1`;
        const options = { headers: { 'User-Agent': 'EskomTheftDetectionApp/1.0' } };
        https.get(url, options, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(raw);
                    if (data.length) {
                        resolve({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
                    } else {
                        resolve(null);
                    }
                } catch { resolve(null); }
            });
        }).on('error', () => resolve(null));
    });
}

// ── ANOMALY DETECTION ────────────────────────────────────────
function calculateAverage(data) {
    if (!data || data.length === 0) return 0;
    return data.reduce((t, v) => t + v, 0) / data.length;
}
function calculateStdDev(data, mean) {
    if (data.length < 2) return 0;
    const variance = data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
}
function detectAnomalies(data, threshold = 2) {
    if (!data || data.length < 2) return [];
    const mean   = calculateAverage(data);
    const stdDev = calculateStdDev(data, mean);
    if (stdDev === 0) return [];
    return data.filter(v => Math.abs((v - mean) / stdDev) > threshold);
}

// ── APP & MIDDLEWARE ──────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ── SUPABASE CLIENT ───────────────────────────────────────────
// Using service_role key — bypasses RLS so our own RBAC controls access
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const upload = multer({ storage: multer.memoryStorage() });

// ── VALIDATION ────────────────────────────────────────────────
const VALID_RISK_LEVELS = ['HIGH', 'MID', 'LOW'];
const VALID_OUTCOMES    = ['OPEN', 'PENDING', 'RESOLVED'];

function normaliseRiskLevel(value) {
    if (!value) return { ok: false, error: 'risk_level is required' };
    const upper = value.toString().toUpperCase().trim();
    const canonical = upper === 'RISK' ? 'HIGH' : upper;
    if (!VALID_RISK_LEVELS.includes(canonical))
        return { ok: false, error: `Invalid risk_level "${value}". Must be: ${VALID_RISK_LEVELS.join(', ')}` };
    return { ok: true, value: canonical };
}
function isHighRiskValue(value) {
    const normalized = (value || '').toString().toUpperCase().trim();
    return normalized === 'HIGH' || normalized === 'RISK' || normalized === 'HIGH RISK' || normalized === 'HIGH-RISK';
}
function normaliseOutcome(value) {
    if (!value) return { ok: false, error: 'outcome is required' };
    const upper = value.toUpperCase().trim();
    if (!VALID_OUTCOMES.includes(upper))
        return { ok: false, error: `Invalid outcome "${value}". Must be: ${VALID_OUTCOMES.join(', ')}` };
    return { ok: true, value: upper };
}

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = { ...user, role: user.role.toLowerCase() };
        next();
    });
}

// ── RBAC MIDDLEWARE ───────────────────────────────────────────
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role))
            return res.status(403).json({ error: `Requires one of: ${allowedRoles.join(', ')}` });
        next();
    };
}

// ── CASE NUMBER GENERATOR ─────────────────────────────────────
// Generates case numbers in format "Case 1", "Case 2", etc.
// To prevent duplicates and handle concurrency, we:
// 1. Query all existing case numbers
// 2. Extract numeric parts
// 3. Find the maximum number and add 1
// 4. Return the formatted case number
// The database UNIQUE constraint ensures no duplicates
async function generateCaseNumber() {
    try {
        const { data: cases, error } = await supabase
            .from('cases')
            .select('case_number')
            .order('case_number', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('Error fetching latest case number:', error.message);
            return null;
        }

        let nextNumber = 1;
        if (cases && cases.length > 0 && cases[0].case_number) {
            const lastCase = cases[0].case_number;
            // Extract number from "Case N" format
            const match = lastCase.match(/Case\s+(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        return `Case ${nextNumber}`;
    } catch (err) {
        console.error('Error in generateCaseNumber:', err.message);
        return null;
    }
}

// ── GET LATEST CASE NUMBER (for frontend preview) ────────────
async function getLatestCaseNumber() {
    try {
        const { data: cases, error } = await supabase
            .from('cases')
            .select('case_number')
            .order('case_number', { ascending: false })
            .limit(1);
        
        if (error || !cases || cases.length === 0) {
            return 1;
        }

        const lastCase = cases[0].case_number;
        const match = lastCase.match(/Case\s+(\d+)/);
        return match ? parseInt(match[1]) + 1 : 1;
    } catch (err) {
        console.error('Error in getLatestCaseNumber:', err.message);
        return 1;
    }
}

// ── MANUAL INVESTIGATOR ENRICHMENT ───────────────────────────
// Fetches users with role='investigator' and attaches them to cases.
// All investigator data now comes from the users table — the separate
// investigators table is no longer used anywhere in this system.
async function enrichCasesWithInvestigators(cases) {
    if (!cases || cases.length === 0) return cases;
    const { data: investigators, error } = await supabase
        .from('users')
        .select('id, full_name, email, is_active')
        .eq('role', 'investigator');
    if (error) {
        console.error('Investigator enrichment failed:', error.message);
        return cases; // return cases without enrichment rather than failing
    }
    const invMap = {};
    (investigators || []).forEach(inv => { invMap[inv.id] = inv; });
    return cases.map(c => ({
        ...c,
        investigators: c.assigned_investigator_id ? (invMap[c.assigned_investigator_id] || null) : null
    }));
}

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('Eskom Theft Detection API ✔'));

// ─────────────────────────────────────────────────────────────
// AUTH — LOGIN
// Returns { token, role, userId } so frontend stores all three
// ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'Email and password are required' });
    const cleanEmail = email.trim().toLowerCase();
    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, full_name, password_hash, role, is_active')
        .eq('email', cleanEmail)
        .single();
    if (error || !user) return res.status(404).json({ message: 'No account found with that email address.' });
    if (user.is_active === false) return res.status(403).json({ message: 'Account deactivated. Contact your administrator.' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: user.role.toLowerCase(), userId: user.id, full_name: user.full_name });
});

// ─────────────────────────────────────────────────────────────
// CASES — GET (no FK join, manual enrichment)
// ─────────────────────────────────────────────────────────────
app.get('/api/cases', authenticateToken, async (req, res) => {
    let query = supabase.from('cases').select('*');
    // Investigators only see their own assigned cases
    if (req.user.role === 'investigator')
        query = query.eq('assigned_investigator_id', req.user.id);
    const { data: cases, error } = await query;
    if (error) return res.status(500).json({ message: error.message });
    const enriched = await enrichCasesWithInvestigators(cases);
    res.json(enriched);
});

// ─────────────────────────────────────────────────────────────
// CASES — GET NEXT CASE NUMBER (for UI preview)
// ─────────────────────────────────────────────────────────────
app.get('/api/cases/next-number', authenticateToken, async (req, res) => {
    try {
        const nextNum = await getLatestCaseNumber();
        res.json({ nextCaseNumber: `Case ${nextNum}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// CASES — CREATE
// ─────────────────────────────────────────────────────────────
app.post('/api/cases', authenticateToken, requireRole(['admin', 'commander']), async (req, res) => {
    const { suspect_name, description, risk_level, outcome, assigned_investigator_id,
            location, latitude, longitude } = req.body;
    
    // Validation
    if (!suspect_name || !description || !risk_level) {
        return res.status(400).json({ error: 'suspect_name, description, and risk_level are required' });
    }

    const riskResult = normaliseRiskLevel(risk_level);
    if (!riskResult.ok) return res.status(400).json({ error: riskResult.error });
    const outcomeResult = normaliseOutcome(outcome || 'OPEN');
    if (!outcomeResult.ok) return res.status(400).json({ error: outcomeResult.error });
    
    // Generate case number
    const caseNumber = await generateCaseNumber();
    if (!caseNumber) return res.status(500).json({ error: 'Failed to generate case number' });

    // Resolve coordinates — prefer values sent by the client (from Google Places).
    // If missing, geocode the location string server-side so coords are always stored.
    let lat = (latitude  != null && latitude  !== '') ? parseFloat(latitude)  : null;
    let lon = (longitude != null && longitude !== '') ? parseFloat(longitude) : null;

    if (location && (lat === null || lon === null || isNaN(lat) || isNaN(lon))) {
        const coords = await geocodeAddress(location);
        if (coords) { lat = coords.lat; lon = coords.lon; }
    }

    // Insert case
    const { data, error } = await supabase.from('cases').insert([{
        case_number: caseNumber,
        suspect_name,
        description,
        risk_level:               riskResult.value,
        outcome:                  outcomeResult.value,
        assigned_investigator_id: assigned_investigator_id || null,
        created_by:               req.user.id,
        created_at:               new Date().toISOString(),
        ...(location            ? { location }               : {}),
        ...(lat !== null && !isNaN(lat) ? { latitude:  lat.toString() } : {}),
        ...(lon !== null && !isNaN(lon) ? { longitude: lon.toString() } : {}),
    }]).select();
    
    if (error) {
        console.error('Case creation error:', error);
        // Check if it's a unique constraint violation
        if (error.code === '23505' || error.message.includes('duplicate')) {
            return res.status(409).json({ error: 'Case number already exists. This may be a race condition. Please try again.' });
        }
        return res.status(500).json({ error: error.message });
    }
    
    res.status(201).json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// CASES — UPDATE (PUT /api/cases/:id)
// FIX: resolved_at is now included for all roles that can set it.
// The column name must match your Supabase table exactly.
// If you get "column resolved_at does not exist", run:
//   ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
// ─────────────────────────────────────────────────────────────
app.put('/api/cases/:id', authenticateToken, async (req, res) => {
    const caseId = req.params.id;
    let { suspect_name, risk_level, description, outcome, notes,
          assigned_investigator_id, resolved_at, status } = req.body;

    // Support both 'outcome' and 'status' field names from frontend
    const outcomeValue = outcome || status;

    if (risk_level !== undefined) {
        const r = normaliseRiskLevel(risk_level);
        if (!r.ok) return res.status(400).json({ error: r.error });
        risk_level = r.value;
    }
    if (outcomeValue !== undefined) {
        const r = normaliseOutcome(outcomeValue);
        if (!r.ok) return res.status(400).json({ error: r.error });
        outcome = r.value;
    }

    // Investigators can only update their own cases
    if (req.user.role === 'investigator') {
        const { data: existing } = await supabase
            .from('cases').select('assigned_investigator_id').eq('id', caseId).single();
        if (!existing || existing.assigned_investigator_id !== req.user.id)
            return res.status(403).json({ error: 'Can only update your own cases' });
        const updates = {};
        if (notes       !== undefined) updates.notes       = notes;
        if (outcome     !== undefined) updates.outcome     = outcome;
        if (resolved_at !== undefined) updates.resolved_at = resolved_at;
        const { data, error } = await supabase.from('cases').update(updates).eq('id', caseId).select();
        if (error) return res.status(500).json({ message: error.message });
        return res.json(data[0]);
    }

    // Admin / Commander — all fields allowed
    const updates = Object.fromEntries(
        Object.entries({ suspect_name, risk_level, description, outcome, notes, assigned_investigator_id, resolved_at })
              .filter(([_, v]) => v !== undefined)
    );
    const { data, error } = await supabase.from('cases').update(updates).eq('id', caseId).select();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// CASES — DELETE (admin only)
// ─────────────────────────────────────────────────────────────
app.delete('/api/cases/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { error } = await supabase.from('cases').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: 'Case deleted' });
});

// ─────────────────────────────────────────────────────────────
// CASES — REOPEN (admin only)
// ─────────────────────────────────────────────────────────────
app.post('/api/cases/:id/reopen', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { data, error } = await supabase
        .from('cases')
        .update({ outcome: 'OPEN', resolved_at: null })
        .eq('id', req.params.id)
        .select();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// INVESTIGATORS — GET
// Returns users whose role = 'investigator', with live case counts.
// All investigator data now comes exclusively from the users table.
// The separate investigators table is no longer queried anywhere.
// Response shape is preserved so assign.html / evaluations.html
// continue to work without modification.
// ─────────────────────────────────────────────────────────────
app.get('/api/investigators', authenticateToken, async (req, res) => {
    let query = supabase
        .from('users')
        .select('id, full_name, email, is_active, created_at')
        .eq('role', 'investigator');

    // Investigators can only see their own record
    if (req.user.role === 'investigator') query = query.eq('id', req.user.id);

    const { data: investigators, error } = await query;
    if (error) return res.status(500).json({ message: error.message });

    // Attach case counts — no join required
    const { data: cases } = await supabase
        .from('cases')
        .select('assigned_investigator_id, outcome');

    const enriched = (investigators || []).map(inv => ({
        ...inv,
        // badge_number / investigator_code do not exist on users;
        // return null so the UI falls back to "N/A" gracefully.
        badge_number:      null,
        investigator_code: null,
        assigned: (cases || []).filter(c => c.assigned_investigator_id === inv.id).length,
        resolved: (cases || []).filter(c => c.assigned_investigator_id === inv.id && c.outcome === 'RESOLVED').length,
    }));
    res.json(enriched);
});

// NOTE: POST /api/investigators has been removed.
// Investigators are now created through POST /api/users with role='investigator'.
// This eliminates the duplicate data problem between the two tables.

// ─────────────────────────────────────────────────────────────
// USERS — GET (admin only)
// ─────────────────────────────────────────────────────────────
app.get('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { data, error } = await supabase
        .from('users').select('id, email, full_name, role, created_at, is_active');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// ─────────────────────────────────────────────────────────────
// USERS — CREATE (admin only)
// ─────────────────────────────────────────────────────────────
app.post('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { email, password, role, full_name } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: 'email, password and role required' });
    if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'full_name is required' });
    const validRoles = ['admin', 'commander', 'investigator', 'user'];
    if (!validRoles.includes(role.toLowerCase())) return res.status(400).json({ error: 'Invalid role' });
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{
        email:      email.trim().toLowerCase(),
        full_name:  full_name.trim(),
        password_hash,
        role:       role.toLowerCase(),
        is_active:  true,
        created_at: new Date().toISOString()
    }]).select('id, email, full_name, role, created_at, is_active');
    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// USERS — UPDATE STATUS (admin only)
// ─────────────────────────────────────────────────────────────
app.put('/api/users/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { is_active } = req.body;
    const { data, error } = await supabase.from('users').update({ is_active }).eq('id', req.params.id).select();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// USERS — UPDATE ROLE (admin only)
// ─────────────────────────────────────────────────────────────
app.put('/api/users/:id/role', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { role, full_name } = req.body;
    const validRoles = ['admin', 'commander', 'investigator', 'user'];
    if (!validRoles.includes(role?.toLowerCase())) return res.status(400).json({ error: 'Invalid role' });
    const updates = { role: role.toLowerCase() };
    if (full_name && full_name.trim()) updates.full_name = full_name.trim();
    const { data, error } = await supabase.from('users').update(updates).eq('id', req.params.id).select();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// USERS — DELETE (admin only)
// ─────────────────────────────────────────────────────────────
app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: 'User deleted' });
});

// ─────────────────────────────────────────────────────────────
// PROPERTIES
// ─────────────────────────────────────────────────────────────
app.get('/api/properties', authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('properties').select('*');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// ── CREATE PROPERTY LINKED TO CASE ─────────────────────────────
// Called when admin creates a case with property details
app.post('/api/cases/:caseId/properties', authenticateToken, requireRole(['admin', 'commander']), async (req, res) => {
    const { caseId } = req.params;
    const { address, additional_details, latitude, longitude } = req.body;

    if (!address) {
        return res.status(400).json({ error: 'address is required' });
    }

    try {
        // Insert property
        const { data: propData, error: propError } = await supabase
            .from('properties')
            .insert([{
                address,
                additional_details: additional_details || null,
                latitude: latitude || null,
                longitude: longitude || null,
                created_at: new Date().toISOString(),
            }])
            .select();

        if (propError) {
            return res.status(500).json({ error: propError.message });
        }

        // If case has a properties_id column, update it
        // Otherwise, this property is just created and linked by address
        const property = propData[0];
        
        // Update case to link to this property (if your schema supports it)
        // You may need to add a properties_id or properties_ids column to cases table
        
        res.status(201).json(property);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/upload', authenticateToken, requireRole(['admin']), upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const rows = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);
    bufferStream.pipe(csv())
        .on('data', row => rows.push({
            address: row.address,
            consumption_current: parseFloat(row.consumption_current),
            suburb: row.suburb,
        }))
        .on('end', async () => {
            const { error } = await supabase.from('properties').insert(rows);
            if (error) return res.status(500).json({ message: error.message });
            const vals = rows.map(r => r.consumption_current);
            const avg  = calculateAverage(vals);
            const anomalies = detectAnomalies(vals);
            for (const row of rows) {
                const riskScore = anomalies.includes(row.consumption_current) ? 100 : Math.round((row.consumption_current / avg) * 50);
                await supabase.from('properties').update({ risk_score: riskScore }).eq('address', row.address);
            }
            res.json({ message: `${rows.length} properties saved.`, anomaliesDetected: anomalies.length });
        })
        .on('error', err => res.status(500).json({ message: 'CSV error: ' + err.message }));
});

// ─────────────────────────────────────────────────────────────
// TIPS
// ─────────────────────────────────────────────────────────────
app.post('/api/tips', async (req, res) => {
    const { phone_number, message } = req.body;
    const { data, error } = await supabase.from('tips').insert([{ phone_number, message, received_at: new Date() }]).select();
    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json({ message: 'Tip received', tip: data[0] });
});
app.get('/api/tips', authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('tips').select('*').order('received_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS
// Returns counts filtered by role:
//   investigator → own cases only
//   admin/commander → all cases
// ─────────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    let query = supabase.from('cases').select('risk_level, outcome');
    if (req.user.role === 'investigator')
        query = query.eq('assigned_investigator_id', req.user.id);
    const { data: cases, error } = await query;
    if (error) return res.status(500).json({ message: error.message });
    res.json({
        totalCases: cases.length,
        byRisk: {
            HIGH: cases.filter(c => isHighRiskValue(c.risk_level)).length,
            MID:  cases.filter(c => (c.risk_level || '').toString().toUpperCase().trim() === 'MID').length,
            LOW:  cases.filter(c => (c.risk_level || '').toString().toUpperCase().trim() === 'LOW').length,
        },
        byOutcome: {
            OPEN:     cases.filter(c => c.outcome === 'OPEN').length,
            PENDING:  cases.filter(c => c.outcome === 'PENDING').length,
            RESOLVED: cases.filter(c => c.outcome === 'RESOLVED').length,
        },
    });
});

// ─────────────────────────────────────────────────────────────
// TEAM PERFORMANCE / COMMANDER STATS
// Powers: team overview (shown in dashboard.html), assign.html investigator cards.
// Reads from the users table (role='investigator') — single source of truth.
// ─────────────────────────────────────────────────────────────
async function getTeamPerformance(req, res) {
    const { data: cases, error: ce } = await supabase.from('cases').select('*');
    if (ce) return res.status(500).json({ message: ce.message });

    // Query users table for role='investigator' — single source of truth
    const { data: investigators, error: ie } = await supabase
        .from('users')
        .select('id, email, full_name, is_active')
        .eq('role', 'investigator');
    if (ie) return res.status(500).json({ message: ie.message });

    const invList = investigators || [];
    const investigatorPerformance = invList.map(inv => ({
        id:           inv.id,
        email:        inv.email,
        full_name:    inv.full_name,
        badge_number: inv.badge_number,
        assigned:     (cases || []).filter(c => c.assigned_investigator_id === inv.id).length,
        resolved:     (cases || []).filter(c => c.assigned_investigator_id === inv.id && c.outcome === 'RESOLVED').length,
    }));

    const suburbMap = {};
    (cases || []).forEach(c => {
        if (c.suburb && c.revenue_recovered)
            suburbMap[c.suburb] = (suburbMap[c.suburb] || 0) + c.revenue_recovered;
    });

    res.json({
        totalCases:          (cases || []).length,
        confirmedTheft:      (cases || []).filter(c => c.outcome === 'RESOLVED').length,
        revenueRecovered:    (cases || []).reduce((s, c) => s + (c.revenue_recovered || 0), 0),
        activeInvestigators: invList.length,
        investigatorPerformance,
        revenueBySuburb:     Object.entries(suburbMap).map(([suburb, revenue]) => ({ suburb, revenue })),
    });
}

app.get('/api/commander/stats', authenticateToken, requireRole(['commander', 'admin']), getTeamPerformance);
app.get('/api/dashboard/team', authenticateToken, requireRole(['admin']), getTeamPerformance);

// ─────────────────────────────────────────────────────────────
// EVALUATIONS — GET
// admin → all; commander → own; investigator → blocked
// ─────────────────────────────────────────────────────────────
app.get('/api/evaluations', authenticateToken, async (req, res) => {
    if (req.user.role === 'investigator')
        return res.status(403).json({ error: 'Investigators cannot view evaluations' });
    let query = supabase.from('investigator_evaluations').select('*');
    if (req.user.role === 'commander') query = query.eq('evaluator_id', req.user.id);
    const { data, error } = await query.order('evaluation_date', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// ─────────────────────────────────────────────────────────────
// MY EVALUATIONS — GET /api/my-evaluations
// Investigator-safe endpoint: returns only the evaluations that
// belong to the logged-in investigator (scoped by investigator_id).
// Admins and commanders can also call this to see their own record
// if they were ever evaluated, but the primary consumer is the
// investigator's dashboard sidebar (#myEvalSidebarContent).
// ─────────────────────────────────────────────────────────────
app.get('/api/my-evaluations', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('investigator_evaluations')
        .select('*')
        .eq('investigator_id', req.user.id)
        .order('evaluation_date', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
});

// ─────────────────────────────────────────────────────────────
// EVALUATIONS — CREATE/UPDATE (upsert)
// ─────────────────────────────────────────────────────────────
app.post('/api/evaluations', authenticateToken, requireRole(['admin', 'commander']), async (req, res) => {
    const {
        investigator_id, rating_overall, rating_communication,
        rating_case_handling, rating_professionalism, rating_speed,
        written_feedback, strengths, weaknesses, recommendations,
    } = req.body;
    const { data, error } = await supabase
        .from('investigator_evaluations')
        .upsert({
            evaluator_id: req.user.id,
            investigator_id, rating_overall, rating_communication,
            rating_case_handling, rating_professionalism, rating_speed,
            written_feedback, strengths, weaknesses, recommendations,
            evaluation_date: new Date(),
        }, { onConflict: 'evaluator_id,investigator_id' })
        .select();
    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// PDF REPORT — GET /api/reports/:caseId
// Uses manual investigator fetch (no FK join)
// ─────────────────────────────────────────────────────────────
app.get('/api/reports/:caseId', authenticateToken, async (req, res) => {
    const { data: caseData, error: ce } = await supabase
        .from('cases').select('*').eq('id', req.params.caseId).single();
    if (ce || !caseData) return res.status(404).json({ message: 'Case not found' });

    if (req.user.role === 'investigator' && caseData.assigned_investigator_id !== req.user.id)
        return res.status(403).json({ error: 'Can only report on your own cases' });

    // Fetch investigator from users table (role='investigator') — no separate table
    let inv = null;
    if (caseData.assigned_investigator_id) {
        const { data } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', caseData.assigned_investigator_id)
            .eq('role', 'investigator')
            .single();
        inv = data;
    }

    const doc = new PDFKit({ margin: 50 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', async () => {
        const buf  = Buffer.concat(chunks);
        const name = `report-${caseData.case_number || req.params.caseId}-${Date.now()}.pdf`;
        const { error: se } = await supabase.storage.from('reports').upload(name, buf, { contentType: 'application/pdf' });
        if (se) return res.status(500).json({ message: se.message });
        const { data: url } = supabase.storage.from('reports').getPublicUrl(name);
        res.json({ url: url.publicUrl });
    });

    doc.fontSize(20).font('Helvetica-Bold').text('Eskom Theft Detection — Case Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString('en-ZA')}`, { align: 'right' });
    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('Case Identification');
    doc.fontSize(11).font('Helvetica')
       .text(`Case Number: ${caseData.case_number || 'N/A'}`)
       .text(`Suspect:     ${caseData.suspect_name || 'N/A'}`)
       .text(`Risk Level:  ${caseData.risk_level || 'N/A'}`)
       .text(`Status:      ${caseData.outcome || 'N/A'}`)
       .text(`Created:     ${caseData.created_at ? new Date(caseData.created_at).toLocaleString('en-ZA') : 'N/A'}`);
    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('Description');
    doc.fontSize(11).font('Helvetica').text(caseData.description || 'No description recorded.');
    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('Assigned Investigator');
    if (inv) {
        doc.fontSize(11).font('Helvetica')
           .text(`Name:  ${inv.full_name || 'N/A'}`)
           .text(`Email: ${inv.email || 'N/A'}`);
    } else {
        doc.fontSize(11).font('Helvetica').text('No investigator assigned.');
    }
    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('Notes');
    doc.fontSize(11).font('Helvetica').text(caseData.notes || 'None.');
    if (caseData.resolved_at) {
        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').text('Resolution');
        doc.fontSize(11).font('Helvetica').text(`Resolved: ${new Date(caseData.resolved_at).toLocaleString('en-ZA')}`);
    }
    doc.end();
});

// ─────────────────────────────────────────────────────────────
// MAP MARKERS — GET (restore pins on page load)
// Returns all manually placed map markers for the current user.
// These are separate from cases — they are never created by admin.html.
// ─────────────────────────────────────────────────────────────
app.get('/api/map-markers', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('map_markers')
        .select('id, label, latitude, longitude, placed_by, created_at')
        .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
});

// ─────────────────────────────────────────────────────────────
// MAP MARKERS — CREATE (place a pin from the map page)
// Stores lat/lng/label in map_markers — never touches cases table.
// ─────────────────────────────────────────────────────────────
app.post('/api/map-markers', authenticateToken, async (req, res) => {
    const { label, latitude, longitude } = req.body;
    if (!label || latitude == null || longitude == null)
        return res.status(400).json({ error: 'label, latitude, and longitude are required' });

    const { data, error } = await supabase
        .from('map_markers')
        .insert([{
            label,
            latitude:   parseFloat(latitude),
            longitude:  parseFloat(longitude),
            placed_by:  req.user.id,
            created_at: new Date().toISOString(),
        }])
        .select();
    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// MAP MARKERS — DELETE (remove a single pin)
// Only deletes from map_markers — never touches the cases table,
// so admin-created cases are completely safe.
// ─────────────────────────────────────────────────────────────
app.delete('/api/map-markers/:id', authenticateToken, async (req, res) => {
    const { error } = await supabase
        .from('map_markers')
        .delete()
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: 'Marker deleted' });
});

// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────
app.post('/api/average', (req, res) => res.json({ average: calculateAverage(req.body.data) }));
app.post('/api/detect',  (req, res) => res.json({ anomalies: detectAnomalies(req.body.data) }));
app.post('/api/test',    (req, res) => res.send('POST WORKING'));

// ─────────────────────────────────────────────────────────────
// USER SELF-REGISTRATION  (PUBLIC — no token required)
// Creates an account with role='user' so community members can
// log in and access the user-dashboard.html reporting portal.
// ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    const { email, password, full_name, role } = req.body;
    if (!email || !password || !full_name)
        return res.status(400).json({ error: 'email, password, and full_name are required' });

    // Only allow self-registration for these roles; admin accounts are created by admins.
    const ALLOWED_SELF_REG_ROLES = ['user', 'investigator', 'commander'];
    const assignedRole = (role || 'user').toLowerCase().trim();
    if (!ALLOWED_SELF_REG_ROLES.includes(assignedRole))
        return res.status(400).json({ error: 'Invalid role. Choose: Community Reporter, Investigator, or Commander.' });

    if (password.length < 8)
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    try {
        const password_hash = await bcrypt.hash(password, 10);
        const { data, error } = await supabase
            .from('users')
            .insert([{
                email:        email.trim().toLowerCase(),
                full_name:    full_name.trim(),
                password_hash,
                role:         assignedRole,
                is_active:    true,
                created_at:   new Date().toISOString(),
            }])
            .select('id, email, full_name, role, created_at');
        if (error) {
            if (error.code === '23505')
                return res.status(409).json({ error: 'An account with this email already exists.' });
            return res.status(500).json({ message: error.message });
        }
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// COMMUNITY USER REPORTS — SUBMIT
// POST /api/user-reports
//
// Any authenticated user (any role) may call this.
// The report is written directly to the `cases` table as
// outcome='PENDING' so it immediately appears in the admin
// case management workflow (caseList.html shows PENDING cases).
//
// Field mapping to the cases table:
//   title + description → description  (prefixed [Community Report])
//   address             → location + geocoded lat/lon
//   province            → suburb
//   priority            → risk_level  (low→LOW, medium→MID, high/critical→HIGH)
//   file_names[]        → appended to description (no binary upload yet)
//   observed_date       → appended to description
//   anonymity           → controls suspect_name label
// ─────────────────────────────────────────────────────────────
app.post('/api/user-reports', authenticateToken, async (req, res) => {
    const {
        title, description, address, province,
        priority, observed_date, anonymity, file_names,
    } = req.body;

    if (!title || !description || !address)
        return res.status(400).json({ error: 'title, description, and address are required' });

    const priorityToRisk = { low: 'LOW', medium: 'MID', high: 'HIGH', critical: 'HIGH' };
    const risk_level = priorityToRisk[(priority || 'medium').toLowerCase()] || 'MID';

    // Generate a proper case number (same sequence as admin cases)
    const caseNumber = await generateCaseNumber();
    if (!caseNumber) return res.status(500).json({ error: 'Failed to generate case number. Please retry.' });

    // Geocode the address server-side (same as admin case creation)
    const coords = await geocodeAddress(address);

    // Build the full description stored in the cases table
    const lines = [
        `[Community Report] ${title}`,
        '',
        description,
    ];
    if (observed_date)                    lines.push('', `Date first observed: ${observed_date}`);
    if (province)                         lines.push(`Province: ${province}`);
    if (file_names && file_names.length)  lines.push('', `Evidence files noted by reporter: ${file_names.join(', ')}`);

    const fullDescription = lines.join('\n');

    // suspect_name is used in the admin UI — label it clearly
    const suspectName = anonymity === 'anonymous'
        ? 'Anonymous — Community Report'
        : 'Community Report (Named Reporter)';

    const insertPayload = {
        case_number:  caseNumber,
        suspect_name: suspectName,
        description:  fullDescription,
        risk_level,
        outcome:      'PENDING',
        location:     address,
        created_by:   req.user.id,
        created_at:   new Date().toISOString(),
        ...(coords   ? { latitude: coords.lat.toString(), longitude: coords.lon.toString() } : {}),
        ...(province ? { suburb: province } : {}),
    };

    const { data, error } = await supabase.from('cases').insert([insertPayload]).select();
    if (error) {
        if (error.code === '23505')
            return res.status(409).json({ error: 'Case number conflict — please try again.' });
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// COMMUNITY USER REPORTS — GET OWN
// GET /api/user-reports
// Returns all cases submitted by the currently logged-in user.
// Scoped strictly to created_by = req.user.id so users can
// never see each other's reports.
// ─────────────────────────────────────────────────────────────
app.get('/api/user-reports', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('created_by', req.user.id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
});

// ─────────────────────────────────────────────────────────────
// ADMIN: COMMUNITY REPORTS INBOX
// GET /api/admin/community-reports
// Returns all PENDING cases for admin/commander review.
// These are the community-submitted reports waiting for
// assignment. Shown as a notification inbox in dashboard.html.
// ─────────────────────────────────────────────────────────────
app.get('/api/admin/community-reports', authenticateToken, requireRole(['admin', 'commander']), async (req, res) => {
    const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('outcome', 'PENDING')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    const enriched = await enrichCasesWithInvestigators(data || []);
    res.json(enriched);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✔ Server on http://localhost:${PORT}`));