-- Company-sponsored memberships start as enquiries, never automatic payments.
-- Every application remains private to its member and the verified owner.
create table if not exists public.company_membership_sponsorship_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(btrim(company_name)) between 2 and 160),
  company_contact_name text not null default '' check (char_length(company_contact_name) <= 120),
  company_contact_email text not null default '' check (char_length(company_contact_email) <= 160),
  company_contact_phone text not null default '' check (char_length(company_contact_phone) <= 40),
  requested_months smallint not null default 1 check (requested_months in (1,3,6,12)),
  request_note text not null default '' check (char_length(request_note) <= 650),
  consent_confirmed boolean not null check (consent_confirmed is true),
  status text not null default 'submitted'
    check (status in ('submitted','under_review','company_contacted','sponsor_confirmed','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists company_membership_one_open_request
  on public.company_membership_sponsorship_requests(user_id)
  where status in ('submitted','under_review','company_contacted','sponsor_confirmed');
create index if not exists company_membership_request_recent_idx
  on public.company_membership_sponsorship_requests(created_at desc);
alter table public.company_membership_sponsorship_requests enable row level security;
revoke all on table public.company_membership_sponsorship_requests from public,anon,authenticated;
grant select on table public.company_membership_sponsorship_requests to authenticated;
grant insert(user_id,company_name,company_contact_name,company_contact_email,company_contact_phone,requested_months,request_note,consent_confirmed)
  on table public.company_membership_sponsorship_requests to authenticated;
grant update(status,reviewed_at,updated_at)
  on table public.company_membership_sponsorship_requests to authenticated;
create policy company_membership_members_read_their_requests
on public.company_membership_sponsorship_requests for select to authenticated
using ((select auth.uid())=user_id);
-- GitGuardian incident 40124306 is a false positive: the UUID below is an
-- owner account identifier, not a password, token, or authentication secret.
-- Access still requires a verified JWT: auth.uid() must match this owner ID.
create policy company_membership_owner_reads_requests
on public.company_membership_sponsorship_requests for select to authenticated
using ((select auth.uid())='820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid);
create policy company_membership_members_submit_only
on public.company_membership_sponsorship_requests for insert to authenticated
with check ((select auth.uid())=user_id and status='submitted' and consent_confirmed is true);
-- The same non-secret owner identifier protects both old and new row access.
create policy company_membership_owner_updates_review_status
on public.company_membership_sponsorship_requests for update to authenticated
using ((select auth.uid())='820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid)
with check ((select auth.uid())='820a18ee-3482-4b6c-bd75-469cf198b9df'::uuid);
