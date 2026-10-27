# Checkout and payment architecture handoff

## 1. Current checkout workflow summary

### System overview

This is a Next.js App Router storefront backed by Prisma/PostgreSQL. Checkout is initiated from `/cart` and now supports OnePay hosted checkout alongside PayPal Smart Payment Buttons. Both paths create the local order from server-recalculated catalog prices and reserve stock; browser cart prices are display data only.

New checkouts use OnePay or PayPal. Shared validation, pricing, inventory reservation, and order snapshot creation live in `lib/checkout/order.ts`. PayPal transaction identifiers and webhook deliveries are tracked separately from the order in `PaymentAttempt` and `PaymentWebhookEvent`.

| Area | File | Current responsibility |
|---|---|---|
| Cart route and saved addresses | [`app/(storefront)/cart/page.tsx`](../app/(storefront)/cart/page.tsx) | Loads the signed-in user's addresses and passes checkout/cart state to the client. |
| Cart UI and order summary | [`components/CartPageClient.tsx`](../components/CartPageClient.tsx) | Reads cart items, computes the displayed subtotal from client-held prices, and renders the checkout form. Supports buy-now quantity overrides. |
| Persistent cart state | [`components/CartProvider.tsx`](../components/CartProvider.tsx) | Stores item IDs and display attributes in `localStorage`; exposes add/update/remove/clear operations. |
| Customer/address form and provider selection | [`components/CheckoutForm.tsx`](../components/CheckoutForm.tsx), [`components/CartPageClient.tsx`](../components/CartPageClient.tsx) | Collects customer/delivery fields, offers OnePay and PayPal, optionally saves a new account address, and presents the selected checkout method. PayPal shipping requires an ISO two-letter country code. |
| PayPal Smart Payment Buttons | [`components/PayPalCheckoutButtons.tsx`](../components/PayPalCheckoutButtons.tsx) | Loads the PayPal JS SDK, requests a server-created order, submits approval to the server capture route, and retains the cart on cancellation/errors. |
| Shared order preparation | [`lib/checkout/order.ts`](../lib/checkout/order.ts) | Validates payload, reloads variant/catalog data, calculates authoritative prices, reserves inventory, snapshots customer/shipping details, and creates pending orders/payment attempts transactionally. |
| OnePay and PayPal order creation | [`app/api/checkout/route.ts`](../app/api/checkout/route.ts), [`app/api/checkout/paypal/orders/route.ts`](../app/api/checkout/paypal/orders/route.ts) | Preserves OnePay hosted checkout and initializes PayPal Orders v2 with a local idempotency key and server-computed totals. |
| Server-side PayPal client/capture | [`lib/paypal.ts`](../lib/paypal.ts), [`app/api/checkout/paypal/orders/[paypalOrderId]/capture/route.ts`](../app/api/checkout/paypal/orders/%5BpaypalOrderId%5D/capture/route.ts) | Caches OAuth tokens server-side, uses Orders v2 and idempotency headers, validates capture linkage/amount/currency, and marks payment paid idempotently. |
| OnePay API client and verification | [`lib/onepay.ts`](../lib/onepay.ts) | Reads server-only OnePay credentials, signs the checkout request, requests a hosted checkout link, verifies transaction ID/amount/currency, and conditionally marks an order paid. |
| Browser return/status polling | [`app/(storefront)/checkout/success/page.tsx`](../app/(storefront)/checkout/success/page.tsx), [`app/(storefront)/checkout/cancel/page.tsx`](../app/(storefront)/checkout/cancel/page.tsx), [`components/CheckoutResult.tsx`](../components/CheckoutResult.tsx) | Both pages render the same status component. It queries the server using the opaque order reference, polls pending status, and clears the cart only after status is paid. |
| Status endpoint | [`app/api/checkout/status/route.ts`](../app/api/checkout/status/route.ts) | Finds an order by provider reference, refreshes OnePay server-side, and returns persisted PayPal payment status. |
| OnePay callback | [`app/api/webhooks/onepay/route.ts`](../app/api/webhooks/onepay/route.ts) | Treats callback transaction ID as a lookup hint only; asks OnePay's authenticated status API to verify it before updating the order. |
| PayPal callback | [`app/api/webhooks/paypal/route.ts`](../app/api/webhooks/paypal/route.ts) | Verifies PayPal transmission signatures, deduplicates event IDs, fetches the linked PayPal order, validates a completed capture, and applies an idempotent paid transition. |
| Pricing rules | [`lib/product-pricing.ts`](../lib/product-pricing.ts) | Chooses the applicable variant/product sale price and quantity-based discount used by server-side checkout pricing. |
| Order/payment persistence | [`prisma/schema.prisma`](../prisma/schema.prisma) | Defines provider-neutral `Order`, `PaymentAttempt`, and `PaymentWebhookEvent` models. |
| Existing/new payment migrations | [`prisma/migrations/20260920000000_add_orders/migration.sql`](../prisma/migrations/20260920000000_add_orders/migration.sql), [`prisma/migrations/20261005000000_add_onepay_payments/migration.sql`](../prisma/migrations/20261005000000_add_onepay_payments/migration.sql), [`prisma/migrations/20261012100000_add_paypal_payment_attempts/migration.sql`](../prisma/migrations/20261012100000_add_paypal_payment_attempts/migration.sql) | Creates initial order storage, migrates to generic provider fields, then adds PayPal attempts/webhook deduplication and shipping snapshots. |
| Payment configuration | [`.env.example`](../.env.example) | Documents OnePay credentials and PayPal public client ID, server client credentials, environment, and webhook ID. |
| Integration behavior notes | [`README.md`](../README.md) | Documents OnePay callback verification, supported return behavior, and current limitations. |
| Order history and fulfillment consumers | [`app/(storefront)/account/orders/page.tsx`](../app/%28storefront%29/account/orders/page.tsx), [`app/admin/orders/page.tsx`](../app/admin/orders/page.tsx), [`app/api/admin/orders/[orderId]/fulfillment/route.ts`](../app/api/admin/orders/%5BorderId%5D/fulfillment/route.ts), [`app/api/account/orders/[orderId]/invoice/route.ts`](../app/api/account/orders/%5BorderId%5D/invoice/route.ts) | Read order/provider-reference/status data, render customer/admin views and invoices, and update fulfillment without changing payment status. |

