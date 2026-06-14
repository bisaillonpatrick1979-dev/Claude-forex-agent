"""Tool registry — maps tool names to handler functions and their schemas."""

from claude_forex_agent.tools.analysis import ANALYZE_FOREX_SCHEMA, analyze_forex
from claude_forex_agent.tools.convert import CONVERT_AMOUNT_SCHEMA, convert_amount
from claude_forex_agent.tools.currencies import LIST_CURRENCIES_SCHEMA, list_currencies
from claude_forex_agent.tools.historical import GET_HISTORICAL_RATES_SCHEMA, get_historical_rates
from claude_forex_agent.tools.rates import GET_EXCHANGE_RATE_SCHEMA, get_exchange_rate

# Map tool name -> callable
registry: dict = {
    "get_exchange_rate": get_exchange_rate,
    "list_currencies": list_currencies,
    "convert_amount": convert_amount,
    "get_historical_rates": get_historical_rates,
    "analyze_forex": analyze_forex,
}

# Anthropic tool schemas passed to the API
TOOL_SCHEMAS: list[dict] = [
    GET_EXCHANGE_RATE_SCHEMA,
    LIST_CURRENCIES_SCHEMA,
    CONVERT_AMOUNT_SCHEMA,
    GET_HISTORICAL_RATES_SCHEMA,
    ANALYZE_FOREX_SCHEMA,
]
