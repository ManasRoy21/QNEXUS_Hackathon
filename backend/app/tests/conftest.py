"""Pytest configuration and shared fixtures for QDS test suite."""

import sys
from pathlib import Path

# Ensure backend root is always in sys.path
backend_root = Path(__file__).resolve().parent.parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """FastAPI TestClient fixture for endpoint integration tests."""
    return TestClient(app)
