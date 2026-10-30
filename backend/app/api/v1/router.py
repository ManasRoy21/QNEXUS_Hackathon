from fastapi import APIRouter
from app.api.v1.endpoints import (
    keygen,
    sign,
    verify,
    attack,
    symmetrize,
    metrics,
    protocols,
    sessions,
    benchmarks,
    simulation,
    image_lab,
    experiments,
    text_lab,
    quantum_lab,
    payments,
)

api_router = APIRouter()
api_router.include_router(experiments.router, tags=["experiments"])
api_router.include_router(image_lab.router, prefix="/image-lab", tags=["image-lab"])
api_router.include_router(text_lab.router, prefix="/text-lab", tags=["text-lab"])
api_router.include_router(quantum_lab.router, prefix="/quantum-lab", tags=["quantum-lab"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])

# Target Protocol-Aware Simulation Endpoints (REQ-QDS-SIM-2026-V1)
api_router.include_router(simulation.router, prefix="/simulation", tags=["simulation"])

# Existing Day 1-8 endpoints for backwards compatibility
api_router.include_router(keygen.router, prefix="/simulate", tags=["simulate"])
api_router.include_router(sign.router, prefix="/simulate", tags=["simulate"])
api_router.include_router(verify.router, prefix="/simulate", tags=["simulate"])
api_router.include_router(attack.router, prefix="/attack", tags=["attack"])
api_router.include_router(symmetrize.router, prefix="/symmetrize", tags=["symmetrize"])
api_router.include_router(metrics.router, tags=["metrics"])

# Phase 2 SRS Specification Endpoints
api_router.include_router(protocols.router, tags=["protocols"])
api_router.include_router(sessions.router, tags=["sessions"])
api_router.include_router(benchmarks.router, tags=["benchmarks"])

