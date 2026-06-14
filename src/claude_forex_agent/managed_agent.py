"""Managed Agent session runner — streams events and dispatches custom forex tools."""

import json

import anthropic

from claude_forex_agent.tools.registry import registry


class ForexManagedAgent:
    """Wraps an Anthropic Managed Agent session with forex tool dispatch."""

    def __init__(
        self,
        client: anthropic.Anthropic,
        agent_id: str,
        agent_version: int,
        env_id: str,
    ) -> None:
        self.client = client
        self.agent_id = agent_id
        self.agent_version = agent_version
        self.env_id = env_id

    def create_session(self) -> str:
        """Create a new Managed Agent session and return its ID."""
        session = self.client.beta.sessions.create(
            agent={"type": "agent", "id": self.agent_id, "version": self.agent_version},
            environment_id=self.env_id,
        )
        return session.id

    def stream_response(self, session_id: str, user_message: str):
        """
        Generator that sends *user_message* and yields ``("text", chunk)`` tuples.

        Handles multiple rounds of custom tool calls transparently: whenever the
        Managed Agent emits ``agent.custom_tool_use`` events the registered handlers
        are called locally and the results are sent back before the next stream
        is opened (stream-first pattern).
        """
        pending_events: list[dict] = [
            {"type": "user.message", "content": [{"type": "text", "text": user_message}]}
        ]

        while pending_events:
            tool_calls: list = []
            terminated = False

            with self.client.beta.sessions.events.stream(session_id=session_id) as stream:
                # Stream-first: open the stream, then send while it is live.
                self.client.beta.sessions.events.send(
                    session_id=session_id, events=pending_events
                )
                pending_events = []

                for event in stream:
                    if event.type == "agent.message":
                        for block in event.content:
                            if block.type == "text":
                                yield "text", block.text
                    elif event.type == "agent.custom_tool_use":
                        tool_calls.append(event)
                    elif event.type == "session.status_idle":
                        break
                    elif event.type == "session.status_terminated":
                        terminated = True
                        break

            if terminated or not tool_calls:
                break

            for call in tool_calls:
                handler = registry.get(call.name)
                if handler is not None:
                    result = handler(**call.input)
                else:
                    result = {"error": f"Unknown tool: {call.name}"}
                pending_events.append({
                    "type": "user.custom_tool_result",
                    "custom_tool_use_id": call.id,
                    "content": [{"type": "text", "text": json.dumps(result)}],
                })
