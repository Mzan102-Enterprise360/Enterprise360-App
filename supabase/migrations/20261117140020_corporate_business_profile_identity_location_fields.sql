-- Corporate-grade business profile fields. Existing text remains intact:
-- business_name is now shown as Business Trading Name;
-- region and description are retained as legacy data and are never overwritten by these fields.
alter table public.business_profiles
  add column if not exists registered_name text not null default '',
  add column if not exists registration_number text not null default '',
  add column if not exists contact_phone text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists province text not null default '',
  add column if not exists district text not null default '',
  add column if not exists municipality text not null default '';

alter table public.business_profiles
  add constraint business_profiles_registered_name_length_check check (char_length(registered_name) <= 160),
  add constraint business_profiles_registration_number_length_check check (char_length(registration_number) <= 50),
  add constraint business_profiles_contact_phone_length_check check (char_length(contact_phone) <= 40),
  add constraint business_profiles_contact_email_length_check check (char_length(contact_email) <= 160),
  add constraint business_profiles_province_length_check check (char_length(province) <= 90),
  add constraint business_profiles_district_length_check check (char_length(district) <= 120),
  add constraint business_profiles_municipality_length_check check (char_length(municipality) <= 120);
