"""Tests for the convert_amount tool."""

import httpx
from pytest_httpx import HTTPXMock

from claude_forex_agent.tools.convert import convert_amount


def test_convert_amount_returns_converted(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        json={"base": "USD", "date": "2026-06-14", "rates": {"EUR": 182.46}},
    )
    result = convert_amount(200.0, "USD", "EUR")
    assert result == {
        "amount": 200.0,
        "base": "USD",
        "quote": "EUR",
        "converted": 182.46,
        "date": "2026-06-14",
    }


def test_convert_amount_http_error(httpx_mock: HTTPXMock):
    httpx_mock.add_exception(httpx.ConnectError("network error"))
    result = convert_amount(100.0, "USD", "EUR")
    assert "error" in result
