-- Donation requests reuse the private, RLS-protected business service inbox.
-- This migration does not allow anonymous submissions or public reading.
-- Members can insert their own approved columns; only the owner can review all.
alter table public.business_service_requests
  drop constraint if exists business_service_requests_service_type_check;

alter table public.business_service_requests
  add constraint business_service_requests_service_type_check
  check (service_type in (
    'cipc','csd','sars','cidb','business_plan','business_profile','other',
    'donation_request'
  ));
