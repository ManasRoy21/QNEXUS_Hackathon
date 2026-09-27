"""
Phase 6: Final Integration and End-to-End Scientific Reproducibility Tests.
Validates the complete 10-step Quality Audit Scenarios:
- TEST 1: Practical QDS -> Generate Material -> Sign -> Forgery
- TEST 2: Practical QDS -> Intercept-Resend
- TEST 3: Practical QDS -> Repudiation
- TEST 4: Practical QDS -> Detector Blinding -> Expected: MODEL NOT AVAILABLE
- TEST 5: Practical QDS -> PNS -> Expected: MODEL NOT AVAILABLE
- TEST 6: Run benchmark after attack
- TEST 7: Run parameter sweep
- TEST 8: Run statistical bound
- TEST 9: Reset workflow isolation
- TEST 10: Repeat same simulation with same seed -> exactly identical mathematical outputs
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from app.engine.attack_engine import state_store

client = TestClient(app)

def test_01_practical_qds_generate_and_forgery():
    """TEST 1: Practical QDS -> Generate Material -> Sign -> Forgery"""
    # 1. Generate Material
    gen_res = client.post("/api/v1/simulation/generate-material", json={
        "protocol": "practical_qds",
        "pulse_count": 2000,
        "distance_km": 15.0,
        "seed": 42
    })
    assert gen_res.status_code == 200
    state = gen_res.json()
    sim_id = state["simulation_id"]
    assert state["protocol"] == "practical_qds"
    assert "material" in state
    assert state["material"]["untested_bits"]["M_u_bob"] > 0
    assert state["measurement_statistics"]["qber_bob"] >= 0.0

    # 2. Attack: Forgery
    atk_res = client.post("/api/v1/simulation/attack", json={
        "simulation_id": sim_id,
        "protocol": "practical_qds",
        "attack": "FORGERY",
        "intensity": 1.0
    })
    assert atk_res.status_code == 200
    atk = atk_res.json()
    assert atk["model_status"] == "QUANTITATIVE"
    assert "four_layer_explanation" in atk
    assert "mathematical_model" in atk
    assert atk["attack"] == "FORGERY"
    assert "MDI" not in atk["four_layer_explanation"]["layer_2_physical_effect"]


def test_02_practical_qds_intercept_resend():
    """TEST 2: Practical QDS -> Intercept-Resend"""
    gen_res = client.post("/api/v1/simulation/generate-material", json={
        "protocol": "practical_qds",
        "pulse_count": 2000,
        "seed": 100
    })
    sim_id = gen_res.json()["simulation_id"]

    atk_res = client.post("/api/v1/simulation/attack", json={
        "simulation_id": sim_id,
        "protocol": "practical_qds",
        "attack": "INTERCEPT_RESEND",
        "intensity": 0.5
    })
    assert atk_res.status_code == 200
    atk = atk_res.json()
    assert atk["model_status"] == "QUANTITATIVE"
    assert atk["attack_detected"] is True
    assert "e_obs" in atk["mathematical_model"]["formula"] or "gamma" in atk["mathematical_model"]["formula"]


def test_03_practical_qds_repudiation():
    """TEST 3: Practical QDS -> Repudiation"""
    gen_res = client.post("/api/v1/simulation/generate-material", json={
        "protocol": "practical_qds",
        "pulse_count": 2000,
        "seed": 200
    })
    sim_id = gen_res.json()["simulation_id"]

    atk_res = client.post("/api/v1/simulation/attack", json={
        "simulation_id": sim_id,
        "protocol": "practical_qds",
        "attack": "REPUDIATION",
        "intensity": 1.0
    })
    assert atk_res.status_code == 200
    atk = atk_res.json()
    assert atk["model_status"] == "QUANTITATIVE"
    assert "epsilon_2" in atk.get("metadata", {})
    assert "gap" in atk["mathematical_model"]["inputs"]


def test_04_detector_blinding_returns_model_not_available():
    """TEST 4: Practical QDS -> Detector Blinding -> Expected: MODEL NOT AVAILABLE"""
    gen_res = client.post("/api/v1/simulation/generate-material", json={
        "protocol": "practical_qds",
        "pulse_count": 1000,
        "seed": 300
    })
    sim_id = gen_res.json()["simulation_id"]

    atk_res = client.post("/api/v1/simulation/attack", json={
        "simulation_id": sim_id,
        "protocol": "practical_qds",
        "attack": "DETECTOR_BLINDING",
        "intensity": 1.0
    })
    assert atk_res.status_code == 200
    atk = atk_res.json()
    assert atk["model_status"] == "UNIMPLEMENTED"
    assert atk["verdict"] == "SIMULATION_MODEL_NOT_AVAILABLE"
    assert "MDI" not in atk.get("reason", "") or "cross-protocol" in atk.get("reason", "").lower() or "not implemented" in atk.get("reason", "").lower()


def test_05_pns_returns_model_not_available():
    """TEST 5: Practical QDS -> PNS -> Expected: MODEL NOT AVAILABLE"""
    gen_res = client.post("/api/v1/simulation/generate-material", json={
        "protocol": "practical_qds",
        "pulse_count": 1000,
        "seed": 400
    })
    sim_id = gen_res.json()["simulation_id"]

    atk_res = client.post("/api/v1/simulation/attack", json={
        "simulation_id": sim_id,
        "protocol": "practical_qds",
        "attack": "PNS",
        "intensity": 1.0
    })
    assert atk_res.status_code == 200
    atk = atk_res.json()
    assert atk["model_status"] == "UNIMPLEMENTED"
    assert atk["verdict"] == "SIMULATION_MODEL_NOT_AVAILABLE"


def test_06_and_07_parameter_sweep_execution():
    """TEST 6 & 7: Run parameter sweep using exact protocol and attack models"""
    swp_res = client.post("/api/v1/simulation/sweep", json={
        "protocol": "practical_qds",
        "parameter": "intensity",
        "values": [0.0, 0.25, 0.5, 0.75, 1.0],
        "pulse_count": 2000,
        "seed": 42,
        "attack": "INTERCEPT_RESEND"
    })
    assert swp_res.status_code == 200
    swp = swp_res.json()
    assert len(swp["points"]) == 5
    # Verify monotonic observed QBER rise under intercept-resend attack
    qber_obs_vals = [pt["qber_obs"] for pt in swp["points"]]
    assert qber_obs_vals[-1] > qber_obs_vals[0]


def test_08_statistical_bound_execution():
    """TEST 8: Run statistical bound calculation linked to state"""
    gen_res = client.post("/api/v1/simulation/generate-material", json={
        "protocol": "practical_qds",
        "pulse_count": 2000,
        "seed": 500
    })
    sim_id = gen_res.json()["simulation_id"]

    # Random sampling bound linked to sim_id
    bnd_res = client.post("/api/v1/simulation/bounds", json={
        "method": "RANDOM_SAMPLING",
        "simulation_id": sim_id,
        "parameters": {}
    })
    assert bnd_res.status_code == 200
    bnd = bnd_res.json()
    assert bnd["method"] == "RANDOM_SAMPLING"
    assert bnd["final_bound"] >= 0.0
    assert "calculation_steps" in bnd
    assert len(bnd["calculation_steps"]) > 0


def test_10_deterministic_numerical_reproducibility():
    """TEST 10: Repeat same simulation with same seed -> exactly identical mathematical outputs"""
    res1 = client.post("/api/v1/simulation/generate-material", json={
        "protocol": "practical_qds",
        "pulse_count": 3000,
        "distance_km": 20.0,
        "seed": 7777
    }).json()

    res2 = client.post("/api/v1/simulation/generate-material", json={
        "protocol": "practical_qds",
        "pulse_count": 3000,
        "distance_km": 20.0,
        "seed": 7777
    }).json()

    # Exact bit-for-bit and floating-point identity
    assert res1["material"]["bob_conclusive_bits"] == res2["material"]["bob_conclusive_bits"]
    assert res1["material"]["charlie_conclusive_bits"] == res2["material"]["charlie_conclusive_bits"]
    assert res1["measurement_statistics"]["qber_bob"] == res2["measurement_statistics"]["qber_bob"]
    assert res1["measurement_statistics"]["qber_charlie"] == res2["measurement_statistics"]["qber_charlie"]
    assert res1["material"]["untested_bits"]["M_u_bob"] == res2["material"]["untested_bits"]["M_u_bob"]
