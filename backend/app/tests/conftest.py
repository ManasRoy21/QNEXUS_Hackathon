"""Pytest configuration and shared fixtures for QDS test suite."""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """FastAPI TestClient fixture for endpoint integration tests."""
    return TestClient(app)
