"""Tests for the list_currencies tool."""

import httpx
from pytest_httpx import HTTPXMock

from claude_forex_agent.tools.currencies import list_currencies


def test_list_currencies_returns_dict(httpx_mock: HTTPXMock):
    httpx_mock.add_response(json={"USD": "US Dollar", "EUR": "Euro", "GBP": "British Pound"})
    result = list_currencies()
    assert "currencies" in result
    assert result["currencies"]["USD"] == "US Dollar"


def test_list_currencies_http_error(httpx_mock: HTTPXMock):
    httpx_mock.add_exception(httpx.ConnectError("network error"))
    result = list_currencies()
    assert "error" in result
