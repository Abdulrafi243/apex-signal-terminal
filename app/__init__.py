"""Compatibility package for running the backend from the project root.

This package redirects ``app.*`` imports to ``backend/app`` so the command

    python -m uvicorn app.main:app --reload --port 8000

works from the project root as well as from the backend directory.
"""
from pathlib import Path

_backend_app = Path(__file__).resolve().parent.parent / "backend" / "app"
__path__ = [str(_backend_app)]
