"""FastAPI Application Entrypoint for QDS Threat Detection Engine."""

from contextlib import asynccontextmanager
import time
from typing import Optional
import qiskit
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints.metrics import stream_metrics
from app.api.v1.router import api_router
from app.core.config import settings
from app.engine.threats.attack_simulator import AttackType
from app.services.simulation_service import simulation_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for backend startup and shutdown."""
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Production REST and WebSocket API for the Quantum Digital Signatures (QDS) "
        "Threat Detection Engine. Built with deterministic quantum physics simulation (Zero ML), "
        "MDI detector cross-checks, counterfactual zero-transmission monitors, postselection, "
        "and formal Hoeffding security bounds."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware enabling seamless frontend connection from any local/remote host
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", summary="Root Health / Info")
def root():
    """Root metadata endpoint."""
    return {
        "message": "QDS Threat Detection Engine Backend Running",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs",
    }


@app.get("/health", summary="System Health & Quantum Environment Check")
def health_check():
    """GET /health - Verifies backend readiness, Qiskit version, and registered attack classes."""
    return {
        "status": "healthy",
        "service": "QDS Threat Detection Engine",
        "engine": "QDS Threat Detection Engine",
        "version": "1.0.0",
        "active_sessions": len(simulation_service._sessions),
        "timestamp": time.time(),
        "qiskit_version": qiskit.__version__,
        "registered_attack_classes": [a.value for a in AttackType if a != AttackType.CLEAN],
        "zero_ml": True,
        "security_standard": "Hoeffding Finite-Key Bounds (CV-QDS Thornton et al.)",
    }


# Mount root WebSocket endpoint /ws/stream directly on app for frontend shell convenience
@app.websocket("/ws/stream")
async def websocket_stream_root(websocket: WebSocket, session_id: Optional[str] = None):
    """WS /ws/stream - Root real-time WebSocket telemetry stream."""
    sid = session_id or websocket.query_params.get("session_id")
    await stream_metrics(websocket, session_id=sid)
