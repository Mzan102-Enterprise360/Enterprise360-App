-- MzanConnect production security hardening, applied in Supabase on 2026-11-16.
-- Preserve all existing row-level policies, founder codes, member data,
-- published R199 plan, and Yoco payment processing.

-- TRUNCATE bypasses row-level security; client roles must never hold it.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- Anonymous visitors need published plan prices, never member billing records.
REVOKE ALL PRIVILEGES ON TABLE
  public.founding_memberships,
  public.membership_payments,
  public.membership_subscriptions
  FROM anon;

-- Only server-side trusted operations may change prices and memberships.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.founding_memberships
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.membership_plans
  FROM anon, authenticated;

-- Members submit and read their own support messages; no client edits/deletion.
REVOKE DELETE, UPDATE ON TABLE public.support_messages FROM authenticated;
