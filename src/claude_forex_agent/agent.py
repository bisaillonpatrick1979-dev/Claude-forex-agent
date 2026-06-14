"""Core forex agent — drives the Claude tool-use loop."""

import json

import anthropic

SYSTEM_PROMPT = """You are a foreign exchange (forex) analyst assistant.
You help users understand currency markets, exchange rates, and FX strategies.
Use the available tools to fetch live data before answering quantitative questions.
"""


class ForexAgent:
    def __init__(self, client: anthropic.Anthropic, tools: list[dict]):
        self.client = client
        self.tools = tools
        self.model = "claude-sonnet-4-6"

    def run(self, user_message: str) -> str:
        messages: list[dict] = [{"role": "user", "content": user_message}]

        while True:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=self.tools,
                messages=messages,
            )

            if response.stop_reason == "end_turn":
                return next(
                    block.text
                    for block in response.content
                    if block.type == "text"
                )

            # Process tool calls
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = self._dispatch_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

    def _dispatch_tool(self, name: str, inputs: dict) -> dict:
        from claude_forex_agent.tools import registry
        handler = registry.get(name)
        if handler is None:
            return {"error": f"Unknown tool: {name}"}
        return handler(**inputs)