### Implemented transaction lifecycle

1. The buyer manages cart state in the browser. At checkout the client sends variant IDs and quantities, customer fields, address fields, and a save-address flag. Client-supplied names, prices, and totals are not used to price the order.
2. The selected provider endpoint validates the cart, customer, and address. `POST /api/checkout` additionally validates `APP_BASE_URL` and OnePay configuration. The PayPal order endpoint requires a same-origin request and UUID `Idempotency-Key`, and a two-letter ISO country code.
3. Both routes use `lib/checkout/order.ts` to coalesce duplicate variant IDs, reload matching variants and product discount data from PostgreSQL, reject unavailable/ambiguous legacy items, calculate current unit prices through `calculateUnitPriceCents`, and validate the resulting USD-cent total.
4. A database transaction atomically decrements each variant's stock only when sufficient inventory remains, optionally saves the submitted address to the signed-in user's address book, and creates an `Order` with the selected provider, a random `CAL-...` `providerReference`, `status=pending`, customer/shipping snapshots, total, and item snapshots. PayPal also creates a `PaymentAttempt` with request hash, idempotency key, capture request ID, and expiry.
5. After the database transaction commits, OnePay signs and submits a hosted-checkout request, stores its transaction ID in `providerTransactionId`, validates that the redirect URL is HTTPS, and returns the URL. PayPal obtains/caches its server OAuth token, creates an Orders v2 order with server-computed amount and a `PayPal-Request-Id`, saves the provider order ID on the attempt, and returns that ID to the SDK.
6. The provider return and OnePay webhook are notifications, not proof of payment. The status endpoint and webhook both ask OnePay to verify the transaction. `lib/onepay.ts` requires the provider response to confirm the transaction ID, amount, currency, and paid boolean before a compare-and-set changes `pending` to `paid`.
7. The return page polls the status endpoint every five seconds (up to twelve checks), presents pending/paid/error feedback, and clears local cart state only after the server reports `paid`.
8. Fulfillment status is stored separately from the payment status. Admin fulfillment updates and shipping-email processing do not update payment status.

### Failure, cancellation, and persistence behavior

