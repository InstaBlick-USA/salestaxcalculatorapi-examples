# PayPal Orders

A PayPal JavaScript SDK v6 checkout backed by the Orders v2 API. Tax is calculated on the server before the PayPal order is created, and the payment amount comes only from trusted server-side data.

The sample is locked to PayPal sandbox, preventing an accidental live capture while you explore the flow.

## What it demonstrates

1. Check PayPal eligibility with the JavaScript SDK v6.
2. Send only a product ID, quantity, and address from the browser.
3. Calculate tax from the server-owned catalog and seller facts.
4. Stop checkout on `review_required` or `unsupported`.
5. Create a PayPal order with item and tax breakdowns that equal the calculated total.
6. Capture the approved order on the server.

## Run it

Create a PayPal sandbox app, then add these values to the root `.env`:

```dotenv
STCA_API_KEY=stca_replace_me
PAYPAL_CLIENT_ID=replace_me
PAYPAL_CLIENT_SECRET=replace_me
PAYPAL_ENVIRONMENT=sandbox
```

Install and start the example:

```bash
npm install
npm run dev -w paypal-orders
```

Open [http://localhost:8888](http://localhost:8888) and pay with a PayPal sandbox personal account.

## Adapt it

- Replace `CATALOG` in [`src/server.ts`](./src/server.ts) and the sample seller registration in [`src/integration.ts`](./src/integration.ts).
- Store order ownership and the calculation mapping in your database. The in-memory map is intentionally limited to one local process.
- Verify order amount, currency, merchant, status, and ownership again before fulfillment.
- Add PayPal webhooks for durable payment state changes and verify their signatures.
- Recalculate after any address, product, quantity, shipping, or discount change.

The browser receives the PayPal client ID, which is designed to be public. The PayPal client secret and Sales Tax Calculator API key remain on the server.
