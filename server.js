require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const multer    = require('multer');
const csv       = require('csv-parser');
const PDFKit    = require('pdfkit');
const stream    = require('stream');
const path      = require('path');
const { createClient } = require('@supabase/supabase-js');
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcrypt');

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

// ── STATIC FILES & LANDING PAGE ───────────────────────────────
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ── SUPABASE CLIENT ───────────────────────────────────────────
// Using service_role key — bypasses RLS so our own RBAC controls access
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const upload = multer({ storage: multer.memoryStorage() });

// ── VALIDATION ────────────────────────────────────────────────
const VALID_RISK_LEVELS = ['HIGH', 'MID', 'LOW'];
const VALID_OUTCOMES    = ['OPEN', 'PENDING', 'RESOLVED'];

function normaliseRiskLevel(value) {
    if (!value) return { ok: false, error: 'risk_level is required' };
    const upper = value.toUpperCase().trim();
    if (!VALID_RISK_LEVELS.includes(upper))
        return { ok: false, error: `Invalid risk_level "${value}". Must be: ${VALID_RISK_LEVELS.join(', ')}` };
    return { ok: true, value: upper };
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
async function generateCaseNumber() {
    const { count, error } = await supabase.from('cases').select('*', { count: 'exact', head: true });
    if (error) return `CASE-${Date.now().toString().slice(-4)}`;
    return `CASE-${String((count || 0) + 1).padStart(4, '0')}`;
}

// ── MANUAL INVESTIGATOR ENRICHMENT ───────────────────────────
// Cases and investigators are now independent tables (no FK join).
// We fetch investigators separately and attach them in JS.
// This avoids ALL schema cache issues with Supabase joins.
async function enrichCasesWithInvestigators(cases) {
    if (!cases || cases.length === 0) return cases;
    const { data: investigators, error } = await supabase
        .from('investigators')
        .select('id, full_name, email, badge_number, investigator_code');
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
// AUTH — LOGIN
// Returns { token, role, userId } so frontend stores all three
// ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password_hash, role')
        .eq('email', cleanEmail)
        .single();
    if (error || !user) return res.status(404).json({ message: 'Email not found' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Wrong password' });
    if (user.role.toLowerCase() !== role.toLowerCase())
        return res.status(403).json({ message: 'Incorrect role selected' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: user.role.toLowerCase(), userId: user.id });
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
// CASES — CREATE
// ─────────────────────────────────────────────────────────────
app.post('/api/cases', authenticateToken, requireRole(['admin', 'commander']), async (req, res) => {
    const { suspect_name, description, risk_level, outcome, assigned_investigator_id } = req.body;
    const riskResult = normaliseRiskLevel(risk_level);
    if (!riskResult.ok) return res.status(400).json({ error: riskResult.error });
    const outcomeResult = normaliseOutcome(outcome || 'OPEN');
    if (!outcomeResult.ok) return res.status(400).json({ error: outcomeResult.error });
    const caseNumber = await generateCaseNumber();
    const { data, error } = await supabase.from('cases').insert([{
        case_number: caseNumber,
        suspect_name,
        description,
        risk_level:               riskResult.value,
        outcome:                  outcomeResult.value,
        assigned_investigator_id: assigned_investigator_id || null,
        created_by:               req.user.id,
        created_at:               new Date().toISOString(),
    }]).select();
    if (error) return res.status(500).json({ message: error.message });
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
// Returns investigators with live case counts attached.
// Used by: assign.html, evaluations.html, commander.html
// ─────────────────────────────────────────────────────────────
app.get('/api/investigators', authenticateToken, async (req, res) => {
    let query = supabase.from('investigators').select('id, full_name, email, badge_number, investigator_code, is_active, created_at');
    if (req.user.role === 'investigator') query = query.eq('id', req.user.id);
    const { data: investigators, error } = await query;
    if (error) return res.status(500).json({ message: error.message });

    // Attach case counts without a join — fetch all cases once
    const { data: cases } = await supabase.from('cases').select('assigned_investigator_id, outcome');
    const enriched = (investigators || []).map(inv => ({
        ...inv,
        assigned: (cases || []).filter(c => c.assigned_investigator_id === inv.id).length,
        resolved: (cases || []).filter(c => c.assigned_investigator_id === inv.id && c.outcome === 'RESOLVED').length,
    }));
    res.json(enriched);
});

// ─────────────────────────────────────────────────────────────
// INVESTIGATORS — CREATE
// ─────────────────────────────────────────────────────────────
app.post('/api/investigators', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { full_name, email, badge_number, user_id } = req.body;
    if (!full_name || !email) return res.status(400).json({ error: 'full_name and email are required' });
    const { data, error } = await supabase.from('investigators').insert([{
        full_name, email, investigator_code: badge_number || null,
        user_id: user_id || null, is_active: true, created_at: new Date().toISOString()
    }]).select();
    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json(data[0]);
});

// ─────────────────────────────────────────────────────────────
// USERS — GET (admin only)
// ─────────────────────────────────────────────────────────────
app.get('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { data, error } = await supabase
        .from('users').select('id, email, role, created_at, is_active');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// ─────────────────────────────────────────────────────────────
// USERS — CREATE (admin only)
// ─────────────────────────────────────────────────────────────
app.post('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: 'email, password and role required' });
    const validRoles = ['admin', 'commander', 'investigator'];
    if (!validRoles.includes(role.toLowerCase())) return res.status(400).json({ error: 'Invalid role' });
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{
        email: email.trim().toLowerCase(),
        password_hash,
        role: role.toLowerCase(),
        is_active: true,
        created_at: new Date().toISOString()
    }]).select('id, email, role, created_at, is_active');
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
    const { role } = req.body;
    const validRoles = ['admin', 'commander', 'investigator'];
    if (!validRoles.includes(role?.toLowerCase())) return res.status(400).json({ error: 'Invalid role' });
    const { data, error } = await supabase.from('users').update({ role: role.toLowerCase() }).eq('id', req.params.id).select();
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
            HIGH: cases.filter(c => c.risk_level === 'HIGH').length,
            MID:  cases.filter(c => c.risk_level === 'MID').length,
            LOW:  cases.filter(c => c.risk_level === 'LOW').length,
        },
        byOutcome: {
            OPEN:     cases.filter(c => c.outcome === 'OPEN').length,
            PENDING:  cases.filter(c => c.outcome === 'PENDING').length,
            RESOLVED: cases.filter(c => c.outcome === 'RESOLVED').length,
        },
    });
});

