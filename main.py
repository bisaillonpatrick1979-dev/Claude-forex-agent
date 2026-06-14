"""Entry point — run the forex agent in an interactive REPL."""

import os

import anthropic
from dotenv import load_dotenv

from claude_forex_agent.agent import ForexAgent
from claude_forex_agent.tools.registry import TOOL_SCHEMAS

load_dotenv()


def main() -> None:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    agent = ForexAgent(client=client, tools=TOOL_SCHEMAS)

    print("Claude Forex Agent — type 'exit' to quit.\n")
    while True:
        try:
            query = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not query or query.lower() == "exit":
            break
        answer = agent.run(query)
        print(f"Agent: {answer}\n")


if __name__ == "__main__":
    main()
