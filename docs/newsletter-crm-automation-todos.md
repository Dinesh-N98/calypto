# Newsletter discount CRM and checkout automation TODOs

## Scope

This document records the recommended implementation work for integrating `CREW-*` newsletter discount codes with the CRM, customer accounts, checkout, orders, and redemption lifecycle. It complements the current manual inquiry flow.

## Current implementation boundary

- Subscribers are stored in `NewsletterSubscription`, separate from CRM `Lead` records.
- Newsletter confirmation creates or preserves the subscriber's discount code, but it does not create a lead.
- A lead is created only when a customer submits `/api/contact`, including a valid or invalid code snapshot.
- Cross-email use is hard-blocked by the contact inquiry API and manual redemption API.
- `/admin/newsletter-discounts` allows staff to look up and manually mark codes redeemed.
- `/admin/crm/leads` displays the submitted code and code snapshot fields in the lead detail drawer.
- Redemption is not currently triggered automatically by checkout, payment, or order completion.

## TODOs

### Phase 1: Stable data relationships

- [ ] Add a canonical customer identity relation between newsletter subscriptions, users/customers, leads, and orders.
- [ ] Add foreign-key or external identity fields that connect a lead to the subscriber and customer records when identities match.
- [ ] Add an order ID, customer ID, checkout session ID, and payment provider reference to redemption records.
- [ ] Add `issuedAt`, optional `expiresAt`, and coupon lifecycle timestamps if a future expiration policy is introduced.
- [ ] Add database indexes for subscriber email, lead email, discount code, redemption status, and order reference searches.
- [ ] Add constraints preventing a subscription from having multiple active redemption records.

### Phase 2: Authoritative coupon service

- [ ] Create a server-side coupon service that owns validation, reservation, capture, release, and lookup operations.
- [ ] Keep coupon validation server-authoritative; never trust browser-supplied totals or coupon validity.
- [ ] Validate code format and existence.
- [ ] Verify normalized customer email matches the newsletter subscriber email.
- [ ] Reject already-redeemed, ineligible, expired, inactive, and unknown codes consistently.
- [ ] Support first-order eligibility by checking completed paid orders for the customer or subscriber email.
- [ ] Recalculate the 15% discount from the server-authoritative product subtotal.
- [ ] Explicitly exclude shipping, tax, and ineligible products/categories according to the configured promotion policy.
- [ ] Apply minimum-order and category rules in the coupon service only if those terms are added to the promotion policy.

### Phase 3: Checkout reservation lifecycle

- [ ] Add coupon code and normalized customer email fields to the checkout payload.
- [ ] Validate coupon eligibility before creating an order or starting provider checkout.
- [ ] Reserve the coupon during checkout creation with the coupon ID, customer identity, cart/order reference, and reservation expiry.
- [ ] Store the applied discount snapshot on the order, including code, rate, discounted subtotal, and applied amount.
- [ ] Make coupon reservation operations idempotent by order or checkout identifier.
- [ ] Release the reservation when checkout is cancelled, abandoned, expires, or fails.
- [ ] Prevent concurrent checkout attempts from redeeming the same coupon.
- [ ] Add atomic database updates so coupon capture and successful paid-order creation cannot become inconsistent.
- [ ] Reconcile provider/webhook completion events with reservation capture rather than relying on browser redirects.

### Phase 4: Automatic redemption and invalidation

- [ ] Create a redemption only after payment is verified and the order becomes paid/confirmed.
- [ ] Link redemption to the paid order record and customer identity.
- [ ] Make redemption and webhook handling idempotent so duplicate events do not create duplicate records.
- [ ] Reject coupon reuse even if a second order is created concurrently.
- [ ] Block ordinary coupon reuse across all cart and checkout entry points.
- [ ] Define and implement refund behavior: retain redeemed status for a completed-and-refunded first order, restore the coupon for a cancelled/unpaid order, or document another policy consistently.
- [ ] Add administrative controls for reversing, restoring, or correcting a redemption with an audit actor and reason.

