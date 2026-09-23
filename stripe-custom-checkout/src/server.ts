import { config } from "dotenv";
import express from "express";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

import { createTaxCalculation, requireCheckoutAddress, toMinorUnits } from "./integration.js";

const exampleRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const repositoryRoot = resolve(exampleRoot, "..");
config({ path: resolve(repositoryRoot, ".env"), quiet: true });

const requiredEnvironment = ["SALESTAX_API_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY"] as const;
for (const name of requiredEnvironment) {
  const value = process.env[name];
  if (!value || value.endsWith("replace_me")) {
    throw new Error(`Set ${name} in the repository's .env file.`);
  }
}
if (!process.env.STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") || !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
  throw new Error("This public example accepts Stripe test keys only.");
}

const CATALOG = {
  "saas-starter": {
    name: "SaaS starter subscription",
    unitAmount: "100.00",
    currency: "CAD",
  },
} as const;

const apiKey = process.env.SALESTAX_API_KEY as string;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY as string;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const taxBaseUrl = (process.env.STCA_API_BASE_URL ?? "https://api.salestaxcalculatorapi.com").replace(/\/+$/, "");
const port = Number(process.env.PORT ?? 4242);
const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.static(resolve(exampleRoot, "public")));

app.get("/api/config", (_request, response) => {
  response.json({ publishableKey });
});

app.post("/api/payment-intents", async (request, response) => {
  try {
    const productId = request.body?.productId;
    const product = CATALOG[productId as keyof typeof CATALOG];
    const quantity = Number(request.body?.quantity);

    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      response.status(400).json({ error: "Choose a valid product and a quantity from 1 to 10." });
      return;
    }

    let address;
    try {
      address = requireCheckoutAddress(request.body?.address);
    } catch (error) {
      response.status(400).json({ error: error instanceof Error ? error.message : "Enter a valid address." });
      return;
    }
    const orderReference = `order-${crypto.randomUUID()}`;
    const calculation = await createTaxCalculation({
      apiKey,
      baseUrl: taxBaseUrl,
      orderReference,
      quantity,
      unitAmount: product.unitAmount,
      address,
    });

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: toMinorUnits(calculation.total),
        currency: calculation.currency.toLowerCase(),
        description: product.name,
        metadata: {
          order_reference: orderReference,
          tax_calculation_id: calculation.id,
          tax_request_id: calculation.request_id,
        },
      },
      { idempotencyKey: `stripe:${orderReference}` },
    );

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret for this PaymentIntent.");
    }

    response.status(201).json({
      clientSecret: paymentIntent.client_secret,
      orderReference,
      calculation: {
        id: calculation.id,
        outcome: calculation.outcome,
        currency: calculation.currency,
        subtotal: calculation.subtotal,
        tax: calculation.tax,
        total: calculation.total,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not be created.";
    response.status(502).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Stripe checkout is running at http://localhost:${port}`);
});
