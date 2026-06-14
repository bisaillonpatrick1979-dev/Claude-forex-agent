# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

`Claude-forex-agent` is an AI-powered foreign exchange (forex) assistant built on Anthropic's Claude models. It uses Claude's tool-use loop to fetch live market data and answer FX questions interactively.

## Commands

```bash
# Install dependencies (creates .venv automatically)
uv sync

# Run the interactive agent REPL
uv run python main.py

# Lint
uv run ruff check .
uv run ruff check --fix .

# Tests
uv run pytest tests/ -v

# Run a single test
uv run pytest tests/test_rates.py::test_get_exchange_rate_returns_rate -v
```

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |

## Architecture

```
main.py                          # Interactive REPL entry point
src/claude_forex_agent/
  agent.py                       # ForexAgent — drives the Claude tool-use loop
  tools/
    registry.py                  # Maps tool names → handlers + exports TOOL_SCHEMAS
    rates.py                     # get_exchange_rate tool (Frankfurter public API)
tests/
  test_rates.py                  # Tool tests using pytest-httpx mocks
```

### Agent loop (`agent.py`)

`ForexAgent.run(user_message)` implements a synchronous Claude tool-use loop:
1. Send messages to Claude with `TOOL_SCHEMAS`.
2. If `stop_reason == "end_turn"`, return the text response.
3. Otherwise dispatch each `tool_use` block via `_dispatch_tool` → `registry`.
4. Append assistant + tool results to the message list and repeat.

### Adding a new tool

1. Create `src/claude_forex_agent/tools/<name>.py` with a handler function and its `*_SCHEMA` dict (following the Anthropic tool schema format).
2. Register both in `tools/registry.py` (`registry` dict and `TOOL_SCHEMAS` list).
3. The agent loop picks it up automatically — no changes to `agent.py` needed.

### HTTP calls

Tools use `httpx` directly (synchronous). Use `pytest-httpx`'s `httpx_mock` fixture to mock network calls in tests rather than hitting live APIs.
