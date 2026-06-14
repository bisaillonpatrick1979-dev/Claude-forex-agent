"""Tool: fetch historical exchange rates for a given date or date range."""

import httpx

GET_HISTORICAL_RATES_SCHEMA = {
    "name": "get_historical_rates",
    "description": (
        "Get historical exchange rates for a specific date or a date range. "
        "Dates must be in YYYY-MM-DD format. "
        "If end_date is provided, returns a time series; otherwise returns a single day."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "base": {
                "type": "string",
                "description": "The base currency code (e.g. USD, EUR).",
            },
            "quote": {
                "type": "string",
                "description": "The quote currency code.",
            },
            "start_date": {
                "type": "string",
                "description": "The date or start of the date range (YYYY-MM-DD).",
            },
            "end_date": {
                "type": "string",
                "description": "The end of the date range (YYYY-MM-DD). Optional.",
            },
        },
        "required": ["base", "quote", "start_date"],
    },
}


def get_historical_rates(
    base: str, quote: str, start_date: str, end_date: str | None = None
) -> dict:
    """Fetch historical rates for base/quote on a date or over a date range."""
    base = base.upper()
    quote = quote.upper()
    path = f"{start_date}..{end_date}" if end_date else start_date
    try:
        response = httpx.get(
            f"https://api.frankfurter.app/{path}",
            params={"from": base, "to": quote},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return {
            "base": base,
            "quote": quote,
            "rates": data.get("rates", {}),
            "start_date": start_date,
            "end_date": end_date,
        }
    except httpx.HTTPError as exc:
        return {"error": str(exc)}
