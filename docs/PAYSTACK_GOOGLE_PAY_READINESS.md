# Paystack + Google Pay: recurring-membership readiness (TEST MODE ONLY)

**Status (15 November 2026): PLANNING — NOT CONNECTED, NO RECURRING CHARGES ENABLED.**
This is a non-operative checklist. It does not configure a merchant account, add credentials, change the checkout, or enable billing. Only the business owner can approve any later live activation.

## Product decision

- MzanConnect monthly membership: **R199.00 ZAR**; future Paystack recurring plan amount **19900** South African cents; interval **monthly**.
- First card authorisation may use **Google Pay in Paystack-hosted Checkout** on eligible cards/devices, with recurring card-authorisation charges thereafter. Do **not** embed a separate unsupported Google Pay button.
- **Yoco remains the existing provider for one-off purchases/business services**, and existing one-month Yoco billing continues unchanged during the transition.
- Seven invitation-only founding pilot memberships remain free. Do not create recurring subscriptions or migrate/payment-enrol founders, owner, or existing users without explicit user opt-in.
- Only one public R199 plan. Existing Growth and Premium plans remain unpublished.
- This web payment plan is separate from Google **Play Billing** policy checks required if selling digital functionality in a Play-distributed Android app.

## Account setup (owner action; do not post confidential documents here)

1. Open https://paystack.com/signup and register a **South African Registered Business** account in the **exact legal name on CIPC documents** (verify before submission). Account begins in **Test Mode**.
2. Prepare company CIPC registration certificate and enterprise number, a **corporate bank confirmation letter dated within the last six months**, details of at least one director, and requested beneficial owner / address evidence. Complete only on the official secure Paystack dashboard.
3. Enable **two-factor authentication** for each Paystack administrator; use unique, private accounts and least-privilege team permissions. Keep company login and recovery email under owner control.
4. In test settings, check that Cards and Google Pay are supported and visible on **Paystack Checkout**; Google Pay is offered only to eligible cards/devices. Do not switch MzanConnect live checkout to Paystack yet.
5. Before any future live processing, confirm business verification status, payout bank match, South African fees, refund/cancellation terms, customer support contact, privacy terms, and any Google Play Billing obligations.

## Security architecture (implementation gate; not implemented)

- Static GitHub Pages may use only safe public configuration. **Never commit sk_test_, sk_live_, whsec_ or any service_role key**, or send these over chat or email. Store payment API secrets only in **Supabase Edge Function secrets**.
- Client sends an authenticated request for the R199 plan to a server-side Edge Function. The server reads authoritative plan amount, ZAR currency, user ID, founding/owner exclusions, and duplicate subscription state from the database; never trust a client-supplied amount or membership entitlement.
- Use **Paystack-hosted checkout**, not custom card entry; never collect or store raw cards, CVVs, Google Pay tokens, or full payment credentials in MzanConnect.
- Use a dedicated Paystack webhook endpoint with request-signature verification on the **raw** body. Prefer Paystack's current `Paystack-Signature` timestamped HMAC-SHA512 format with a server-side `whsec_` signing secret; support the older `x-paystack-signature` only if necessary and per Paystack's official docs. Reject invalid/expired signatures; use idempotent, unique provider event/transaction identifiers to prevent double fulfilment.
- Activate/extend membership only after verified, matching **successful payment** for the correct user/plan/amount/currency/provider. Never activate solely from browser redirect, a pending callback, a client claim, or test events.
- Keep provider subscriptions and payments **separate** from Yoco records. Existing `public.membership_subscriptions.provider` constraint currently permits only `payfast` and `yoco`; database expansion for `paystack`, event idempotency, webhook states and renewal handling must be an explicit reviewed migration before integration.
- Apply owner/record-scoped RLS and restrict writes to verified server-side flows; preserve founders. Keep owner/admin access in trusted server-side `app_metadata`, not user-editable metadata.
- Subscription dashboard must show **R199 per month; renews automatically; next billing date; how to cancel; email receipt** before a member opts in. Require an affirmative enrolment/mandate. An unsuccessful recurring charge must not create a receipt or extend paid access.
- Handle Paystack events including `subscription.create`, `charge.success`, `invoice.payment_failed`, `invoice.update`, `subscription.not_renew`, and `subscription.disable`. Paystack subscriptions do not automatically retry failed charges: specify a safe past-due/notification policy.
- Implement customer-initiated cancellation, accessible receipts, refund support, replay prevention, event logging without personal card data, and isolated test vs live credentials/endpoints. Test callback and event delivery before launch.
- Retain existing Yoco checkout, member support, compliance, bookkeeping, printing, survey, login and home navigation unchanged.

## Tests required before requesting production activation

- Test-only plan at **19900 ZAR cents**; first Paystack Checkout flow with Google Pay when available and a regular card fallback.
- Test webhooks with valid / forged / stale signatures; duplicated and reordered `charge.success` events; failed invoice; cancel and subscription disable; owner/founding pilot exemption.
- Verify subscriber sees receipt and expiration/next renewal only after server verification; non-subscriber/anonymous users cannot read someone else's payment record.
- Verify Yoco one-offs remain unchanged; no live Paystack key or active billing; inspect GitHub commit and browser network/console.
- Owner must explicitly approve **separate** live readiness review and enablement only after all tests and Paystack compliance are complete.

## Current repository audit

On 15 Nov 2026, `billing.html` offers an existing Yoco **one-month, non-recurring** R199 payment. Supabase `membership_plans` publishes Starter/MzanConnect Membership at `19900 ZAR`; unpublished Growth/Premium plans still exist. No Paystack Edge Function or Paystack browser integration was identified. This checklist does not change those facts.

## Primary references

- South African registered-business documents: https://support.paystack.com/en/articles/2124418
- Test-mode onboarding: https://support.paystack.com/en/articles/2125634
- Google Pay and authorisation: https://support.paystack.com/en/articles/10458690
- Google Pay activation in Checkout: https://support.paystack.com/en/articles/10458754
- Recurring subscription API: https://paystack.com/docs/payments/subscriptions/
- Webhook signatures and delivery: https://paystack.com/docs/payments/webhooks/
- Plan API (ZAR amount in cents): https://paystack.com/docs/api/plan/
- South Africa fees: https://paystack.com/za/pricing
- Google Play Billing policy: https://support.google.com/googleplay/android-developer/answer/9858738
