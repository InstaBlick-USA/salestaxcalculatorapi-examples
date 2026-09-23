import { config } from "dotenv";
import express from "express";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createTaxCalculation, requireCheckoutAddress } from "./integration.js";

const exampleRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const repositoryRoot = resolve(exampleRoot, "..");
config({ path: resolve(repositoryRoot, ".env"), quiet: true });

const requiredEnvironment = ["SALESTAX_API_KEY", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"] as const;
for (const name of requiredEnvironment) {
  const value = process.env[name];
  if (!value || value === "replace_me" || value.endsWith("replace_me")) {
    throw new Error(`Set ${name} in the repository's .env file.`);
  }
}

const environment = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";
if (environment !== "sandbox") {
  throw new Error("This public example runs against the PayPal sandbox only.");
}

const CATALOG = {
  "saas-starter": {
    name: "SaaS starter subscription",
    sku: "SAAS-STARTER",
    unitAmount: "100.00",
    currency: "CAD",
  },
} as const;

const paypalBaseUrl = "https://api-m.sandbox.paypal.com";
const apiKey = process.env.SALESTAX_API_KEY as string;
const paypalClientId = process.env.PAYPAL_CLIENT_ID as string;
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET as string;
const taxBaseUrl = (process.env.STCA_API_BASE_URL ?? "https://api.salestaxcalculatorapi.com").replace(/\/+$/, "");
const port = Number(process.env.PORT ?? 8888);
const app = express();
const createdOrders = new Map<string, { orderReference: string; calculationId: string }>();

let accessToken: { value: string; expiresAt: number } | undefined;

app.use(express.json({ limit: "16kb" }));
app.use(express.static(resolve(exampleRoot, "public")));

async function readPayPalResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const details = Array.isArray(body.details) ? body.details[0] as Record<string, unknown> | undefined : undefined;
    throw new Error(String(details?.description ?? body.message ?? `PayPal returned HTTP ${response.status}.`));
  }
  return body;
}

async function getPayPalAccessToken(): Promise<string> {
  if (accessToken && accessToken.expiresAt > Date.now() + 60_000) return accessToken.value;

  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  const body = await readPayPalResponse(response);
  const value = body.access_token;
  const expiresIn = body.expires_in;
  if (typeof value !== "string" || typeof expiresIn !== "number") {
    throw new Error("PayPal did not return a valid access token.");
  }

  accessToken = { value, expiresAt: Date.now() + expiresIn * 1_000 };
  return value;
}

app.get("/api/config", (_request, response) => {
  response.json({ clientId: paypalClientId, currency: "CAD" });
});

app.post("/api/orders", async (request, response) => {
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
    const token = await getPayPalAccessToken();

    const paypalResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": orderReference,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: orderReference,
            custom_id: calculation.id,
            invoice_id: orderReference,
            description: product.name,
            amount: {
              currency_code: calculation.currency,
              value: calculation.total,
              breakdown: {
                item_total: { currency_code: calculation.currency, value: calculation.subtotal },
                tax_total: { currency_code: calculation.currency, value: calculation.tax },
              },
            },
            items: [
              {
                name: product.name,
                sku: product.sku,
                quantity: String(quantity),
                category: "DIGITAL_GOODS",
                unit_amount: { currency_code: product.currency, value: product.unitAmount },
              },
            ],
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
            },
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const order = await readPayPalResponse(paypalResponse);
    if (typeof order.id !== "string") throw new Error("PayPal did not return an order ID.");
    createdOrders.set(order.id, { orderReference, calculationId: calculation.id });

    response.status(201).json({
      id: order.id,
      status: order.status,
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
    const message = error instanceof Error ? error.message : "PayPal order could not be created.";
    response.status(502).json({ error: message });
  }
});

app.post("/api/orders/:orderId/capture", async (request, response) => {
  try {
    const orderId = request.params.orderId;
    const localOrder = createdOrders.get(orderId);
    if (!localOrder || !/^[A-Z0-9]+$/.test(orderId)) {
      response.status(404).json({ error: "This demo process does not recognize that PayPal order." });
      return;
    }

    const token = await getPayPalAccessToken();
    const paypalResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture-${localOrder.orderReference}`,
        Prefer: "return=representation",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const capture = await readPayPalResponse(paypalResponse);
    if (capture.status === "COMPLETED") createdOrders.delete(orderId);
    response.status(paypalResponse.status).json(capture);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal order could not be captured.";
    response.status(502).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`PayPal checkout is running at http://localhost:${port}`);
});
