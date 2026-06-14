"""Tool: fetch live exchange rates via a public API."""

import httpx

GET_EXCHANGE_RATE_SCHEMA = {
    "name": "get_exchange_rate",
    "description": "Get the current exchange rate between two currencies.",
    "input_schema": {
        "type": "object",
        "properties": {
            "base": {
                "type": "string",
                "description": "The base currency code (e.g. USD, EUR, GBP).",
            },
            "quote": {
                "type": "string",
                "description": "The quote currency code to convert to.",
            },
        },
        "required": ["base", "quote"],
    },
}


def get_exchange_rate(base: str, quote: str) -> dict:
    """Fetch the exchange rate for base/quote using the Frankfurter public API."""
    base = base.upper()
    quote = quote.upper()
    try:
        response = httpx.get(
            "https://api.frankfurter.app/latest",
            params={"from": base, "to": quote},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        rate = data["rates"].get(quote)
        return {"base": base, "quote": quote, "rate": rate, "date": data["date"]}
    except httpx.HTTPError as exc:
        return {"error": str(exc)}
