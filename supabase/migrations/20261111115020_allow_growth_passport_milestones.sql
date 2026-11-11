-- Keep existing compliance keys and allow the account's Growth Passport milestones.
alter table public.compliance_items
  drop constraint compliance_items_item_key_check,
  add constraint compliance_items_item_key_check
    check (item_key in ('c0', 'c1', 'c2', 'c3', 'c4', 'g0', 'g1', 'g2', 'g3', 'g4'));
