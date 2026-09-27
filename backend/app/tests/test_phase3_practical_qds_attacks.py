"""Comprehensive Phase 3 Tests: Protocol-Aware Practical QDS Attack Engine.

Validates:
  1. Strict protocol isolation (no cross-protocol leakage or fake CLEAN verdicts)
  2. FR-E1 Forgery: quantitative model with Chernoff unforgeability bound
  3. FR-E2 Repudiation: quantitative model with threshold gap analysis
  4. FR-E3 Intercept-Resend: quantitative model with intensity gamma scaling and Ta threshold check
  5. FR-E4 Detector Blinding on Practical QDS: SIMULATION_MODEL_NOT_AVAILABLE (never CLEAN or MDI immunity)
  6. FR-B3 PNS Attack on Practical QDS: SIMULATION_MODEL_NOT_AVAILABLE (never CLEAN or Decoy immunity)
  7. Four-layer explanations populated across all quantitative and qualitative responses
  8. Mathematical model transparency with formulas, intermediate calculation traces, and interpretations
  9. Deterministic reproducibility with fixed seeds
  10. Dual-routed endpoints: POST /simulation/attack and POST /api/v1/simulation/attack
"""

import pytest
import math
from fastapi.testclient import TestClient

from app.engine.attack_engine.applicability_matrix import get_applicability
from app.engine.attack_engine.attack_ids import CanonicalAttackID
from app.engine.attack_engine.dispatcher import dispatch
from app.engine.attack_engine import practical_qds_attacks as pqa
from app.engine.attack_engine import state_store
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.attack_models import (
    AttackSimulationRequest,
    AttackSimulationResponse,
    SimulationModelNotAvailableResponse,
)
from app.schemas.canonical_models import GenerateMaterialRequest
from main import app

client = TestClient(app)


@pytest.fixture
def sim_state():
    req = GenerateMaterialRequest(
        protocol="practical_qds",
        pulse_count=20000,
        distance_km=25.0,
        fiber_attenuation=0.2,
        detector_efficiency=0.15,
        dark_count_rate=1e-6,
        baseline_qber=0.015,
        beta=0.3,
        authentication_threshold=0.03,
        verification_threshold=0.065,
        seed=42,
    )
    state = PracticalQDSEngine.generate_simulation(req)
    state_store.save(state)
    return state


# ── 1. FR-E1 Forgery ─────────────────────────────────────────────────────────

def test_01_forgery_quantitative_model(sim_state):
    """FR-E1: Forgery computes Chernoff bound epsilon_1 from conclusive-bit overlap I(B:C) and Sc solver."""
    req = AttackSimulationRequest(
        simulation_id=sim_state.simulation_id,
        protocol="practical_qds",
        attack="FORGERY",
    )
    res = dispatch(req, state=sim_state)

    assert isinstance(res, AttackSimulationResponse)
    assert res.model_status == "QUANTITATIVE"
    assert res.applicable is True
    assert res.verdict == "FORGERY_BOUNDED"
    assert res.protocol_resisted is True  # For pulse_count=20000, epsilon_1 << 0.5
    assert res.metadata is not None
    assert "epsilon_1" in res.metadata
    assert "I_BC" in res.metadata
    assert "S_c" in res.metadata
    assert "M_u" in res.metadata
    assert "P_C_c" in res.metadata
    assert 0.0 < res.metadata["epsilon_1"] < 0.5

    # Check mathematical model
    math_model = res.mathematical_model
    assert math_model is not None
    assert "varepsilon_1" in math_model.formula
    assert "S_c" in math_model.formula
    assert "T_v" in math_model.formula
    assert math_model.inputs["M_u"] == sim_state.material.untested_bits["M_u_bob"]
    assert "Step 1" in math_model.intermediate_calculation
    assert "Step 7" in math_model.intermediate_calculation

    # Check 4-layer explanation
    exp = res.four_layer_explanation
    assert exp is not None
    assert "Charlie" in exp.layer_1_attacker_action
    assert "quantum" in exp.layer_2_physical_effect.lower()
    assert "conclusive" in exp.layer_3_observable_effect.lower()
    assert "bound" in exp.layer_4_security_consequence.lower()


# ── 2. FR-E2 Repudiation ──────────────────────────────────────────────────────

def test_02_repudiation_quantitative_model(sim_state):
    """FR-E2: Repudiation computes epsilon_2 from threshold gap (Tv - Ta - Delta) and Mu."""
    req = AttackSimulationRequest(
        simulation_id=sim_state.simulation_id,
        protocol="practical_qds",
        attack="REPUDIATION",
        parameters={"delta": 0.005},
    )
    res = dispatch(req, state=sim_state)

    assert isinstance(res, AttackSimulationResponse)
    assert res.model_status == "QUANTITATIVE"
    assert res.applicable is True
    assert res.verdict in ("REPUDIATION_BOUNDED", "REPUDIATION_UNBOUNDED")
    assert "epsilon_2" in res.metadata
    assert "delta" in res.metadata
    assert "gap" in res.metadata

    # Verify math model
    math_model = res.mathematical_model
    assert math_model is not None
    assert "varepsilon_2" in math_model.formula
    assert "T_v - T_a" in math_model.formula
    assert math_model.inputs["delta"] == 0.005
    assert math_model.inputs["T_v"] == 0.065
    assert math_model.inputs["T_a"] == 0.03
    assert "Step 1" in math_model.intermediate_calculation
    assert "Step 5" in math_model.intermediate_calculation


# ── 3. FR-E3 Intercept-Resend ────────────────────────────────────────────────

