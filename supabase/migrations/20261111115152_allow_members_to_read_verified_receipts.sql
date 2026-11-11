-- Receipt reads must use the completed status enforced by membership_payments.
alter policy "Members read own verified receipts" on public.membership_receipts
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.membership_payments as payment
    where payment.id = membership_receipts.payment_id
      and payment.user_id = (select auth.uid())
      and payment.status = 'complete'
      and payment.verified_at is not null
  )
);
