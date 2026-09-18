This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