### Phase 5: CRM synchronization

- [ ] Create a subscriber-to-lead sync policy instead of relying on ad hoc lead creation from successful inquiries.
- [ ] Optionally create/update a CRM lead when a subscriber confirms, while preserving subscriber and lead identities.
- [ ] Record CRM activities or timeline events for subscriber confirmed, code issued, code applied, checkout reserved, payment succeeded, code redeemed, refunded, or cancelled.
- [ ] Add lead fields or relations for subscriber status, issued coupon, redemption status, redeemed order, redemption timestamp, and customer/order links.
- [ ] Extend CRM search to include discount code, subscriber email, lookup status, redemption status, customer, and order reference.
- [ ] Store linked identities rather than duplicating raw email and code fields where a stable relationship is possible.
- [ ] Decompose synchronous notification delivery from lead/order creation so provider failures are visible but do not block successful transactions.

### Phase 6: Admin experience

- [ ] Upgrade the newsletter discount manager with customer email search, order search, redemption state, issued date, confirmed date, and CRM/lead links.
- [ ] Add filtering for valid, redeemed, mismatched, expired, ineligible, and unknown codes.
- [ ] Show the associated lead, customer account, order, redeeming admin, reason, and redemption timestamp.
- [ ] Require order/payment confirmation before destructive or final manual redemption.
- [ ] Preserve manual redemption as a fallback for inquiry orders, but label it clearly as manually verified.
- [ ] Add staff override permissions and authorization audit logs for exceptional coupon corrections.
- [ ] Prevent manual redemption of mismatched email addresses unless an explicitly authorized override workflow is introduced.

### Phase 7: Email and customer experience

- [ ] Continue to exclude coupon codes from the initial confirmation email and include them only in the welcome email after confirmation.
- [ ] Include the coupon terms, email binding, single-use restriction, subtotal scope, and manual-inquiry fallback in every coupon message.
- [ ] Once automated checkout exists, add a cart/checkout entry field and return clear inline validation errors.
- [ ] Send redemption and order-confirmation events through a transactional email service tied to the paid order.

### Phase 8: Testing and observability

- [ ] Add unit tests for format, email normalization, subscriber binding, first-order eligibility, subtotal calculations, and redemption races.
- [ ] Add integration tests covering checkout reservation, successful payment capture, duplicate webhook delivery, cancellation, abandonment, and refund behavior.
- [ ] Add CRM tests for subscriber-to-lead linkage, lead search, activity creation, and order-link navigation.
- [ ] Add admin route authorization, mismatched-email rejection, concurrent redemption, and audit-record tests.
- [ ] Add metrics for issuance, lookup, mismatch, reservation, capture, release, refund restoration, and manual redemption counts.
- [ ] Log coupon lifecycle events without exposing full customer emails or unnecessary credential/provider details.
- [ ] Add alerts for coupon/service failure spikes, abandoned reservations, webhook-processing failures, and database constraint violations.

## Target data model additions

Recommended models or relationships for the automated system:

```text
NewsletterSubscription
  - customer/user relation
  - issued-at timestamp
  - optional expiration timestamp

CouponReservation
  - coupon/subscription relation
  - customer/user relation
  - checkout/session/order relation
  - status: RESERVED | CAPTURED | RELEASED | EXPIRED
  - reservedAt, expiresAt, capturedAt, releasedAt

NewsletterDiscountRedemption
  - customer/order relation
  - payment/provider reference
  - redemption source: AUTOMATED | MANUAL
  - redeeming user for manual redemptions
  - reversal fields and audit reason

Lead
  - subscriber/customer/order relations
  - direct link to the associated coupon reservation/redemption
```

## Definition of done

Automated coupon handling is complete when all validation and redemption decisions are made server-side, coupon eligibility is enforced against a verified customer/subscriber identity, redemption is atomic with successful paid orders, duplicate and concurrent attempts cannot create a second redemption, CRM records link to the order lifecycle, and administrators retain an auditable manual fallback for inquiry-only orders.
