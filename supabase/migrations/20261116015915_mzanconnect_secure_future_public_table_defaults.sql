-- Production migration applied and verified on 2026-11-16.
-- New MzanConnect tables must not automatically grant data privileges to
-- anonymous visitors or signed-in users. Existing feature grants are preserved.
--
-- When a new table is intentionally part of the member app:
--   1. Enable RLS and create member-owned authorization policies.
--   2. GRANT precisely the necessary operations to authenticated/anon.
--   3. Test anonymous access, own-row access, and cross-member denial.
--
-- This migration changes future defaults for objects created by postgres.
-- Supabase-managed objects created by other owners may have separate defaults.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
