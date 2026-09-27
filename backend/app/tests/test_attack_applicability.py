"""Phase 2: Attack Applicability Matrix & Fallthrough Tests.

Validates:
  - Matrix entries for all protocols and canonical attacks
  - TEST 1: Practical QDS + Forgery → QUANTITATIVE
  - TEST 2: Practical QDS + Repudiation → QUANTITATIVE
  - TEST 3: Practical QDS + Intercept-Resend → QUANTITATIVE
  - TEST 4: Practical QDS + Detector Compromise → SIMULATION_MODEL_NOT_AVAILABLE / UNIMPLEMENTED
  - TEST 5: Practical QDS + PNS Attack → SIMULATION_MODEL_NOT_AVAILABLE / UNIMPLEMENTED
  - TEST 6: Unsupported attack NEVER returns CLEAN
  - TEST 17: All unavailable models contain model_status, reason, and SIMULATION_MODEL_NOT_AVAILABLE
"""

import pytest
from app.engine.attack_engine.attack_ids import CanonicalAttackID
from app.engine.attack_engine.applicability_matrix import (
    get_applicability,
    list_protocol_attacks,
    get_full_matrix,
)
from app.engine.attack_engine.dispatcher import dispatch
from app.schemas.attack_models import (
    AttackSimulationRequest,
    SimulationModelNotAvailableResponse,
)
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.canonical_models import GenerateMaterialRequest


@pytest.fixture
def canonical_sim_state():
    req = GenerateMaterialRequest(
        protocol="practical_qds",
        pulse_count=1000,
        distance_km=25.0,
        seed=12345,
    )
    return PracticalQDSEngine.generate_simulation(req)


def test_01_practical_qds_forgery_is_quantitative():
    """TEST 1: Practical QDS + Forgery → QUANTITATIVE."""
    entry = get_applicability("practical_qds", CanonicalAttackID.FORGERY)
    assert entry.applicable is True
    assert entry.model_status == "QUANTITATIVE"
    assert entry.quantitative_supported is True
    assert entry.model_version is not None


def test_02_practical_qds_repudiation_is_quantitative():
    """TEST 2: Practical QDS + Repudiation → QUANTITATIVE."""
    entry = get_applicability("practical_qds", CanonicalAttackID.REPUDIATION)
    assert entry.applicable is True
    assert entry.model_status == "QUANTITATIVE"
    assert entry.quantitative_supported is True
    assert entry.model_version is not None


def test_03_practical_qds_intercept_resend_is_quantitative():
    """TEST 3: Practical QDS + Intercept-Resend → QUANTITATIVE."""
    entry = get_applicability("practical_qds", CanonicalAttackID.INTERCEPT_RESEND)
    assert entry.applicable is True
    assert entry.model_status == "QUANTITATIVE"
    assert entry.quantitative_supported is True
    assert entry.model_version is not None


def test_04_practical_qds_detector_compromise_not_available(canonical_sim_state):
    """TEST 4: Practical QDS + Detector Compromise → SIMULATION_MODEL_NOT_AVAILABLE."""
    req = AttackSimulationRequest(
        simulation_id=canonical_sim_state.simulation_id,
        protocol="practical_qds",
        attack="DETECTOR_COMPROMISE",
    )
    res = dispatch(req, state=canonical_sim_state)
    assert isinstance(res, SimulationModelNotAvailableResponse)
    assert res.verdict == "SIMULATION_MODEL_NOT_AVAILABLE"
    assert res.model_status == "UNIMPLEMENTED"
    assert len(res.reason) > 0


def test_05_practical_qds_pns_attack_not_available(canonical_sim_state):
    """TEST 5: Practical QDS + PNS Attack → SIMULATION_MODEL_NOT_AVAILABLE."""
    req = AttackSimulationRequest(
        simulation_id=canonical_sim_state.simulation_id,
        protocol="practical_qds",
        attack="PNS_ATTACK",
    )
    res = dispatch(req, state=canonical_sim_state)
    assert isinstance(res, SimulationModelNotAvailableResponse)
    assert res.verdict == "SIMULATION_MODEL_NOT_AVAILABLE"
    assert res.model_status == "UNIMPLEMENTED"
    assert len(res.reason) > 0


def test_06_unsupported_attack_never_returns_clean(canonical_sim_state):
    """TEST 6: Unsupported attack NEVER returns CLEAN."""
    matrix = get_full_matrix()
    unimplemented = [e for e in matrix if e["model_status"] == "UNIMPLEMENTED"]
    assert len(unimplemented) > 0, "Matrix must have unimplemented entries"

    for entry in unimplemented:
        req = AttackSimulationRequest(
            simulation_id=canonical_sim_state.simulation_id,
            protocol=entry["protocol_id"],
            attack=entry["attack_id"],
        )
        res = dispatch(req, state=canonical_sim_state)
        # MUST NEVER BE CLEAN
        assert res.verdict != "CLEAN", (
            f"Protocol {entry['protocol_id']} with attack {entry['attack_id']} returned CLEAN!"
        )
        assert res.verdict == "SIMULATION_MODEL_NOT_AVAILABLE"


def test_17_all_unavailable_models_contain_required_fields(canonical_sim_state):
    """TEST 17: All unavailable models contain model_status, reason, SIMULATION_MODEL_NOT_AVAILABLE."""
    req = AttackSimulationRequest(
        simulation_id=canonical_sim_state.simulation_id,
        protocol="practical_qds",
        attack="UNKNOWN_SIDE_CHANNEL",
    )
    res = dispatch(req, state=canonical_sim_state)
    assert isinstance(res, SimulationModelNotAvailableResponse)
    assert res.verdict == "SIMULATION_MODEL_NOT_AVAILABLE"
    assert res.model_status == "UNIMPLEMENTED"
    assert res.reason is not None and len(res.reason) > 0
