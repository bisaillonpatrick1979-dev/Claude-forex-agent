"""Tool: convert a specific amount between two currencies."""

import httpx

CONVERT_AMOUNT_SCHEMA = {
    "name": "convert_amount",
    "description": (
        "Convert a specific monetary amount from one currency to another at the current rate."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "amount": {
                "type": "number",
                "description": "The amount to convert.",
            },
            "base": {
                "type": "string",
                "description": "The source currency code (e.g. USD, EUR, GBP).",
            },
            "quote": {
                "type": "string",
                "description": "The target currency code.",
            },
        },
        "required": ["amount", "base", "quote"],
    },
}


def convert_amount(amount: float, base: str, quote: str) -> dict:
    """Convert an amount from base to quote currency at the current rate."""
    base = base.upper()
    quote = quote.upper()
    try:
        response = httpx.get(
            "https://api.frankfurter.app/latest",
            params={"from": base, "to": quote, "amount": amount},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        converted = data["rates"].get(quote)
        return {
            "amount": amount,
            "base": base,
            "quote": quote,
            "converted": converted,
            "date": data["date"],
        }
    except httpx.HTTPError as exc:
        return {"error": str(exc)}
