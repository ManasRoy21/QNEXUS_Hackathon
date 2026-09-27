"""Phase 2: Attack Dispatcher & Endpoint Tests.

Validates:
  - Centralized dispatcher execution
  - TEST 16: All quantitative attack responses contain four_layer_explanation and mathematical_model
  - API endpoint: POST /api/v1/simulation/attack
  - Session state retrieval by simulation_id
"""

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import simulation
from app.engine.attack_engine import state_store
from app.engine.attack_engine.dispatcher import dispatch
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.attack_models import (
    AttackSimulationRequest,
    AttackSimulationResponse,
    SimulationModelNotAvailableResponse,
)
from app.schemas.canonical_models import GenerateMaterialRequest
from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_state():
    state_store.clear()
    req = GenerateMaterialRequest(
        protocol="practical_qds",
        pulse_count=1200,
        distance_km=25.0,
        seed=10101,
    )
    sim_state = PracticalQDSEngine.generate_simulation(req)
    state_store.save(sim_state)
    return sim_state


def test_16_quantitative_response_structure(setup_state):
    """TEST 16: All quantitative attack responses contain four_layer_explanation and mathematical_model."""
    sim = setup_state
    for atk in ["FORGERY", "REPUDIATION", "INTERCEPT_RESEND"]:
        req = AttackSimulationRequest(
            simulation_id=sim.simulation_id,
            protocol="practical_qds",
            attack=atk,
            intensity=0.8,
        )
        res = dispatch(req, state=sim)
        assert isinstance(res, AttackSimulationResponse)
        assert res.model_status == "QUANTITATIVE"
        assert res.four_layer_explanation is not None
        assert res.four_layer_explanation.layer_1_attacker_action
        assert res.four_layer_explanation.layer_2_physical_effect
        assert res.four_layer_explanation.layer_3_observable_effect
        assert res.four_layer_explanation.layer_4_security_consequence

        assert res.mathematical_model is not None
        assert res.mathematical_model.formula
        assert res.mathematical_model.inputs
        assert res.mathematical_model.final_result is not None


def test_api_attack_endpoint_lifecycle(setup_state):
    """Test full HTTP POST flow for generate-material and attack."""
    # 1. Generate material
    gen_resp = client.post(
        "/api/v1/simulation/generate-material",
        json={"protocol": "practical_qds", "pulse_count": 1000, "seed": 42},
    )
    assert gen_resp.status_code == 200
    sim_id = gen_resp.json()["simulation_id"]

    # 2. Run Forgery attack via HTTP
    atk_resp = client.post(
        "/api/v1/simulation/attack",
        json={
            "simulation_id": sim_id,
            "protocol": "practical_qds",
            "attack": "FORGERY",
        },
    )
    assert atk_resp.status_code == 200
    data = atk_resp.json()
    assert data["model_status"] == "QUANTITATIVE"
    assert data["verdict"] in ("FORGERY_BOUNDED", "FORGERY_UNBOUNDED")
    assert "four_layer_explanation" in data
    assert "mathematical_model" in data

    # 3. Run Unsupported attack (Detector Compromise on Practical QDS)
    unsupp_resp = client.post(
        "/api/v1/simulation/attack",
        json={
            "simulation_id": sim_id,
            "protocol": "practical_qds",
            "attack": "DETECTOR_COMPROMISE",
        },
    )
    assert unsupp_resp.status_code == 200
    unsupp_data = unsupp_resp.json()
    assert unsupp_data["verdict"] == "SIMULATION_MODEL_NOT_AVAILABLE"
    assert unsupp_data["model_status"] == "UNIMPLEMENTED"


def test_qualitative_models_dispatch(setup_state):
    """Test that qualitative models (MDI, OTUH, TF, Decoy) dispatch correctly."""
    sim = setup_state

    # MDI Detector compromise
    res_mdi = dispatch(
        AttackSimulationRequest(
            simulation_id=sim.simulation_id,
            protocol="mdi_qds",
            attack="DETECTOR_COMPROMISE",
        ),
        state=sim,
    )
    assert res_mdi.model_status == "QUALITATIVE"
    assert res_mdi.verdict == "SECURE_IMMUNE"
    assert res_mdi.mathematical_model is None
    assert res_mdi.four_layer_explanation is not None

    # Decoy PNS attack
    res_decoy = dispatch(
        AttackSimulationRequest(
            simulation_id=sim.simulation_id,
            protocol="decoy_qds",
            attack="PNS_ATTACK",
        ),
        state=sim,
    )
    assert res_decoy.model_status == "QUALITATIVE"
    assert res_decoy.verdict == "REJECT_PNS_BREACH"
    assert res_decoy.mathematical_model is None
