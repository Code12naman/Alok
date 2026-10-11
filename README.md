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

## WhatsApp support configuration

Before deploying, set `NEXT_PUBLIC_WHATSAPP_NUMBER` in `Alok/.env.local` for local development and in the deployment platform's project environment variables for production. The value must contain only international-format digits, including the country code, without a leading `+`, spaces, or hyphens (for example, `919876543210`). This is a public business contact number, not a private credential. WhatsApp actions remain disabled with a configuration message until a valid 8-15 digit value is provided.

The return and exchange page intentionally leaves the request window, shipping responsibility, refund timing, and exchange rules identified as configurable terms. Confirm those business policies before publishing final customer-facing terms.

## Secure checkout server configuration

Checkout order creation and stock decrementing run through the server-only
`/api/checkout/create-order` route. Configure these server environment variables
in local `.env.local` and in the deployment platform; never use `NEXT_PUBLIC_`
for the private values:

```text
FIREBASE_ADMIN_PROJECT_ID=your-firebase-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account-client-email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The Firebase service account must have access to the project's Firestore
database. Do not commit a service-account JSON file, private key, or these
values. Deploy the application only after the server credentials are configured.
