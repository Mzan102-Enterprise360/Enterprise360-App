ALTER POLICY support_messages_insert_own ON public.support_messages
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'mzanconnect_role') = 'owner'
    OR EXISTS (
      SELECT 1 FROM public.founding_memberships fm
      WHERE fm.user_id = (SELECT auth.uid()) AND fm.pilot_status = 'active'
    )
  )
);