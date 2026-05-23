# Database Migration Instructions

## Required SQL Migrations

Before the "Create Case" feature works, you MUST run these SQL statements in your Supabase database.

---
   
## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to [https://app.supabase.com](https://app.supabase.com)
- Select your project
- Click **SQL Editor** in the sidebar

### 2. Create New Query
- Click **+ New Query**
- Name it: `case_creation_migration`

### 3. Copy and Paste SQL

Copy ALL of the SQL below and paste into the editor:

```sql
-- ============================================================
-- Eskom Theft Detection — Case Creation Feature Migration
-- ============================================================
-- Run this in Supabase SQL Editor to enable:
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
  ADD CONSTRAINT IF NOT EXISTS uq_case_number UNIQUE (case_number);

-- ── 4. ADD VALIDATION CHECK FOR case_number FORMAT ────────────
-- Ensures case_number follows "Case N" format
ALTER TABLE cases
  ADD CONSTRAINT IF NOT EXISTS chk_case_number_format
  CHECK (case_number IS NULL OR case_number ~ '^Case\s+\d+$');

-- ── 5. INDEX FOR CASE_NUMBER (faster lookups) ────────────────
CREATE INDEX IF NOT EXISTS idx_case_number ON cases (case_number DESC);

-- ── 6. INDEX FOR PERFORMANCE ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties (created_at DESC);

-- ── 7. ENABLE RLS ON PROPERTIES (optional security layer) ─────
-- Uncomment these lines if you want Row-Level Security on properties
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY IF NOT EXISTS read_properties ON properties
--   FOR SELECT USING (true);
-- CREATE POLICY IF NOT EXISTS create_properties ON properties
--   FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'commander'));
```

### 4. Run the Migration
- Click the **Play ▶** button (or Ctrl+Enter)
- Wait for completion
- You should see: `Query executed successfully`

### 5. Verify

Check that the changes were applied:

```sql
-- Run this to verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY column_name;
```

You should see these new columns:
- `properties_id` (uuid[])
- Existing `case_number` (text)

---
   
## What Each Statement Does

| Statement | Purpose |
|-----------|---------|
| ADD properties_id | Links cases to property records |
| ADD latitude/longitude to properties | Stores coordinates from Google Places |
| UNIQUE constraint on case_number | Prevents two cases with same number |
| CHECK constraint for format | Ensures case numbers match "Case N" pattern |
| INDEX on case_number | Makes case number lookups faster |
| INDEX on properties | Improves query performance |

---

## Troubleshooting

### Error: "Column already exists"
- This is OK! It means the migration was already run
- The `IF NOT EXISTS` clause prevents duplicate errors
- You can safely run again

### Error: "Constraint already exists"  
- Same as above - already applied
- Safe to run again

### Error: "Permission denied"
- You need Supabase admin/owner access
- Contact your database administrator

### No error, but column doesn't appear
- Refresh Supabase page (F5)
- Check you're looking at right table

---

## Verify Migration Success

Run these checks to confirm everything is set up:

### Check 1: Columns Added
```sql
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'cases' AND column_name = 'properties_id';
```
Should return: `1`

### Check 2: Case Number Constraint
```sql
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'cases' AND constraint_name = 'uq_case_number';
```
Should return: `uq_case_number`

### Check 3: Index Created
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'cases' AND indexname = 'idx_case_number';
```
Should return: `idx_case_number`

---

## Rollback (If Needed)

If you need to undo these changes:

```sql
-- Remove the constraints and columns
ALTER TABLE cases DROP CONSTRAINT IF EXISTS uq_case_number;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS chk_case_number_format;
ALTER TABLE cases DROP COLUMN IF EXISTS properties_id;
ALTER TABLE properties DROP COLUMN IF EXISTS latitude;
ALTER TABLE properties DROP COLUMN IF EXISTS longitude;
DROP INDEX IF EXISTS idx_case_number;
DROP INDEX IF EXISTS idx_properties_created_at;
```

**⚠️ WARNING**: Only do this if you need to completely remove the feature!

---

## Next Steps

After running the migration:

1. ✅ Verify migration successful (use checks above)
2. ✅ Update `pages/admin.html` with Google API key
3. ✅ Test creating a case in the admin dashboard
4. ✅ Check that case number is "Case 1" format
5. ✅ Verify case saved to database

---

## Questions?

If queries fail:
- Check Supabase connection status
- Verify you're on the right project
- Check SQL syntax is correct
- Try running individual statements

---

**Migration Version:** 1.0.0  
**Date:** 2026-05-22  
**Status:** Ready to Deploy
