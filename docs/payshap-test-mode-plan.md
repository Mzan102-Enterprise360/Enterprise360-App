# MzanConnect PayShap payment verification — TEST MODE ONLY

Status: design / not deployed / no live charges.

## Constraints
- Do not publish payment instructions, personal ShapID, phone number, or account number.
- The personal Capitec account is linked to PayShap Main Account, but permission to receive company membership revenue is unverified.
- Keep the seven free founding members free. Do not change existing auth, profiles, or navigation.
- PayShap is a bank transfer method; it is not an automated recurring billing integration.
- Never treat a screenshot or customer-submitted success flag as proof of payment.

## Test workflow
1. Authenticated member chooses an approved, published membership plan; server computes the amount (ZAR cents).
2. Backend generates a cryptographically unpredictable unique reference and a pending payment record owned by the authenticated member.
3. In test mode show a clearly marked simulated payment instruction, never real bank details.
4. Member can submit a claimed payment, but this only changes status to awaiting_review; it cannot activate access.
5. Authorized administrator independently checks incoming bank transactions: exact reference, amount, receiving account, date, and duplicate use.
6. Only an administrator-controlled server operation may mark a payment verified and grant the matching membership period; log verifier, timestamp, transaction identifier, and decision.
7. Reject mismatched, reused, expired, refunded or unconfirmed payments. Provide a reconciliation and dispute trail.
8. Ensure RLS: member reads own payment records only; member cannot set verified status, verified_at, subscription status, or administrator audit fields.
9. Test with synthetic members and synthetic bank events: valid, missing, duplicate, wrong amount, wrong recipient, tampered request, unauthorized verifier.
10. Production requires explicit approval of business-use account terms, receiving details, membership pricing, operational reconciliation, and separate deployment approval.

## Existing database
Existing tables include membership_plans, membership_subscriptions, membership_payments, and founding_memberships. Inspect existing constraints and policies before any migration; do not overwrite them.

## Release gate
No live payment UI or bank details should be displayed until all security tests and banking eligibility checks pass.
