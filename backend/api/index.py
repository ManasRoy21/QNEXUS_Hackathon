"""FastAPI Entrypoint for Vercel Serverless Function Deployment."""
import sys
import os

# Ensure backend root directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402

__all__ = ["app"]
