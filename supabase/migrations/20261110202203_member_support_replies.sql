CREATE TABLE public.support_replies (
  request_id bigint PRIMARY KEY REFERENCES public.support_messages(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  replied_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_replies FROM anon, authenticated;
GRANT SELECT ON public.support_replies TO authenticated;
GRANT INSERT (request_id, message) ON public.support_replies TO authenticated;

CREATE POLICY support_messages_read_owner ON public.support_messages
FOR SELECT TO authenticated
USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'mzanconnect_role') = 'owner');

CREATE POLICY support_replies_read_participant ON public.support_replies
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.support_messages request WHERE request.id = request_id
));

CREATE POLICY support_replies_insert_owner ON public.support_replies
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.jwt() -> 'app_metadata' ->> 'mzanconnect_role') = 'owner'
  AND replied_by = (SELECT auth.uid())
);
