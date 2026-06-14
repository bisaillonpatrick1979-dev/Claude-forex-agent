"""Tool: list all currencies supported by the Frankfurter API."""

import httpx

LIST_CURRENCIES_SCHEMA = {
    "name": "list_currencies",
    "description": "List all currency codes and full names supported by the exchange rate API.",
    "input_schema": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}


def list_currencies() -> dict:
    """Return all supported currency codes and names."""
    try:
        response = httpx.get("https://api.frankfurter.app/currencies", timeout=10)
        response.raise_for_status()
        return {"currencies": response.json()}
    except httpx.HTTPError as exc:
        return {"error": str(exc)}
