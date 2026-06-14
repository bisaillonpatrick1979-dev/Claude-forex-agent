"""Entry point — run the forex agent in an interactive REPL."""

import os
import sys

import anthropic
from dotenv import load_dotenv

from claude_forex_agent.agent import ForexAgent
from claude_forex_agent.tools.registry import TOOL_SCHEMAS

load_dotenv()

HELP_TEXT = """\
Commands:
  clear   Reset conversation history
  exit    Quit
"""


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    agent = ForexAgent(client=client, tools=TOOL_SCHEMAS)

    print("Claude Forex Agent  |  type 'help', 'clear', or 'exit'\n")
    while True:
        try:
            query = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not query:
            continue
        if query.lower() == "exit":
            break
        if query.lower() == "help":
            print(HELP_TEXT)
            continue
        if query.lower() == "clear":
            agent.reset()
            print("Conversation history cleared.\n")
            continue

        try:
            answer = agent.run(query)
            print(f"Agent: {answer}\n")
        except anthropic.AuthenticationError:
            print("Error: Invalid API key. Check your ANTHROPIC_API_KEY in .env.\n")
        except anthropic.APIConnectionError:
            print("Error: Could not reach the Anthropic API. Check your network connection.\n")
        except anthropic.RateLimitError:
            print("Error: Rate limit reached. Please wait a moment and try again.\n")


if __name__ == "__main__":
    main()
