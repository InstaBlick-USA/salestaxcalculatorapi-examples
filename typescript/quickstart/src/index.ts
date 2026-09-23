import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SalesTaxClient } from "salestax-node";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(projectRoot, ".env"), quiet: true });

const apiKey = process.env.SALESTAX_API_KEY;
const baseUrl = (process.env.STCA_API_BASE_URL ?? "https://api.salestaxcalculatorapi.com").replace(/\/+$/, "");

if (!apiKey || apiKey === "stca_replace_me") {
  throw new Error("Set SALESTAX_API_KEY in the repository's .env file.");
}

const client = new SalesTaxClient({ apiKey, baseUrl });
const orderReference = `quickstart-${crypto.randomUUID()}`;

const calculation = await client.calculations.create(
  {
    reference: orderReference,
    transaction_date: new Date().toISOString().slice(0, 10),
    currency: "CAD",
    tax_behavior: "exclusive",
    billing_event: "subscription_start",
    seller: {
      country: "CA",
      channel_role: "direct_legal_supplier",
      registrations: [
        {
          country: "CA",
          state: "ON",
          type: "gst_hst",
          effective_from: "2026-01-01",
        },
      ],
    },
    customer: {
      type: "consumer",
      address: {
        country: "CA",
        state: "ON",
        postal_code: "M5V 2T6",
      },
    },
    lines: [
      {
        reference: "subscription",
        amount: "100.00",
        quantity: "1",
        tax_code: "saas",
      },
    ],
  },
  { idempotencyKey: `quickstart:${orderReference}` },
);

if (calculation.outcome === "review_required" || calculation.outcome === "unsupported") {
  throw new Error(`Calculation ${calculation.id} cannot continue automatically: ${calculation.explanation}`);
}

console.log(JSON.stringify(calculation, null, 2));
