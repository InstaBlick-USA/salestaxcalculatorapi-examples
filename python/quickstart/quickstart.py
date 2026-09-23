from __future__ import annotations

import json
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

from dotenv import load_dotenv
from salestax import SalesTaxClient


ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

API_KEY = os.getenv("SALESTAX_API_KEY")
BASE_URL = os.getenv(
    "STCA_API_BASE_URL", "https://api.salestaxcalculatorapi.com"
).rstrip("/")

if not API_KEY or API_KEY == "stca_replace_me":
    raise RuntimeError("Set SALESTAX_API_KEY in the repository's .env file.")


def main() -> None:
    order_reference = f"quickstart-{uuid.uuid4()}"

    with SalesTaxClient(api_key=API_KEY, base_url=BASE_URL) as client:
        calculation = client.calculations.create(
            reference=order_reference,
            transaction_date=datetime.now(UTC).date().isoformat(),
            currency="CAD",
            tax_behavior="exclusive",
            billing_event="subscription_start",
            seller={
                "country": "CA",
                "channel_role": "direct_legal_supplier",
                "registrations": [
                    {
                        "country": "CA",
                        "state": "ON",
                        "type": "gst_hst",
                        "effective_from": "2026-01-01",
                    }
                ],
            },
            customer={
                "type": "consumer",
                "address": {
                    "country": "CA",
                    "state": "ON",
                    "postal_code": "M5V 2T6",
                },
            },
            lines=[
                {
                    "reference": "subscription",
                    "amount": "100.00",
                    "quantity": "1",
                    "tax_code": "saas",
                }
            ],
            idempotency_key=f"quickstart:{order_reference}",
        )

    if calculation["outcome"] in {"review_required", "unsupported"}:
        raise RuntimeError(
            f"Calculation {calculation['id']} cannot continue automatically: "
            f"{calculation['explanation']}"
        )

    print(json.dumps(calculation, indent=2))


if __name__ == "__main__":
    main()
