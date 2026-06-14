"""Tests for ForexAgent — conversation history and tool dispatch."""

from unittest.mock import MagicMock, patch

import anthropic

from claude_forex_agent.agent import ForexAgent


def _make_text_response(text: str, stop_reason: str = "end_turn") -> MagicMock:
    block = MagicMock()
    block.type = "text"
    block.text = text
    response = MagicMock()
    response.stop_reason = stop_reason
    response.content = [block]
    return response


def _make_client(responses: list) -> MagicMock:
    client = MagicMock(spec=anthropic.Anthropic)
    client.messages = MagicMock()
    client.messages.create = MagicMock(side_effect=responses)
    return client


def test_single_turn_returns_text():
    client = _make_client([_make_text_response("The rate is 0.91.")])
    agent = ForexAgent(client=client, tools=[])
    result = agent.run("What is USD/EUR?")
    assert result == "The rate is 0.91."


def test_history_grows_between_turns():
    client = _make_client([
        _make_text_response("The rate is 0.91."),
        _make_text_response("It went up yesterday."),
    ])
    agent = ForexAgent(client=client, tools=[])
    agent.run("What is USD/EUR?")
    assert len(agent.history) == 2  # user + assistant

    agent.run("And yesterday?")
    # second call: previous 2 + new user + new assistant = 4
    assert len(agent.history) == 4


def test_reset_clears_history():
    client = _make_client([_make_text_response("The rate is 0.91.")])
    agent = ForexAgent(client=client, tools=[])
    agent.run("What is USD/EUR?")
    agent.reset()
    assert agent.history == []


def test_unknown_tool_returns_error():
    client = _make_client([])
    agent = ForexAgent(client=client, tools=[])
    result = agent._dispatch_tool("nonexistent_tool", {})
    assert "error" in result


def test_dispatch_calls_registered_tool():
    client = _make_client([])
    agent = ForexAgent(client=client, tools=[])
    mock_registry = {"get_exchange_rate": lambda **kw: {"rate": 0.9}}
    with patch("claude_forex_agent.tools.registry.registry", mock_registry):
        result = agent._dispatch_tool("get_exchange_rate", {"base": "USD", "quote": "EUR"})
    assert result == {"rate": 0.9}
