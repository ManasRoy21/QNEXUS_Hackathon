"""Simulation Lifecycle Endpoints.

Provides primary protocol-aware simulation endpoints:
  - POST /api/v1/simulation/generate-material: Generates quantum signature material
    using the active protocol's physical model and deterministic seed control.
  - POST /api/v1/simulation/attack: Runs a protocol-aware attack simulation against
    a previously generated canonical simulation state.
"""

from typing import Union

from fastapi import APIRouter, HTTPException

from app.engine.analytics.statistical_bounds import StatisticalBoundsEngine
from app.engine.analytics.sweep_engine import SweepEngine
from app.engine.attack_engine import state_store
from app.engine.attack_engine.dispatcher import dispatch
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.analytics_models import (
    StatisticalBoundRequest,
    StatisticalBoundResponse,
    SweepRequest,
    SweepResponse,
)
from app.schemas.attack_models import (
    AttackSimulationRequest,
    AttackSimulationResponse,
    SimulationModelNotAvailableResponse,
)
from app.schemas.canonical_models import (
    CanonicalSimulationState,
    GenerateMaterialRequest,
)

router = APIRouter()


@router.post(
    "/generate-material",
    response_model=CanonicalSimulationState,
    summary="Generate Quantum Signature Material (Deterministic)",
)
def generate_signature_material(
    request: GenerateMaterialRequest,
) -> CanonicalSimulationState:
    """POST /api/v1/simulation/generate-material.

    Executes a protocol-aware state distribution simulation run.
    Guarantees deterministic bit-for-bit reproducibility when provided identical seeds and parameters.
    The generated state is stored in the in-process session store for subsequent attack calls.
    """
    proto = request.protocol.lower()
    if proto not in ("practical_qds", "practical-qds", "yin_2016"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Protocol '{request.protocol}' does not currently possess a calibrated quantitative "
                "state generator in Phase 1. Only 'practical_qds' is supported for quantitative material generation."
            ),
        )

    try:
        sim_state = PracticalQDSEngine.generate_simulation(request)
        # Persist in session store so /attack can retrieve by simulation_id
        state_store.save(sim_state)
        return sim_state
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(exc)}")


@router.post(
    "/attack",
    summary="Run Protocol-Aware Attack Simulation",
)
def run_attack_simulation(
    request: AttackSimulationRequest,
) -> Union[AttackSimulationResponse, SimulationModelNotAvailableResponse]:
    """POST /api/v1/simulation/attack.

    Runs a protocol-aware attack simulation against a previously generated
    canonical simulation state.

    The dispatcher enforces the protocol → attack → applicability → model hierarchy:
      QUANTITATIVE  → real mathematical model with ε bounds
      QUALITATIVE   → narrative explanation without mathematical model
      UNIMPLEMENTED → SimulationModelNotAvailableResponse (NEVER returns verdict=CLEAN)

    Requires:
      - simulation_id: ID returned by POST /generate-material
      - protocol: 'practical_qds' | 'mdi_qds' | 'otuh_qds' | 'tf_qds' | 'decoy_qds'
      - attack: FORGERY | REPUDIATION | INTERCEPT_RESEND | DETECTOR_COMPROMISE | PNS_ATTACK
    """
    try:
        result = dispatch(request)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Attack dispatch error: {str(exc)}")


@router.post(
    "/sweep",
    response_model=SweepResponse,
    summary="Execute Multi-Point Parameter Sweep",
)
def run_parameter_sweep(
    request: SweepRequest,
) -> SweepResponse:
    """POST /api/v1/simulation/sweep.

    Executes a real parameter sweep across genuine physical simulation instances and
    attacks. Every point is deterministically simulated and recorded.
    """
    try:
        return SweepEngine.execute_sweep(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Sweep execution error: {str(exc)}")


@router.post(
    "/bounds",
    response_model=StatisticalBoundResponse,
    summary="Compute Statistical Security Bounds (Phase 5 Canonical)",
)
@router.post(
    "/statistical-bound",
    response_model=StatisticalBoundResponse,
    summary="Compute Statistical Concentration Bound (Alias)",
)
def calculate_statistical_bound(
    request: StatisticalBoundRequest,
) -> StatisticalBoundResponse:
    """Compute mathematical security and concentration bounds.

    Supports the four core analytical modes:
      1. HOEFFDING: P(|X̄ - E[X]| >= ε) <= 2 exp(-2nε²)
      2. CHERNOFF: P(X <= (1-δ)μ) <= exp(-δ²μ/2)
      3. RANDOM_SAMPLING: Practical QDS test-bit vs untested-bit finite sampling analysis
      4. PROTOCOL_BOUND: Information-theoretic security equations (ε₁, ε₂, ε_sec)
    
    Every response returns full mathematical transparency: inputs, formula,
    substitution, calculation_steps, result, and interpretation.
    """
    try:
        return StatisticalBoundsEngine.calculate(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Statistical bound error: {str(exc)}")


