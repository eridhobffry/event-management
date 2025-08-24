-- Create writable view and routing rules for neon_auth.users_sync
-- Mirrors Neon migrations b0dcddc7-b77b-483a-b704-abc70d3af2f5 and ebc5c48f-d241-47eb-91fb-81b4acfe5a1e

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS neon_auth;

-- View exposes only id and email from base table, filtering out soft-deleted rows
DROP VIEW IF EXISTS neon_auth.users_sync_write CASCADE;
CREATE VIEW neon_auth.users_sync_write AS
SELECT id, email
FROM neon_auth.users_sync
WHERE deleted_at IS NULL;

-- Insert rule: transform (id, email) into raw_json for base table insert
DROP RULE IF EXISTS users_sync_write_ins ON neon_auth.users_sync_write;
CREATE RULE users_sync_write_ins AS
ON INSERT TO neon_auth.users_sync_write DO INSTEAD
INSERT INTO neon_auth.users_sync (raw_json, updated_at, deleted_at)
VALUES (
  jsonb_build_object(
    'id', NEW.id,
    'primary_email', NEW.email
  ),
  now(),
  NULL
);

-- Delete rule: forward deletes by id to base table
DROP RULE IF EXISTS users_sync_write_del ON neon_auth.users_sync_write;
CREATE RULE users_sync_write_del AS
ON DELETE TO neon_auth.users_sync_write DO INSTEAD
DELETE FROM neon_auth.users_sync WHERE id = OLD.id;
