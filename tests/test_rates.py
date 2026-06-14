"""Tests for the exchange-rate tool."""

import httpx
import pytest
from pytest_httpx import HTTPXMock

from claude_forex_agent.tools.rates import get_exchange_rate


def test_get_exchange_rate_returns_rate(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        json={"base": "USD", "date": "2026-06-14", "rates": {"EUR": 0.9123}},
    )
    result = get_exchange_rate("USD", "EUR")
    assert result == {"base": "USD", "quote": "EUR", "rate": 0.9123, "date": "2026-06-14"}


def test_get_exchange_rate_http_error(httpx_mock: HTTPXMock):
    httpx_mock.add_exception(httpx.ConnectError("network error"))
    result = get_exchange_rate("USD", "EUR")
    assert "error" in result
