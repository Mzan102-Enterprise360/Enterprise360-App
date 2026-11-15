-- Transfer MzanConnect private-report and owner support privileges to its
-- verified reception account. This changes access policies only; no data is moved.
-- The former account retains its ordinary member/own-record access.
ALTER POLICY smme_survey_owner_read ON public.smme_survey_2026_responses
  TO authenticated
  USING ((SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid);

ALTER POLICY support_messages_read_owner ON public.support_messages
  TO authenticated
  USING ((SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid);

ALTER POLICY business_service_requests_owner_read ON public.business_service_requests
  TO authenticated
  USING ((SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid);

ALTER POLICY business_service_requests_owner_update ON public.business_service_requests
  TO authenticated
  USING ((SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid)
  WITH CHECK ((SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid);

ALTER POLICY support_replies_insert_owner ON public.support_replies
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = '820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid
    AND replied_by = (SELECT auth.uid())
  );
