# Razorpay setup

## Environment variables

Configure these values in the local `.env.local` file and in Vercel's project
environment settings. Keep all three values server-side; do not prefix them
with `NEXT_PUBLIC_`.

| Variable | Purpose |
| --- | --- |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID for the selected Test or Live mode |
| `RAZORPAY_KEY_SECRET` | API Key Secret for that Key ID; used only by server routes |
| `RAZORPAY_WEBHOOK_SECRET` | A separate secret created for the webhook endpoint |

Use the Test Mode key ID and secret for local testing and Vercel Preview. Use
Live Mode credentials only in the Vercel Production environment after testing
and explicit approval. Never commit actual credentials. Restart local Next.js
after changing `.env.local`.

The Firebase Admin service-account values are also required for trusted
Firestore reads and writes (the project ID can fall back to
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`):

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

## Configure the Razorpay webhook

In the Razorpay Dashboard, open **Account & Settings → Webhooks**, add the
deployed URL `https://<your-domain>/api/razorpay/webhook`, and set a new webhook
secret. Configure that exact secret as `RAZORPAY_WEBHOOK_SECRET` in the same
Vercel environment as the matching API keys. Subscribe to:

- `payment.captured`
- `payment.failed`
- `order.paid`

Enable automatic payment capture in Razorpay so authorized payments become
captured payments; the site intentionally does not mark merely authorized
payments as paid. Save the webhook and deploy the environment-variable change. For local testing,
use a publicly reachable HTTPS tunnel pointing to the local Next.js server and
configure that tunnel URL in Test Mode. Do not configure production webhooks
with Test Mode secrets or vice versa.

## Payment lifecycle

The authenticated checkout route loads prices, inventory, customer details, and
the selected address from Firestore. It calculates the INR total and reserves
inventory in a Firestore transaction before creating a Razorpay order with the
official Node SDK. The browser receives only the public Key ID and provider
order details.

The current checkout has no customer-facing coupon redemption or tax
configuration. The server uses each product's current Firestore `price` (the
listed/sale price) and preserves the existing delivery rule: ₹99 below a ₹999
subtotal, otherwise free delivery. No browser-supplied discount or total is
accepted.

The browser success callback is not trusted as proof of payment. The verify
route checks the HMAC signature, fetches the order and payment from Razorpay,
and records the order as paid only after Razorpay reports a captured INR payment
matching the stored internal order and amount. The signed webhook route applies
the same checks, stores event IDs for idempotency, and supports payment events
arriving before the browser callback. A canceled checkout releases its stock
reservation only after confirming that Razorpay has no captured or authorized
payment.

Firestore client rules prohibit direct order creation. Order creation,
inventory changes, and online payment status updates must go through the
authenticated server routes.

Deploy the updated `firestore.rules` to the Firebase project as part of the
release; the Admin SDK used by server routes bypasses client rules, while direct
browser-side order creation is intentionally denied.
Existing Razorpay records without a server-written `paymentVerifiedAt` marker
are displayed as Pending until reconciled against the Razorpay Dashboard.

Before switching to Live Mode, complete and record successful Test Mode checks
for successful/failed/canceled payments, invalid signatures, retries, duplicate
callbacks and webhooks, stock contention, and refreshing the success page.

## Test Mode checklist

- Successful capture; order becomes Paid only after server verification.
- Failed payment; order remains unpaid and can be retried.
- Checkout dismissal; order is canceled and its reserved inventory is restored.
- Invalid signature and mismatched provider/internal order IDs are rejected.
- Tampered browser prices and totals do not change the server-calculated amount.
- Repeated verification callbacks and repeated webhook deliveries do not duplicate updates.
- `payment.captured`/`order.paid` arriving before the browser callback still verifies the order.
- Insufficient stock and simultaneous checkout attempts do not reserve stock below zero.
- Refresh/retry after success does not create another order or decrement stock again.
- No order is shown as Paid while Razorpay reports only an authorized or failed payment.
- Verify checkout and success views at mobile and desktop widths.
