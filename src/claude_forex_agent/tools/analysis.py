"""Tool: delegate complex FX research to a specialist sub-agent."""

import json

import anthropic

ANALYZE_FOREX_SCHEMA = {
    "name": "analyze_forex",
    "description": (
        "Delegate a complex forex research question to a specialist analyst agent "
        "that runs its own tool-call loop to gather data and synthesise insights. "
        "Use this for trend analysis, multi-currency comparisons, or any question "
        "that requires several data points to answer well."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "The specific analytical question to research.",
            }
        },
        "required": ["question"],
    },
}

_SYSTEM = """You are a specialist forex research analyst.
Gather data with your tools and produce clear, data-rich analysis.
Always include specific numbers, percentages, and date ranges.
Format output with markdown: headers, bullet lists, and tables where helpful."""

_MAX_ROUNDS = 10


def analyze_forex(question: str) -> dict:
    """Run a research sub-agent that has access to all data tools."""
    # Lazy imports to avoid circular dependency with registry.py
    from claude_forex_agent.tools.convert import CONVERT_AMOUNT_SCHEMA, convert_amount
    from claude_forex_agent.tools.currencies import LIST_CURRENCIES_SCHEMA, list_currencies
    from claude_forex_agent.tools.historical import (
        GET_HISTORICAL_RATES_SCHEMA,
        get_historical_rates,
    )
    from claude_forex_agent.tools.rates import GET_EXCHANGE_RATE_SCHEMA, get_exchange_rate

    research_tools = [
        GET_EXCHANGE_RATE_SCHEMA,
        LIST_CURRENCIES_SCHEMA,
        CONVERT_AMOUNT_SCHEMA,
        GET_HISTORICAL_RATES_SCHEMA,
    ]
    research_registry = {
        "get_exchange_rate": get_exchange_rate,
        "list_currencies": list_currencies,
        "convert_amount": convert_amount,
        "get_historical_rates": get_historical_rates,
    }

    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
    messages: list[dict] = [{"role": "user", "content": question}]

    for _ in range(_MAX_ROUNDS):
        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=2048,
            system=_SYSTEM,
            tools=research_tools,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            text = next((b.text for b in response.content if b.type == "text"), "")
            return {"analysis": text}

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = research_registry.get(block.name)
                result = handler(**block.input) if handler else {"error": f"Unknown: {block.name}"}
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

    return {"error": "Research agent exceeded maximum iterations."}
