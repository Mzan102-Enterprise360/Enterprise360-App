-- The member's contact email must match the verified Supabase JWT claim.
alter table public.company_membership_sponsorship_requests
  add column if not exists applicant_email text not null default ''
    check (char_length(applicant_email) <= 160);
grant insert(applicant_email) on public.company_membership_sponsorship_requests to authenticated;
drop policy if exists company_membership_members_submit_only
  on public.company_membership_sponsorship_requests;
create policy company_membership_members_submit_only
on public.company_membership_sponsorship_requests for insert to authenticated
with check (
  (select auth.uid())=user_id
  and status='submitted' and consent_confirmed is true
  and length(btrim(applicant_email)) > 3
  and lower(applicant_email)=lower(coalesce((select auth.jwt())->>'email',''))
);
