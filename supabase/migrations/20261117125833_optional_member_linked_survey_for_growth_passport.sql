-- Growth Passport: survey responses remain anonymous by default.
-- Linking is optional and explicitly accepted at the time of survey submission.
alter table public.smme_survey_2026_responses
  add column if not exists member_user_id uuid references auth.users(id) on delete set null;

create index if not exists smme_survey_member_user_recent_idx
  on public.smme_survey_2026_responses(member_user_id,submitted_at desc)
  where member_user_id is not null;

drop policy if exists smme_survey_public_insert_only on public.smme_survey_2026_responses;
create policy smme_survey_public_insert_only
on public.smme_survey_2026_responses for insert to anon,authenticated
with check (
  consent_confirmed is true
  and (member_user_id is null or ((select auth.uid()) is not null and member_user_id=(select auth.uid())))
);

create policy smme_survey_member_read_own_linked_responses
on public.smme_survey_2026_responses for select to authenticated
using (member_user_id=(select auth.uid()));
