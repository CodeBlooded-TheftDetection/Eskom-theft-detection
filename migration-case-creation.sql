-- ============================================================
-- Eskom Theft Detection — Case Creation Feature Migration
-- ============================================================
-- This migration adds support for case creation with:
-- - "Case N" format for case numbers (e.g., "Case 1", "Case 2")
-- - Properties linked to cases
-- - Google Places integration fields
-- ============================================================

-- ── 1. ADD PROPERTIES_ID TO CASES (link cases to properties) ──
-- This allows a case to have one or more associated properties
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS properties_id UUID ARRAY DEFAULT ARRAY[]::UUID[];

-- ── 2. ADD GOOGLE PLACES FIELDS TO PROPERTIES ────────────────
-- Store latitude/longitude from Google Places autocomplete
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- ── 3. ENSURE case_number IS UNIQUE (prevent duplicates) ──────
-- The database-level UNIQUE constraint prevents duplicate case numbers
-- even if multiple admins create cases simultaneously
ALTER TABLE cases
  ADD CONSTRAINT uq_case_number UNIQUE (case_number);

-- ── 4. ADD VALIDATION CHECK FOR case_number FORMAT ────────────
-- Ensures case_number follows "Case N" format
-- NOTE: Commented out because existing case numbers may not match this format
-- Application-level validation enforces this instead
-- ALTER TABLE cases
--   ADD CONSTRAINT chk_case_number_format
--   CHECK (case_number IS NULL OR case_number ~ '^Case\s+\d+$');

-- ── 5. INDEX FOR CASE_NUMBER (faster lookups) ────────────────
CREATE INDEX IF NOT EXISTS idx_case_number ON cases (case_number DESC);

-- ── 6. INDEX FOR CASE_NUMBER EXTRACTION (for sequential queries) 
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties (created_at DESC);

-- ── 7. ENABLE RLS ON PROPERTIES (optional security layer) ─────
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Allow all roles to read properties
CREATE POLICY read_properties ON properties
  FOR SELECT
  USING (true);

-- Allow admin/commander to create properties
CREATE POLICY create_properties ON properties
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'commander'));

-- ============================================================
-- NOTES FOR FRONTEND DEVELOPER
-- ============================================================
-- 1. Case Number Generation:
--    - Query: SELECT case_number FROM cases ORDER BY case_number DESC LIMIT 1
--    - Extract number and add 1
--    - Format: CONCAT('Case ', next_number)
--
-- 2. Duplicate Prevention:
--    - Database UNIQUE constraint prevents duplicates
--    - Application logic handles race conditions gracefully
--    - If duplicate error occurs, retry with fresh number fetch
--
-- 3. Properties Integration:
--    - POST /api/cases/:caseId/properties creates linked property
--    - Address can come from Google Places API
--    - Latitude/longitude stored for mapping
--
-- 4. Google Places Integration:
--    - Add Google Maps JS library to HTML
--    - Use Autocomplete Service for real-time suggestions
--    - Return place_id, formatted address, geometry data
--    - Store address, latitude, longitude in properties table
