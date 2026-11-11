-- Keep test records out of member billing history and paid entitlements.
alter table public.membership_payments
  add column is_test boolean not null default false,
  add column yoco_checkout_id text unique;

alter table public.membership_subscriptions
  drop constraint membership_subscriptions_provider_check,
  add constraint membership_subscriptions_provider_check check (provider in ('payfast', 'yoco'));

-- Match the confirmed price shown in the app before any paid launch.
update public.membership_plans set monthly_amount_cents = 49900
where code = 'premium' and not published and monthly_amount_cents = 69900;

create table public.mzan_yoco_test_webhook_setup (
  singleton boolean primary key check (singleton),
  started_at timestamptz not null default now()
);
alter table public.mzan_yoco_test_webhook_setup enable row level security;
revoke all on public.mzan_yoco_test_webhook_setup from public, anon, authenticated;
grant select, insert, delete on public.mzan_yoco_test_webhook_setup to service_role;

create function public.mzan_yoco_test_signing_secret(p_secret text default null)
returns text
language plpgsql security invoker set search_path = ''
as $$
declare existing text;
begin
  select decrypted_secret into existing from vault.decrypted_secrets
  where name = 'mzan_yoco_test_signing_secret';
  if p_secret is not null and existing is null then
    if left(p_secret, 6) <> 'whsec_' then raise exception 'Invalid signing secret'; end if;
    perform vault.create_secret(p_secret, 'mzan_yoco_test_signing_secret', 'MzanConnect Yoco test webhook');
    return p_secret;
  end if;
  return existing;
end;
$$;

create function public.mzan_record_yoco_test_checkout(p_user uuid, p_plan text, p_amount integer, p_reference text, p_checkout text)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare payment public.membership_payments%rowtype; subscription_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_reference, 0));
  select * into payment from public.membership_payments where merchant_reference = p_reference;
  if found then
    if payment.user_id <> p_user or not payment.is_test or payment.yoco_checkout_id is distinct from p_checkout or payment.amount_cents <> p_amount then
      raise exception 'Checkout reference conflict';
    end if;
    return;
  end if;
  if not exists (select 1 from public.membership_plans where code = p_plan and monthly_amount_cents = p_amount and currency = 'ZAR') then
    raise exception 'Checkout price mismatch';
  end if;
  insert into public.membership_subscriptions (user_id, plan_code, provider, status)
  values (p_user, p_plan, 'yoco', 'pending') returning id into subscription_id;
  insert into public.membership_payments (subscription_id, user_id, merchant_reference, yoco_checkout_id, amount_cents, status, is_test)
  values (subscription_id, p_user, p_reference, p_checkout, p_amount, 'pending', true);
end;
$$;

create function public.mzan_complete_yoco_test_payment(p_checkout text, p_payment text, p_amount integer, p_currency text, p_succeeded boolean)
returns text
language plpgsql security invoker set search_path = ''
as $$
declare payment public.membership_payments%rowtype;
begin
  select * into payment from public.membership_payments
  where yoco_checkout_id = p_checkout and is_test for update;
  if not found then return 'unknown'; end if;
  if payment.amount_cents <> p_amount or payment.currency <> p_currency then return 'mismatch'; end if;
  if payment.status = 'complete' then
    if not p_succeeded or payment.provider_payment_id = p_payment then return 'duplicate'; end if;
    return 'mismatch';
  end if;
  if not p_succeeded then
    update public.membership_payments set status = 'failed' where id = payment.id;
    return 'failed';
  end if;
  update public.membership_payments
  set status = 'complete', provider_payment_id = p_payment, verified_at = now()
  where id = payment.id;
  insert into public.membership_receipts (payment_id, user_id, receipt_number)
  values (payment.id, payment.user_id, 'TEST-' || payment.id::text);
  return 'complete';
end;
$$;

revoke all on function public.mzan_yoco_test_signing_secret(text) from public, anon, authenticated;
revoke all on function public.mzan_record_yoco_test_checkout(uuid,text,integer,text,text) from public, anon, authenticated;
revoke all on function public.mzan_complete_yoco_test_payment(text,text,integer,text,boolean) from public, anon, authenticated;
grant execute on function public.mzan_yoco_test_signing_secret(text) to service_role;
grant execute on function public.mzan_record_yoco_test_checkout(uuid,text,integer,text,text) to service_role;
grant execute on function public.mzan_complete_yoco_test_payment(text,text,integer,text,boolean) to service_role;
