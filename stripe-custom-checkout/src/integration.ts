export type CustomerAddress = {
  country: "CA";
  state: string;
  postalCode: string;
};

export type Calculation = {
  id: string;
  outcome: string;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  explanation: string;
  request_id: string;
};

type ApiProblem = {
  title?: string;
  detail?: string;
  request_id?: string;
};

export function toMinorUnits(value: string): number {
  const match = /^(0|[1-9]\d*)\.(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Expected a non-negative amount with two decimal places, received ${value}.`);
  }

  const minorUnits = Number(match[1]) * 100 + Number(match[2]);
  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error("The payment amount exceeds JavaScript's safe integer range.");
  }
  return minorUnits;
}

function fromMinorUnits(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

export function requireCheckoutAddress(value: unknown): CustomerAddress {
  if (!value || typeof value !== "object") {
    throw new Error("A customer address is required.");
  }

  const address = value as Record<string, unknown>;
  const state = typeof address.state === "string" ? address.state.trim().toUpperCase() : "";
  const postalCode = typeof address.postalCode === "string" ? address.postalCode.trim().toUpperCase() : "";

  if (address.country !== "CA" || !/^[A-Z]{2}$/.test(state) || postalCode.length < 3 || postalCode.length > 12) {
    throw new Error("Enter a valid Canadian province and postal code.");
  }

  return { country: "CA", state, postalCode };
}

export async function createTaxCalculation(input: {
  apiKey: string;
  baseUrl: string;
  orderReference: string;
  quantity: number;
  unitAmount: string;
  address: CustomerAddress;
}): Promise<Calculation> {
  const lineAmount = fromMinorUnits(toMinorUnits(input.unitAmount) * input.quantity);
  const response = await fetch(`${input.baseUrl}/v1/calculations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `stripe:${input.orderReference}`,
    },
    body: JSON.stringify({
      reference: input.orderReference,
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
          country: input.address.country,
          state: input.address.state,
          postal_code: input.address.postalCode,
        },
      },
      lines: [
        {
          reference: "saas-subscription",
          amount: lineAmount,
          quantity: String(input.quantity),
          tax_code: "saas",
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const body = (await response.json()) as Calculation | ApiProblem;
  if (!response.ok) {
    const problem = body as ApiProblem;
    const requestId = problem.request_id ? ` Request ID: ${problem.request_id}.` : "";
    throw new Error(`${problem.detail ?? problem.title ?? "Tax calculation failed."}${requestId}`);
  }

  const calculation = body as Calculation;
  if (calculation.outcome === "review_required" || calculation.outcome === "unsupported") {
    throw new Error(`Checkout needs review: ${calculation.explanation}`);
  }
  return calculation;
}