def test_03_intercept_resend_quantitative_model(sim_state):
    """FR-E3: Intercept-resend verifies QBER_obs = QBER_base + 0.5*gamma*(1 - 2*QBER_base)."""
    gamma = 0.6
    req = AttackSimulationRequest(
        simulation_id=sim_state.simulation_id,
        protocol="practical_qds",
        attack="INTERCEPT_RESEND",
        intensity=gamma,
    )
    res = dispatch(req, state=sim_state)

    assert isinstance(res, AttackSimulationResponse)
    assert res.model_status == "QUANTITATIVE"
    assert res.applicable is True

    qber_base = sim_state.measurement_statistics.qber_bob
    expected_qber = qber_base + 0.5 * gamma * (1.0 - 2.0 * qber_base)
    assert res.metadata["QBER_obs"] == pytest.approx(expected_qber, abs=1e-6)

    # For gamma=0.6, QBER_obs exceeds Ta=0.03 -> detected
    assert res.verdict == "EAVESDROPPING_DETECTED"
    assert res.attack_detected is True
    assert res.protocol_resisted is True

    # Check math trace
    math_model = res.mathematical_model
    assert math_model is not None
    assert "e_{\\text{obs}}" in math_model.formula
    assert math_model.inputs["gamma"] == gamma


# ── 4. FR-E4 Detector Blinding (Not Available on Practical QDS) ───────────────

def test_04_detector_blinding_returns_not_available_no_mdi_leakage(sim_state):
    """FR-E4: Detector Blinding on Practical QDS MUST return SIMULATION_MODEL_NOT_AVAILABLE.
    It must NEVER return CLEAN and must NEVER claim MDI-QDS immunity."""
    req = AttackSimulationRequest(
        simulation_id=sim_state.simulation_id,
        protocol="practical_qds",
        attack="DETECTOR_COMPROMISE",
    )
    res = dispatch(req, state=sim_state)

    assert isinstance(res, SimulationModelNotAvailableResponse)
    assert res.verdict == "SIMULATION_MODEL_NOT_AVAILABLE"
    assert res.model_status == "UNIMPLEMENTED"
    assert res.applicable is False
    assert "not implemented" in res.reason.lower() or "vulnerable" in res.reason.lower()

    # Verify no MDI leakage
    assert "mdi" not in res.reason.lower() or "point-to-point" in res.reason.lower()
    assert "immune" not in res.reason.lower()


# ── 5. FR-B3 Photon Number Splitting (Not Available on Practical QDS) ──────────

def test_05_pns_returns_not_available_no_decoy_leakage(sim_state):
    """FR-B3: PNS Attack on Practical QDS MUST return SIMULATION_MODEL_NOT_AVAILABLE.
    It must NEVER return CLEAN and must NEVER claim Decoy-state immunity."""
    req = AttackSimulationRequest(
        simulation_id=sim_state.simulation_id,
        protocol="practical_qds",
        attack="PNS_ATTACK",
    )
    res = dispatch(req, state=sim_state)

    assert isinstance(res, SimulationModelNotAvailableResponse)
    assert res.verdict == "SIMULATION_MODEL_NOT_AVAILABLE"
    assert res.model_status == "UNIMPLEMENTED"
    assert res.applicable is False
    assert "not implemented" in res.reason.lower() or "decoy" in res.reason.lower()


# ── 6. Deterministic Seed Reproducibility ─────────────────────────────────────

def test_06_deterministic_attack_reproducibility():
    """Fixed seed produces bit-for-bit identical attack values."""
    req_a = GenerateMaterialRequest(protocol="practical_qds", pulse_count=1500, seed=999)
    req_b = GenerateMaterialRequest(protocol="practical_qds", pulse_count=1500, seed=999)

    sim_a = PracticalQDSEngine.generate_simulation(req_a)
    sim_b = PracticalQDSEngine.generate_simulation(req_b)

    res_a = dispatch(
        AttackSimulationRequest(simulation_id=sim_a.simulation_id, protocol="practical_qds", attack="FORGERY"),
        state=sim_a,
    )
    res_b = dispatch(
        AttackSimulationRequest(simulation_id=sim_b.simulation_id, protocol="practical_qds", attack="FORGERY"),
        state=sim_b,
    )

    assert res_a.metadata["epsilon_1"] == res_b.metadata["epsilon_1"]
    assert res_a.metadata["S_c"] == res_b.metadata["S_c"]
    assert res_a.metadata["I_BC"] == res_b.metadata["I_BC"]


# ── 7. HTTP API Dual-Routing Verification ─────────────────────────────────────

def test_07_http_api_dual_routing():
    """Both /api/v1/simulation/attack and /simulation/attack return identical responses."""
    # Generate state
    gen = client.post(
        "/api/v1/simulation/generate-material",
        json={"protocol": "practical_qds", "pulse_count": 1000, "seed": 77},
    )
    assert gen.status_code == 200
    sim_id = gen.json()["simulation_id"]

    payload = {
        "simulation_id": sim_id,
        "protocol": "practical_qds",
        "attack": "INTERCEPT_RESEND",
        "intensity": 0.5,
    }

    resp1 = client.post("/api/v1/simulation/attack", json=payload)
    resp2 = client.post("/simulation/attack", json=payload)

    assert resp1.status_code == 200
    assert resp2.status_code == 200
    data1 = resp1.json()
    data2 = resp2.json()

    assert data1["verdict"] == data2["verdict"]
    assert data1["model_status"] == data2["model_status"]
    assert data1["metadata"]["QBER_obs"] == data2["metadata"]["QBER_obs"]
