import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(projectRoot, ".env"), quiet: true });

const apiKey = process.env.STCA_API_KEY;
const baseUrl = (process.env.STCA_API_BASE_URL ?? "https://api.salestaxcalculatorapi.com").replace(/\/+$/, "");

if (!apiKey || apiKey === "stca_replace_me") {
  throw new Error("Set STCA_API_KEY in the repository's .env file.");
}

type CalculationOutcome =
  | "calculated"
  | "not_taxable"
  | "not_obligated"
  | "reverse_charge_or_self_assess"
  | "exempt"
  | "no_general_tax"
  | "review_required"
  | "unsupported";

type Calculation = {
  id: string;
  object: "calculation";
  reference?: string;
  outcome: CalculationOutcome;
  currency: string;
  subtotal: string;
  taxable_amount: string;
  tax: string;
  total: string;
  explanation: string;
  request_id: string;
  created_at: string;
};

type ApiProblem = {
  title?: string;
  detail?: string;
  code?: string;
  request_id?: string;
  retryable?: boolean;
};

const orderReference = `quickstart-${crypto.randomUUID()}`;
const calculationRequest = {
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
};

const response = await fetch(`${baseUrl}/v1/calculations`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": `quickstart:${orderReference}`,
  },
  body: JSON.stringify(calculationRequest),
  signal: AbortSignal.timeout(10_000),
});

const body = (await response.json()) as Calculation | ApiProblem;

if (!response.ok) {
  const problem = body as ApiProblem;
  const requestId = problem.request_id ? ` Request ID: ${problem.request_id}.` : "";
  throw new Error(`${problem.detail ?? problem.title ?? `Request failed with HTTP ${response.status}.`}${requestId}`);
}

const calculation = body as Calculation;

if (calculation.outcome === "review_required" || calculation.outcome === "unsupported") {
  throw new Error(`Calculation ${calculation.id} cannot continue automatically: ${calculation.explanation}`);
}

console.log(JSON.stringify(calculation, null, 2));
