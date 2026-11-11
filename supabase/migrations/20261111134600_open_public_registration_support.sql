-- Public members may send their own requests; owner-only replies remain unchanged.
alter policy support_messages_insert_own on public.support_messages to authenticated with check ((select auth.uid()) = user_id);
