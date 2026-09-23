# Stripe custom checkout

A complete local checkout that calculates tax on your server and then creates a Stripe PaymentIntent for the returned total. The browser renders Stripe's Payment Element and never receives either secret key.

The sample accepts Stripe test keys only, preventing an accidental live charge while you explore the flow.

## What it demonstrates

1. The browser submits a product ID, quantity, and customer address.
2. The server loads the trusted catalog price and seller registration.
3. Sales Tax Calculator API returns the tax outcome and final total.
4. The server stops on `review_required` or `unsupported`.
5. A Stripe PaymentIntent is created for the returned total in the currency's smallest unit.
6. The calculation ID is saved in Stripe metadata for reconciliation.

## Run it

Add sandbox credentials to the root `.env`:

```dotenv
SALESTAX_API_KEY=stca_replace_me
STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
STRIPE_SECRET_KEY=sk_test_replace_me
```

Then run:

```bash
npm install
npm run dev -w stripe-custom-checkout
```

Open [http://localhost:4242](http://localhost:4242). Use a [Stripe test payment method](https://docs.stripe.com/testing) in sandbox mode.

## Adapt it

- Replace `CATALOG` and `SELLER` in [`src/server.ts`](./src/server.ts) with records loaded from your database.
- Extend [`toMinorUnits`](./src/integration.ts) before accepting currencies that do not use two decimal places.
- Persist the order, calculation, and PaymentIntent mapping before returning a client secret.
- Add a verified Stripe webhook and fulfill only from a successful server-side payment event.
- Recalculate when a customer changes an address, product, discount, or shipping choice.

Stripe recommends Checkout Sessions for most integrations. This lower-level PaymentIntent example is intentionally for teams that own their tax and checkout state and need a custom payment flow.
