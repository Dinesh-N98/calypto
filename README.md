This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## OnePay checkout

Checkout posts the cart's product slugs and quantities to `/api/checkout`. The server loads current product names and prices from the database, snapshots the order and required customer details as a pending order, then signs a OnePay redirect-checkout request with the server-only Hash Salt. The customer is redirected to the `redirect_url` returned by OnePay.

OnePay requires a first name, last name, email address, and phone number in E.164 format. The cart collects these fields instead of inventing or relying on incomplete profile data. Existing product prices are USD cents, so this integration sends USD amounts; OnePay's documentation says available currencies depend on merchant-account enablement. Confirm USD acceptance with OnePay before using checkout.

Configure the callback in the OnePay portal's APP section as `https://YOUR_PUBLIC_DOMAIN/api/webhooks/onepay`. The callback is only a notification: the server uses the callback's transaction ID to query OnePay's transaction-status endpoint and verifies the returned transaction ID, amount, currency, and `status` before marking the order paid. The return page also performs this server-side verification and never trusts browser query parameters as proof of payment. Duplicate callbacks update the existing pending order; they do not create orders or order items.

The documented checkout request provides one `transaction_redirect_url`, not separate success and cancellation URLs. It returns customers to the order-status page, which displays only the status confirmed by the server.

Configure the following in `.env.local` for development and in each deployment environment (Preview and Production). `.env.example` contains placeholders only:

```env
APP_BASE_URL="https://YOUR_PUBLIC_DOMAIN"
ONEPAY_APP_ID="..."
ONEPAY_APP_TOKEN="..."
ONEPAY_HASH_SALT="..."
```

Get the App ID, App Token, and Hash Salt from the OnePay merchant dashboard's API Keys section. OnePay documents separate sandbox and live credential pairs. Keep all three values server-side and use the matching pair for each environment. `APP_BASE_URL` must be the public HTTPS origin because OnePay requires an HTTPS transaction return URL; local development therefore needs an HTTPS tunnel. Apply the Prisma migration with `npx prisma migrate deploy` before deploying the new application.

Test with the sandbox credential pair and OnePay's [documented test cards](https://docs.onepay.lk/testing/test-cards) before switching to live credentials. The migration retains historical Stripe orders: their provider is recorded as `STRIPE`, their Stripe session ID remains the provider reference, and their existing USD amounts and paid statuses are preserved.

The documented status API returns a boolean `status` (`true` means paid); it does not document distinct cancellation or failure values. Consequently, an unverified callback or a false status remains pending rather than being mislabeled cancelled or failed. A checkout request explicitly rejected by OnePay is recorded as failed. The OnePay callback documentation does not specify a callback signature or callback secret, so the callback endpoint does not trust callback status fields and only triggers the authenticated status lookup.

Official references: [Payment API](https://docs.onepay.lk/api-documentation/payment-api), [Integration Guide](https://docs.onepay.lk/guide/integration-guide), and [Currencies](https://docs.onepay.lk/api-documentation/currencies).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Authentication environment variables

Add these variables to `.env.local` for local development and to the Vercel project
environment settings for Preview and Production deployments:

```env
DATABASE_URL="your-existing-neon-connection-string"
AUTH_SECRET="generate-a-long-random-secret"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

`AUTH_SECRET` is required. Generate one with `npx auth secret`. The Google variables
are read by the Google provider; Auth.js's equivalent `AUTH_GOOGLE_ID` and
`AUTH_GOOGLE_SECRET` names are also supported. Auth.js v5 infers the application URL
from the request on Vercel, so `AUTH_URL` is optional. If you set it explicitly, use
`http://localhost:3000` locally and your full production origin on Vercel.

Register these Google OAuth redirect URIs in Google Cloud Console:

```text
http://localhost:3000/api/auth/callback/google
https://YOUR-VERCEL-DOMAIN.vercel.app/api/auth/callback/google
```

Replace `YOUR-VERCEL-DOMAIN.vercel.app` with the exact Vercel deployment domain (or
your custom production domain). No Auth.js `Email` provider or email-sending service
is configured; email accounts use bcrypt-hashed passwords through the Credentials
provider.

## Admin role maintenance

Sign up normally before changing an account's role, then run one of these commands
with that account's email address:

```bash
npm run admin:promote -- your-existing-account@example.com
npm run admin:demote -- your-existing-account@example.com
```

The script first prints the database endpoint and database name. Type the printed
endpoint identifier exactly to confirm the target, then review the email and role
change and type `CHANGE` exactly to apply it. Any other response aborts without a
write. Check the printed endpoint carefully before confirming, especially when
using production. After promotion, the user must sign in again for the session's
UI role hint to refresh. The script refuses to demote the last remaining admin.