// ─────────────────────────────────────────────────────────────
// COMMANDER STATS
// Powers: commander.html team overview, assign.html investigator cards
// FIX: now reads from investigators table (not users table)
// so full_name, badge_number etc. are available
// ─────────────────────────────────────────────────────────────
app.get('/api/commander/stats', authenticateToken, requireRole(['commander', 'admin']), async (req, res) => {
    const { data: cases, error: ce } = await supabase.from('cases').select('*');
    if (ce) return res.status(500).json({ message: ce.message });

    const { data: investigators, error: ie } = await supabase
        .from('investigators').select('id, email, full_name, badge_number, investigator_code');

    const invList = investigators || [];
    const investigatorPerformance = invList.map(inv => ({
        id:           inv.id,
        email:        inv.email,
        full_name:    inv.full_name,
        badge_number: inv.badge_number,
        assigned: (cases || []).filter(c => c.assigned_investigator_id === inv.id).length,
        resolved: (cases || []).filter(c => c.assigned_investigator_id === inv.id && c.outcome === 'RESOLVED').length,
    }));

    const suburbMap = {};
    (cases || []).forEach(c => {
        if (c.suburb && c.revenue_recovered)
            suburbMap[c.suburb] = (suburbMap[c.suburb] || 0) + c.revenue_recovered;
    });

    res.json({
        totalCases:             (cases || []).length,
        confirmedTheft:         (cases || []).filter(c => c.outcome === 'RESOLVED').length,
        revenueRecovered:       (cases || []).reduce((s, c) => s + (c.revenue_recovered || 0), 0),
        activeInvestigators:    invList.length,
        investigatorPerformance,
        revenueBySuburb:        Object.entries(suburbMap).map(([suburb, revenue]) => ({ suburb, revenue })),
    });
});

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

    // Fetch investigator separately — no join needed
    let inv = null;
    if (caseData.assigned_investigator_id) {
        const { data } = await supabase.from('investigators')
            .select('full_name, email, badge_number, investigator_code')
            .eq('id', caseData.assigned_investigator_id).single();
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
           .text(`Email: ${inv.email || 'N/A'}`)
           .text(`Badge: ${inv.badge_number || 'N/A'}`);
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
// UTILITY
// ─────────────────────────────────────────────────────────────
app.post('/api/average', (req, res) => res.json({ average: calculateAverage(req.body.data) }));
app.post('/api/detect',  (req, res) => res.json({ anomalies: detectAnomalies(req.body.data) }));
app.post('/api/test',    (req, res) => res.send('POST WORKING'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✔ Server on http://localhost:${PORT}`));