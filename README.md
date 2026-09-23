<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/salestaxcalculatorapi-logo-reversed.svg">
    <img src="./assets/salestaxcalculatorapi-logo.svg" alt="Sales Tax Calculator API" width="520">
  </picture>
</p>

<h1 align="center">Integration examples</h1>

<p align="center">
  Working server-side examples for adding sales tax to checkout and order workflows.
</p>

<p align="center">
  <a href="https://salestaxcalculatorapi.com/docs">Documentation</a> ·
  <a href="https://salestaxcalculatorapi.com/openapi.json">API reference</a> ·
  <a href="https://salestaxcalculatorapi.com/login?mode=signup&redirect=%2Fdashboard%2Fapi-keys">Get an API key</a>
</p>

## Examples

| Example | What it demonstrates |
| --- | --- |
| [TypeScript quickstart](./typescript/quickstart) | Create a sales tax calculation with the official Node.js SDK |
| [Python quickstart](./python/quickstart) | Create a sales tax calculation with the official Python SDK |
| [Stripe custom checkout](./stripe-custom-checkout) | Calculate tax before creating a Stripe Payment Intent |
| [PayPal Orders](./paypal-orders) | Calculate tax before creating a PayPal order |
| [Postman collection](./postman) | Explore the complete v1 resource lifecycle without writing code |

The TypeScript and Python quickstarts use the official SDKs. The Stripe and PayPal examples call the tax API directly so their payment boundaries, request handling, and fail-closed outcome branches remain visible.

## Quick start

Start with the TypeScript example. You need
[Node.js 20 or newer](https://nodejs.org/) and a server-side API key.

```bash
git clone https://github.com/InstaBlick-USA/salestaxcalculatorapi-examples.git
cd salestaxcalculatorapi-examples
cp .env.example .env
npm install
npm run start -w typescript/quickstart
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Replace `stca_replace_me` in `.env`, then open the guide for the example you want to run.

> [!IMPORTANT]
> Keep API and payment-provider secret keys on your server. Never expose them in browser code, mobile applications, commits, logs, or screenshots.

## Integration rules

1. Your server loads trusted product prices and seller details.
2. It creates a calculation with `POST /v1/calculations`.
3. It checks the returned `outcome` before using any amount.
4. Only a determinate result continues to payment; other outcomes stop for review.

The browser supplies customer input, but it never decides the price or tax. Keep
these API details intact when you adapt an example:

- Send money and quantities as decimal strings, such as `"100.00"` and `"1"`.
- Authenticate with `Authorization: Bearer stca_...` from a trusted server.
- Add a unique `Idempotency-Key` to every create request.
- Stop automated checkout for `review_required` and `unsupported` outcomes.
- Store the calculation ID, request ID, outcome, and returned amounts with the order.
- Retry only when the response says it is retryable, and honor `Retry-After`.

See the [integration guide](https://salestaxcalculatorapi.com/docs) for the full request and response contract.

## Before production

- Replace the demo catalog and seller registration with records from your system.
- Persist the payment-to-calculation mapping; payment examples use memory for local development only.
- Add signed payment webhooks before fulfilling orders.
- Test determinate, review, unsupported, declined-payment, duplicate-request, and timeout paths.

## Project scope

This public repository contains integration examples only. The calculation engine
and tax data are not included.

## Support and contributions

If an example fails or its instructions are unclear,
[open an issue](https://github.com/InstaBlick-USA/salestaxcalculatorapi-examples/issues).
For code changes, read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull
request.

Please report vulnerabilities privately using the process in [SECURITY.md](./SECURITY.md).

## License

Example code is available under the [MIT License](./LICENSE). Use of the hosted API remains subject to the [Sales Tax Calculator API terms](https://salestaxcalculatorapi.com/terms).
