"""Tests for the get_historical_rates tool."""

import httpx
from pytest_httpx import HTTPXMock

from claude_forex_agent.tools.historical import get_historical_rates


def test_get_historical_rates_single_day(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        json={"base": "USD", "rates": {"2026-01-15": {"EUR": 0.9050}}},
    )
    result = get_historical_rates("USD", "EUR", "2026-01-15")
    assert result["base"] == "USD"
    assert result["quote"] == "EUR"
    assert "2026-01-15" in result["rates"]
    assert result["end_date"] is None


def test_get_historical_rates_date_range(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        json={
            "base": "USD",
            "rates": {
                "2026-01-15": {"EUR": 0.9050},
                "2026-01-16": {"EUR": 0.9070},
            },
        },
    )
    result = get_historical_rates("USD", "EUR", "2026-01-15", "2026-01-16")
    assert len(result["rates"]) == 2
    assert result["end_date"] == "2026-01-16"


def test_get_historical_rates_http_error(httpx_mock: HTTPXMock):
    httpx_mock.add_exception(httpx.ConnectError("network error"))
    result = get_historical_rates("USD", "EUR", "2026-01-15")
    assert "error" in result