- If stock is insufficient, checkout returns HTTP 409 and the inventory/order transaction rolls back.
- If either provider explicitly rejects initialization with a 4xx, the local payment attempt/order is marked failed as applicable and reserved stock is restored.
- Other initialization errors, including network/provider uncertainty, leave the order pending and stock decremented. This avoids declaring a potentially-created provider payment failed; there is no expiry/reconciliation job in the current repository to release stale reservations.
- The documented OnePay status result is a boolean. A false or unverifiable result remains pending; it does not identify a separate cancelled or failed payment.
- PayPal's browser cancel callback keeps the cart and does not mark the order cancelled or release stock. There is no separate PayPal cancel endpoint or scheduled stale-attempt reconciler yet.
- Delivery details are stored as an order-time shipping snapshot. The account address book is updated only when a signed-in buyer explicitly elects to save an address.
- `PaymentAttempt` stores PayPal order/capture IDs, request/capture idempotency keys, amount/currency, status, request hash, and expiry/paid timestamps. `PaymentWebhookEvent` stores a payload hash and deduplication/processing status, not the full raw webhook payload. Existing generic order transaction fields remain for OnePay and historical data.
- The status `GET` is not session-authenticated; it relies on the random UUID-based order reference and returns only payment status. Preserve that reference's entropy if it remains the guest lookup token, and protect provider status refreshes from abusive polling.
- The OnePay webhook has no documented signature input, so the endpoint deliberately does not trust callback status fields and instead verifies server-to-server. The callback can be replayed safely for the existing pending order, with a compare-and-set paid transition.

## 2. Step-by-step payment lifecycle

### Current OnePay flow

```text
Buyer
  -> /cart (CartProvider localStorage + order summary)
  -> CheckoutForm submits variant IDs, quantities, customer, delivery address
  -> POST /api/checkout
       -> validate payload and OnePay configuration
       -> lib/checkout/order.ts: load catalog and calculate authoritative prices/discounts
       -> DB transaction: reserve variant stock + snapshot address + create pending Order/OrderItems
       -> OnePay create checkout link
       -> save providerTransactionId; validate HTTPS redirect URL
  -> redirect buyer to OnePay-hosted checkout
  -> OnePay returns buyer to /checkout/success?order=CAL-...
       -> CheckoutResult -> GET /api/checkout/status?reference=CAL-...
       -> server queries OnePay status and checks transaction ID + amount + currency
       -> pending -> paid via compare-and-set; paid clears browser cart
  -> OnePay webhook POST /api/webhooks/onepay
       -> locate existing pending order by transaction ID
       -> independently verify with OnePay; never trust callback status
       -> pending -> paid via same idempotent status refresh

Explicit OnePay 4xx during initialization -> failed + inventory restored
Uncertain initialization / unpaid / unverifiable status -> pending + no current expiry release
```

### Implemented PayPal flow

```text
Buyer
  -> /cart selects PayPal; completes customer + delivery fields
  -> PayPal Smart Buttons createOrder callback
  -> POST /api/checkout/paypal/orders (same-origin, validated cart/customer/address)
       -> lib/checkout/order.ts prices catalog and reserves stock atomically
       -> create local pending Order + PaymentAttempt (including request hash/idempotency state)
       -> server obtains/caches PayPal OAuth access token
       -> POST PayPal Orders API v2 (intent=CAPTURE, server total/currency,
          internal order reference in invoice_id/custom_id, stable PayPal-Request-Id)
       -> persist PayPal order ID and return only its public ID to the browser
  -> PayPal buyer approval in SDK
  -> onApprove callback -> POST /api/checkout/paypal/orders/{paypalOrderId}/capture
       -> authorize local attempt and verify PayPal order is the one linked to it
       -> server calls PayPal Orders API v2 capture with idempotency key
       -> validate COMPLETED capture, amount, currency, and internal order linkage
       -> persist capture ID + paid state once; return verified result
  -> CheckoutResult / order confirmation polls local status; clear cart only when paid

PayPal webhook -> POST /api/webhooks/paypal
  -> verify PayPal webhook signature with the configured webhook ID
  -> dedupe event ID; validate event/resource links against stored attempt/order
  -> CHECKOUT.ORDER.APPROVED: acknowledge/deduplicate; does not directly change payment state
  -> PAYMENT.CAPTURE.COMPLETED: verify capture ID, order, amount and currency;
     idempotently mark paid (same transition as synchronous capture response)
  -> denied/refund/void events: record and reconcile without overwriting a later valid state

Buyer cancels before approval -> keep cart; show cancellation and safe retry option.
Do not mark an order cancelled or release stock from browser onCancel alone.
Expire/reconcile stale pending attempts server-side before releasing reserved stock.
```

