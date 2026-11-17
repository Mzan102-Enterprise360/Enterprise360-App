# MzanConnect Paystack recurring billing — test readiness

**Banking decision (17 November 2026):** Keep the currently configured Standard Bank business payout account. Do not change banking details or introduce Capitec settlement details in this work.

**Scope:** R199.00 monthly MzanConnect membership, separate quoted service payments. Paystack is the intended subscription provider, with Google Pay available for eligible cards; Yoco remains in place for existing non-recurring checkout until replacement is tested and separately approved. Direct EFT requests were staged on another branch and are not merged here.

## Work performed

- Added a **read-only, owner-only, test-mode Supabase Edge Function** (`mzan-paystack-test-readiness`).
- The function validates the published R199 ZAR plan and checks that Paystack test API credentials, test plan code and signing secret are configured securely.
- When test credentials are present, it **reads** the matching plan from Paystack to confirm R199 ZAR/month. It never starts transactions, stores customer data, calls subscription create/disable endpoints or changes payout bank accounts.
- The function does **not** make Paystack recurring subscriptions active in the member app. The current Yoco checkout stays unchanged.
- No payment credentials are stored in GitHub.

## Remaining owner-only setup (use the provider dashboards, not a public chat)

1. In [Paystack Dashboard](https://dashboard.paystack.com), use **Test Mode**. Keep the existing settlement bank account. Confirm the test plan named *MzanConnect Monthly Membership*, **R199**, interval **monthly**. Copy only the plan code into the appropriate secure Supabase secret.
2. From Paystack **Developers → API configuration**, collect the test secret API key and generate a webhook signing secret for test events. Do **not** paste secrets into GitHub or ChatGPT.
3. In the Supabase project dashboard, configure function environment secrets named `PAYSTACK_TEST_SECRET_KEY`, `PAYSTACK_TEST_PLAN_CODE`, and `PAYSTACK_TEST_WEBHOOK_SECRET`. Test keys only; no live keys.
4. From an authenticated owner session on the official MzanConnect domain, call the test-readiness function with the Supabase user JWT to confirm the server checks. Never publish raw readiness output with secret data (this endpoint returns only booleans).

## Still required before actual recurring billing

- Implement secure, owner-reviewed server-only checkout initialization and a subscription-specific reconciliation store (not in this function).
- Verify raw Paystack webhook signatures using their current timestamped HMAC-SHA512 scheme. Never activate a membership based on a redirect, an unverified screenshot or test data.
- Idempotently handle initial charge, renewals, failed invoices and cancellations; avoid duplicate billing and subscription creation. Apply RLS and trusted server-only write protections.
- Provide explicit subscriber consent, price/interval disclosure, next renewal date, cancellation management and receipts.
- Test subscribed/owner/founding members, Google Pay eligibility, failures and duplicate callbacks.
- Obtain owner approval before introducing live Paystack billing or changing the current checkout.

## Source references

- https://paystack.com/docs/payments/subscriptions/
- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/api/plan/
- https://supabase.com/docs/guides/functions
