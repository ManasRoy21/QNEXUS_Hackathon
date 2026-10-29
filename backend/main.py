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
    from app.services.experiment_service import experiment_runner
    experiment_runner.startup()
    try:
        yield
    finally:
        experiment_runner.shutdown()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Research simulation API with a Qiskit Aer image-integrity teaching lab and "
        "existing QDS protocol models. Image receipts use classical Ed25519 signatures. "
        "Consult each endpoint's model assumptions; simulation results do not certify security."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware: configurable via ALLOWED_ORIGINS, supports Vercel preview & production deployments
cors_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip() and "*" not in origin]
if "*" in settings.ALLOWED_ORIGINS or settings.ENVIRONMENT == "development":
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if cors_origins != ["*"] else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also mount simulation router directly at /simulation for direct route compatibility
from app.api.v1.endpoints.simulation import router as simulation_router
app.include_router(simulation_router, prefix="/simulation", tags=["simulation"])


@app.get("/", summary="Root Health / Info")
def root():
    """Root metadata endpoint."""
    return {
        "message": "QDS Threat Detection Engine Backend Running",
        "version": "1.0.0",
        "docs": "/docs",
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
        "security_standard": "Educational simulation; see individual model assumptions",
    }


# Mount root WebSocket endpoint /ws/stream directly on app for frontend shell convenience
@app.websocket("/ws/stream")
async def websocket_stream_root(websocket: WebSocket, session_id: Optional[str] = None):
    """WS /ws/stream - Root real-time WebSocket telemetry stream."""
    sid = session_id or websocket.query_params.get("session_id")
    await stream_metrics(websocket, session_id=sid)
