# TypeScript quickstart

Send one server-side sales tax calculation using native `fetch` and a small typed response boundary.

## Run it

From the repository root:

```bash
cp .env.example .env
npm install
npm run start -w typescript/quickstart
```

On PowerShell, use `Copy-Item .env.example .env` for the copy command.

The script loads the root `.env`, creates a unique order reference and idempotency key, and prints the complete calculation. Change `calculationRequest` in [`src/index.ts`](./src/index.ts) to match your seller, registration, customer, and product facts.

This sample uses an Ontario SaaS subscription to mirror the public API documentation. Do not ship the sample registration or product classification unchanged in your application.
