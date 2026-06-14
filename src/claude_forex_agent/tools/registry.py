"""Tool registry — maps tool names to handler functions and their schemas."""

from claude_forex_agent.tools.rates import GET_EXCHANGE_RATE_SCHEMA, get_exchange_rate

# Map tool name -> callable
registry: dict = {
    "get_exchange_rate": get_exchange_rate,
}

# Anthropic tool schemas passed to the API
TOOL_SCHEMAS: list[dict] = [
    GET_EXCHANGE_RATE_SCHEMA,
]
