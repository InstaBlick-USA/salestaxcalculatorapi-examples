from __future__ import annotations

import json
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

API_KEY = os.getenv("STCA_API_KEY")
BASE_URL = os.getenv(
    "STCA_API_BASE_URL", "https://api.salestaxcalculatorapi.com"
).rstrip("/")

if not API_KEY or API_KEY == "stca_replace_me":
    raise RuntimeError("Set STCA_API_KEY in the repository's .env file.")


def create_calculation(payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
    response = requests.post(
        f"{BASE_URL}/v1/calculations",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "Idempotency-Key": idempotency_key,
        },
        json=payload,
        timeout=(3.05, 10),
    )

    try:
        body = response.json()
    except requests.exceptions.JSONDecodeError as error:
        raise RuntimeError(f"API returned HTTP {response.status_code} without JSON.") from error

    if not response.ok:
        detail = body.get("detail") or body.get("title") or "The API request failed."
        request_id = body.get("request_id")
        suffix = f" Request ID: {request_id}." if request_id else ""
        raise RuntimeError(f"{detail}{suffix}")

    if body["outcome"] in {"review_required", "unsupported"}:
        raise RuntimeError(
            f"Calculation {body['id']} cannot continue automatically: {body['explanation']}"
        )

    return body


def main() -> None:
    order_reference = f"quickstart-{uuid.uuid4()}"
    calculation_request = {
        "reference": order_reference,
        "transaction_date": datetime.now(UTC).date().isoformat(),
        "currency": "CAD",
        "tax_behavior": "exclusive",
        "billing_event": "subscription_start",
        "seller": {
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
        "customer": {
            "type": "consumer",
            "address": {
                "country": "CA",
                "state": "ON",
                "postal_code": "M5V 2T6",
            },
        },
        "lines": [
            {
                "reference": "subscription",
                "amount": "100.00",
                "quantity": "1",
                "tax_code": "saas",
            }
        ],
    }

    calculation = create_calculation(
        calculation_request, f"quickstart:{order_reference}"
    )
    print(json.dumps(calculation, indent=2))


if __name__ == "__main__":
    main()

