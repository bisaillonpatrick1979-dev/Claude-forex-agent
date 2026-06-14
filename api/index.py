"""Vercel entry point — makes the src layout importable then re-exports app."""

import sys
from pathlib import Path

# Vercel builds from the repo root; add src/ so the package is importable.
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from claude_forex_agent.server import app  # noqa: E402, F401