## 3. PayPal architecture, implementation, and remaining hardening

The core dual-provider flow below is implemented in this repository. The detailed requirements remain useful as review criteria; items not currently implemented are called out under the security/operational checklist and exact-change tables.

### Provider coexistence

1. OnePay remains available alongside PayPal; existing payment records are retained.
2. The `PaymentProvider` enum includes `PAYPAL`. Each order has one selected provider; shared pricing, validation, snapshots, and reservation are in `lib/checkout/order.ts`.
3. Provider-specific calls remain separate in `lib/onepay.ts` and `lib/paypal.ts`; PayPal uses dedicated create/capture endpoints.
4. The OnePay endpoint contract is preserved. PayPal browser errors do not silently submit a charge through another provider.

### Backend and payment API work

Recommended App Router endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/checkout/paypal/orders` | Validate the submitted checkout details; compute prices and total on the server; create the pending internal order/attempt; create a PayPal Orders v2 order with `intent: CAPTURE`; persist its PayPal order ID; return that ID to the SDK. |
| `POST /api/checkout/paypal/orders/[paypalOrderId]/capture` | Require a matching local pending attempt; perform capture server-to-server; validate the complete response before recording paid/capture ID; be idempotent for repeated browser requests. |
| `POST /api/webhooks/paypal` | Read the exact webhook request body and PayPal transmission headers, verify with PayPal's signature-verification API, dedupe and record the event, then reconcile the related order/attempt. |
| `GET /api/checkout/status?reference=...` | Extend the current status service to return a provider-neutral order payment state; query/reconcile provider as appropriate without exposing customer or payment secrets. |
| Optional `POST /api/checkout/paypal/orders/[paypalOrderId]/cancel` | Record buyer intent and reconcile the provider state; do not treat the client cancellation callback itself as authoritative evidence that capture did not occur. |

PayPal implementation requirements:

- Use PayPal Orders API v2 on the server with `intent=CAPTURE` and a server-computed purchase amount/currency. Store the internal opaque order reference as the PayPal `invoice_id` and/or `custom_id`; use it to cross-check webhook/capture linkage.
- Choose one canonical currency at checkout (currently OnePay is configured as USD and prices are USD cents). Convert cents to a fixed two-decimal major-unit string at the PayPal boundary, and reject unsupported currencies/configuration rather than silently changing currency. Verify merchant account, product, and buyer-market eligibility before launch.
- Implement OAuth client-credentials token acquisition in a server-only PayPal helper. Cache an access token only in server memory until shortly before expiry, refresh safely, set bounded network timeouts, and do not log tokens, client secrets, full payment payloads, or sensitive payer data.
- Send `PayPal-Request-Id` for create and capture requests. Derive and persist stable IDs for each logical operation so browser retries, concurrent captures, and provider timeouts do not create duplicate orders/captures. Use database uniqueness and compare-and-set transitions as a second line of defense.
- Browser `onApprove` must call the capture route; it must never be trusted to mark an order paid. The backend should fetch/capture and verify PayPal's response, checking local linkage, status, exact amount/currency, and capture ID.
- Treat `CHECKOUT.ORDER.APPROVED` as approval only. It may initiate/reconcile server-side capture if the chosen flow requires it, but does not directly set the order to paid. `PAYMENT.CAPTURE.COMPLETED` is the asynchronous completion signal and must follow the same validated, idempotent paid transition as the capture API.
- Validate webhook authenticity using PayPal's webhook signature verification endpoint, passing the configured webhook ID and the raw transmission headers/body. Do not replace this with an assumed local HMAC algorithm. Persist a unique event ID before/with processing; repeated valid deliveries must be acknowledged without applying a second state transition.
- For failure, denied, voided, and refund events, persist/reconcile provider state and define an explicit allowed transition table. Never downgrade a paid/captured order because a delayed approval/failure event arrived later.
- A browser cancel callback is UX information, not payment authority. Keep the cart and allow a safe retry; set local cancellation/release stock only after server-side reconciliation proves no capture is in flight/completed. Add a scheduled expiry/reconciliation mechanism for old pending attempts before releasing inventory.
- Add rate limits and request-size limits to payment-creation/capture endpoints and validate same-origin/CSRF protections consistent with the app's route patterns. Scope order status/capture access to the authenticated order owner where possible; for guest checkout, use an unguessable high-entropy checkout token rather than relying on an exposed sequential identifier.

### Frontend experience

- The implemented Smart Buttons load the official PayPal JS SDK directly, send validated customer/address data through the create endpoint, and call the server capture endpoint from `onApprove`. Only the public client ID is exposed.
- The UI retains OnePay selection, shows SDK/processing/error feedback, retains cart contents on cancellation/errors, and clears the cart only after the status API reports paid.
- Future UI work: surface provider-specific approval/capture statuses and explicitly reconcile stale attempts after ambiguous timeouts.

### Data model and migration

The implemented schema uses an additive payment-attempt model rather than placing provider-specific IDs on `Order`. Existing `Order.providerTransactionId` remains available for OnePay and historical records.

```prisma
model PaymentAttempt {
  id                    String          @id @default(cuid())
  orderId               String
  provider              PaymentProvider
  status                String          @default("pending")
  amountCents           Int
  currency              String
  idempotencyKey        String          @unique
  requestHash           String
  captureRequestId      String          @unique
  providerOrderId       String?         @unique
  providerCaptureId     String?         @unique
  providerTransactionId String?         @unique
  metadata              Json?
  expiresAt             DateTime?
  paidAt                DateTime?
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@index([orderId, status])
  @@index([provider, status, expiresAt])
}

