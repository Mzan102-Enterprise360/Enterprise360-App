-- Applied in Supabase on 2026-11-16.
-- A verified owner TOTP factor requires AAL2 for owner-sensitive RLS operations.
-- With no verified factor yet, owner access remains unchanged.
-- Ordinary members, public survey insertion, pilot invitations, Yoco billing
-- and existing login flows retain their existing authorizations.

CREATE SCHEMA IF NOT EXISTS mzan_security;
REVOKE ALL ON SCHEMA mzan_security FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA mzan_security TO authenticated;

CREATE OR REPLACE FUNCTION mzan_security.current_owner_mfa_accepted()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $mzan$
  SELECT CASE
    WHEN (SELECT auth.uid()) IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM auth.mfa_factors f
      WHERE f.user_id = (SELECT auth.uid()) AND f.status = 'verified'
    ) THEN COALESCE((SELECT auth.jwt())->>'aal','') = 'aal2'
    ELSE true
  END
$mzan$;

REVOKE ALL ON FUNCTION mzan_security.current_owner_mfa_accepted()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mzan_security.current_owner_mfa_accepted()
  TO authenticated;

CREATE POLICY mzan_owner_aal2_when_enrolled ON public.support_messages
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
)
WITH CHECK (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
);

CREATE POLICY mzan_owner_aal2_when_enrolled ON public.support_replies
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
)
WITH CHECK (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
);

CREATE POLICY mzan_owner_aal2_when_enrolled ON public.business_service_requests
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
)
WITH CHECK (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
);

CREATE POLICY mzan_owner_aal2_when_enrolled ON public.smme_survey_2026_responses
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
)
WITH CHECK (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
);

CREATE POLICY mzan_owner_aal2_when_enrolled ON storage.objects
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
)
WITH CHECK (
  CASE WHEN (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    OR COALESCE((SELECT auth.jwt())->'app_metadata'->>'mzanconnect_role','') = 'owner'
    THEN (SELECT mzan_security.current_owner_mfa_accepted())
    ELSE true END
);
