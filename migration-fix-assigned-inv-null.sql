-- Migration: allow NULL for assigned_investigator_id to prevent insert errors
-- Apply this against your Postgres database (Supabase).

ALTER TABLE cases
  ALTER COLUMN assigned_investigator_id DROP NOT NULL;

-- Optional: if you also have assigned_commander_id and want it nullable, include:
-- ALTER TABLE cases
--   ALTER COLUMN assigned_commander_id DROP NOT NULL;