model PaymentWebhookEvent {
  id              String          @id @default(cuid())
  provider        PaymentProvider
  providerEventId String
  eventType       String
  receivedAt      DateTime        @default(now())
  processedAt     DateTime?
  status          String          @default("received")
  payloadHash     String?

  @@unique([provider, providerEventId])
  @@index([provider, eventType, receivedAt])
}
```

The schema is in [`prisma/schema.prisma`](../prisma/schema.prisma) and its additive migration is [`prisma/migrations/20261012100000_add_paypal_payment_attempts/migration.sql`](../prisma/migrations/20261012100000_add_paypal_payment_attempts/migration.sql). Raw webhook payloads are not retained; only a payload hash and processing metadata are stored. `Order.providerReference` remains the customer-facing/internal order reference and `providerTransactionId` remains available for OnePay/legacy records.

This schema should be accompanied by:

- Order status remains compatible (`pending`, `paid`, `failed`, `cancelled`) and separate from fulfillment status. The current webhook handler processes completed captures; a broader approval/denial/refund transition matrix remains future work.
- Shipping address snapshots and database uniqueness for PayPal order/capture IDs, attempt idempotency keys, and webhook event IDs are implemented.
- Stock is decremented at local order creation and safe restoration is used for definitive initialization failures. Expiry/reconciliation for abandoned or uncertain pending attempts remains unimplemented.

### Security and operational checklist

- **Implemented:** PayPal secrets remain server-only, the SDK receives the public client ID, checkout/capture reject cross-origin requests, PayPal API calls use server OAuth and request timeouts, request idempotency is persisted, and webhook signatures are verified before event processing.
- **Implemented:** Server-side validation/pricing and atomic inventory reservation; capture/webhook reconciliation checks local order linkage, capture status, exact amount/currency, and uses transactional compare-and-set updates. Webhook event IDs are deduplicated.
- **Guest access boundary:** Signed-in capture checks order ownership. Guest capture relies on the high-entropy PayPal order ID; status relies on the random `CAL-...` order reference. A separate guest checkout token has not been added.
- **Not implemented:** Payment endpoint rate limiting and explicit payload size limits on checkout creation; only the webhook body has a size cap.
- **Not implemented:** A stale-attempt expiry/reconciliation worker, approval/denial/refund webhook state transitions, and production alerting. `CHECKOUT.ORDER.APPROVED` is verified, recorded, and acknowledged without changing payment state; `PAYMENT.CAPTURE.COMPLETED` is reconciled and applied.
- Before production, configure distinct sandbox/live credentials and webhook registrations; test duplicate create/capture requests, webhook replay/out-of-order delivery, abandoned approval, capture timeout with successful provider capture, amount/currency mismatch, invalid signature, insufficient stock, and OnePay fallback.

## 4. Exact code changes made

### Files created

| File | Change |
|---|---|
| `lib/paypal.ts` | Server-only OAuth token retrieval/caching, PayPal API base URL selection, Orders v2 create/capture/get calls, request timeouts, idempotency headers, and typed provider-response validation. |
| `lib/checkout/order.ts` | Extracts canonical cart validation, catalog pricing, inventory reservation, order/item/address snapshot creation, and safe inventory release helpers. |
| `app/api/checkout/paypal/orders/route.ts` | `POST` creates a local pending order/attempt and its linked PayPal Orders v2 order; return the SDK order ID only. |
| `app/api/checkout/paypal/orders/[paypalOrderId]/capture/route.ts` | `POST` authorizes the local attempt, captures server-to-server, verifies response linkage/amount/currency, and performs an idempotent paid transition. |
| `app/api/webhooks/paypal/route.ts` | `POST` verifies PayPal webhook signatures, deduplicates event IDs, reconciles completed captures, and acknowledges other valid event types without changing payment state. |
| `prisma/migrations/20261012100000_add_paypal_payment_attempts/migration.sql` | Adds `PAYPAL`, `PaymentAttempt`, webhook deduplication storage, required indexes/unique constraints, and order shipping snapshots. |
| `components/PayPalCheckoutButtons.tsx` | Loads the PayPal SDK Smart Buttons and implements server-backed create, capture, cancel, loading, and error callbacks. |

An expiry/reconciliation task still needs to be deployed (for example a protected scheduled route invoked by the hosting platform, or an existing trusted scheduler) before relying on stock reservations for abandoned PayPal orders. No scheduler is currently present in the inspected application.

### Existing files updated

| File | Implemented change |
|---|---|
| `prisma/schema.prisma` | Adds `PAYPAL`, `PaymentAttempt`, `PaymentWebhookEvent`, order shipping snapshots, idempotency/capture IDs, expiry/paid tracking, indexes, and relations while retaining existing providers/fields. |
| `components/CartPageClient.tsx` | Adds payment-method selection and mounts Smart Buttons while retaining OnePay checkout. |
| `components/CheckoutForm.tsx` | Shares validated customer/address fields between providers, validates the PayPal country code, and provides provider-specific checkout actions. |
| `app/api/checkout/route.ts` | Uses shared order preparation while preserving the OnePay response and verification behavior. |
| `app/api/checkout/status/route.ts` | Returns persisted PayPal state and continues server-side OnePay status refresh. |
| `components/CheckoutResult.tsx` | Uses provider-neutral status wording and clears the cart only after confirmed payment. |
| `lib/onepay.ts` | Existing verification is retained; the route now uses the shared checkout preparation helper. |
| `.env.example` | Adds placeholders for PayPal public client ID, server client credentials, environment, and webhook ID; secrets remain unprefixed. |
| `README.md` | Documents provider configuration, sandbox/live setup, webhook registration, migration, currency, and checkout behavior. |
| Checkout/payment tests (not yet added) | Cover price authority, create/capture idempotency, capture mismatch rejection, webhook signature verification/deduplication/order, cancel/expiry stock handling, and OnePay regression behavior. No test script/framework is declared in the current `package.json`. |

### Recommended next steps before production

1. Confirm PayPal merchant eligibility, settlement currency, guest checkout token/ownership policy, and stock reservation duration.
2. Add the missing expiry/reconciliation worker and explicit approved/denied/refund event state transitions; register sandbox webhook subscriptions and production alerts.
3. Add checkout and payment integration tests; cover OnePay regression, idempotency, webhook replay, capture timeouts, mismatched totals, and stock release safety.
4. Add request rate limiting and a bounded body size for checkout creation; consider adding a dedicated guest checkout token.
5. Apply the migration in a development database, complete PayPal sandbox testing, and then roll out behind a feature flag or environment-level enablement.
