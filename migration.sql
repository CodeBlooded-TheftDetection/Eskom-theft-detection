-- ============================================================
-- Eskom Theft Detection — Supabase Database Migration
-- ============================================================
-- Run these statements in the Supabase SQL Editor to enforce
-- validation at the database level. This is the THIRD layer of
-- validation (frontend form + backend middleware + DB constraint).
--
-- Even if a rogue request bypasses both the frontend and backend,
-- the database itself will reject invalid values.
-- ============================================================

-- ── 1. ADD case_number COLUMN (human-readable, unique) ────────
-- This stores CASE-0001 style identifiers.
-- The UUID (id) remains the internal primary key.
-- The case_number is what the UI and reports display to users.
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS case_number TEXT UNIQUE;

-- ── 2. ADD created_by COLUMN ──────────────────────────────────
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- ── 3. ADD assigned_investigator_id FK ────────────────────────
-- Links cases to the investigators table (not just users).
-- This enables:
--   - Display investigator full name + badge number on reports
--   - Dropdown population for case assignment
--   - Case count per investigator: COUNT(cases WHERE assigned_investigator_id = ?)
--   - Filtering cases by investigator
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS assigned_investigator_id UUID
  REFERENCES investigators(id) ON DELETE SET NULL;

-- ── 4. RENAME assigned_to → assigned_investigator_id ─────────
-- (Skip this if you used ADD COLUMN above and cases.assigned_to is legacy)
-- ALTER TABLE cases RENAME COLUMN assigned_to TO assigned_investigator_id;

-- ── 5. ENFORCE risk_level VALIDATION AT DB LEVEL ─────────────
-- Values are normalised to uppercase by the backend before insertion,
-- so this constraint only catches anything that bypasses the backend.
ALTER TABLE cases
  ADD CONSTRAINT chk_risk_level
  CHECK (risk_level IS NULL OR risk_level IN ('HIGH', 'MID', 'LOW'));

-- ── 6. ENFORCE outcome VALIDATION AT DB LEVEL ────────────────
ALTER TABLE cases
  ADD CONSTRAINT chk_outcome
  CHECK (outcome IS NULL OR outcome IN ('OPEN', 'PENDING', 'RESOLVED'));

-- ── 7. CREATE investigator_evaluations TABLE ──────────────────
-- Stores one evaluation per evaluator per investigator.
-- The UNIQUE constraint on (evaluator_id, investigator_id) prevents
-- duplicate submissions — the backend UPSERTS on this pair.
CREATE TABLE IF NOT EXISTS investigator_evaluations (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluator_id          UUID NOT NULL REFERENCES users(id),
  investigator_id       UUID NOT NULL REFERENCES users(id),

  -- Star ratings 1–5 for each category
  rating_overall        SMALLINT CHECK (rating_overall BETWEEN 1 AND 5),
  rating_communication  SMALLINT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_case_handling  SMALLINT CHECK (rating_case_handling BETWEEN 1 AND 5),
  rating_professionalism SMALLINT CHECK (rating_professionalism BETWEEN 1 AND 5),
  rating_speed          SMALLINT CHECK (rating_speed BETWEEN 1 AND 5),

  -- Written evaluation fields
  written_feedback      TEXT,
  strengths             TEXT,
  weaknesses            TEXT,
  recommendations       TEXT,

  evaluation_date       TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- ONE evaluation per evaluator per investigator.
  -- Re-submitting the form updates this row (upsert), not creates a new one.
  CONSTRAINT uq_evaluator_investigator UNIQUE (evaluator_id, investigator_id)
);

-- ── 8. INVESTIGATORS TABLE (if not yet created) ───────────────
-- The investigators table stores richer data than the users table.
-- cases.assigned_investigator_id references investigators.id.
CREATE TABLE IF NOT EXISTS investigators (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE, -- link to auth user
  full_name             TEXT NOT NULL,
  email                 TEXT UNIQUE NOT NULL,
  badge_number          TEXT UNIQUE,
  assigned_commander_id UUID,  -- for division-based filtering
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. ROW-LEVEL SECURITY (RLS) POLICIES ─────────────────────
-- Optional but recommended: add RLS as a fourth safety layer.
-- These use the JWT role claim so even a direct Supabase SDK call
-- from the frontend is restricted.

-- Enable RLS on cases
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Investigators can only see their own assigned cases
CREATE POLICY inv_see_own_cases ON cases
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' != 'investigator'
    OR assigned_investigator_id = auth.uid()
  );

-- Investigators can only update their own cases
CREATE POLICY inv_update_own_cases ON cases
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' != 'investigator'
    OR assigned_investigator_id = auth.uid()
  );

-- Only admins can delete cases
CREATE POLICY admin_delete_cases ON cases
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Enable RLS on evaluations
ALTER TABLE investigator_evaluations ENABLE ROW LEVEL SECURITY;

-- Investigators cannot read evaluations at all
CREATE POLICY no_inv_read_evals ON investigator_evaluations
  FOR SELECT
  USING (auth.jwt() ->> 'role' != 'investigator');

-- Investigators cannot write evaluations
CREATE POLICY no_inv_write_evals ON investigator_evaluations
  FOR ALL
  USING (auth.jwt() ->> 'role' != 'investigator');