create table public.mzan_yoco_live_webhook_setup (
 singleton boolean primary key default true check(singleton)
);
alter table public.mzan_yoco_live_webhook_setup enable row level security;
revoke all on public.mzan_yoco_live_webhook_setup from public,anon,authenticated;
grant all on public.mzan_yoco_live_webhook_setup to service_role;

create function public.mzan_yoco_live_signing_secret(p_secret text default null)
returns text language plpgsql set search_path='' as $$
declare existing text;
begin
 select decrypted_secret into existing from vault.decrypted_secrets where name='mzan_yoco_live_signing_secret';
 if p_secret is not null and existing is null then
  if left(p_secret,6)<>'whsec_' then raise exception 'Invalid signing secret'; end if;
  perform vault.create_secret(p_secret,'mzan_yoco_live_signing_secret','MzanConnect Yoco live webhook');
  return p_secret;
 end if;
 return existing;
end;
$$;
revoke all on function public.mzan_yoco_live_signing_secret(text) from public,anon,authenticated;
grant execute on function public.mzan_yoco_live_signing_secret(text) to service_role;

create function public.mzan_record_yoco_live_checkout(p_user uuid,p_plan text,p_amount integer,p_reference text,p_checkout text)
returns void language plpgsql set search_path='' as $$
declare payment public.membership_payments%rowtype; sub_id uuid;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_reference,0));
 select * into payment from public.membership_payments where merchant_reference=p_reference;
 if found then
  if payment.user_id<>p_user or payment.is_test or payment.yoco_checkout_id is distinct from p_checkout or payment.amount_cents<>p_amount
   or not exists(select 1 from public.membership_subscriptions where id=payment.subscription_id and plan_code=p_plan)
  then raise exception 'Checkout reference conflict'; end if;
  return;
 end if;
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null)
  or exists(select 1 from auth.users where id=p_user and raw_app_meta_data->>'mzanconnect_role'='owner')
  or exists(select 1 from public.founding_memberships where user_id=p_user and pilot_status='active')
 then raise exception 'Account does not require a paid checkout'; end if;
 if not exists(select 1 from public.membership_plans where code=p_plan and monthly_amount_cents=p_amount and currency='ZAR' and published)
 then raise exception 'Checkout price mismatch'; end if;
 insert into public.membership_subscriptions(user_id,plan_code,provider,status)
 values(p_user,p_plan,'yoco','pending') returning id into sub_id;
 insert into public.membership_payments(subscription_id,user_id,merchant_reference,yoco_checkout_id,amount_cents,status,is_test)
 values(sub_id,p_user,p_reference,p_checkout,p_amount,'pending',false);
end;
$$;
revoke all on function public.mzan_record_yoco_live_checkout(uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.mzan_record_yoco_live_checkout(uuid,text,integer,text,text) to service_role;

create function public.mzan_complete_yoco_live_payment(p_checkout text,p_payment text,p_amount integer,p_currency text,p_succeeded boolean)
returns text language plpgsql set search_path='' as $$
declare payment public.membership_payments%rowtype; period_start timestamptz;
begin
 select * into payment from public.membership_payments where yoco_checkout_id=p_checkout and not is_test for update;
 if not found then return 'unknown'; end if;
 if payment.amount_cents<>p_amount or payment.currency<>p_currency then return 'mismatch'; end if;
 if payment.status='complete' then
  if not p_succeeded or payment.provider_payment_id=p_payment then return 'duplicate'; end if;
  return 'mismatch';
 end if;
 if not p_succeeded then
  update public.membership_payments set status='failed' where id=payment.id;
  return 'failed';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(payment.user_id::text,1));
 select greatest(now(),coalesce(max(current_period_end),now())) into period_start
 from public.membership_subscriptions where user_id=payment.user_id and status='active';
 update public.membership_payments set status='complete',provider_payment_id=p_payment,verified_at=now() where id=payment.id;
 insert into public.membership_receipts(payment_id,user_id,receipt_number)
 values(payment.id,payment.user_id,'MZAN-'||payment.id::text);
 update public.membership_subscriptions set status='expired',updated_at=now()
 where user_id=payment.user_id and status='active';
 update public.membership_subscriptions set status='active',started_at=now(),current_period_end=period_start+interval '1 month',updated_at=now()
 where id=payment.subscription_id;
 return 'complete';
end;
$$;
revoke all on function public.mzan_complete_yoco_live_payment(text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.mzan_complete_yoco_live_payment(text,text,integer,text,boolean) to service_role;
