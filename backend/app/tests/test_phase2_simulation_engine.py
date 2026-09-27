"""Phase 2 Backend Test Suite: Practical QDS Quantum Simulation Engine.

Verifies:
  1. Deterministic seed reproducibility
  2. Different seeds producing distinct stochastic material
  3. Zero-attack baseline error rate consistency
  4. Channel distance effect on optical transmittance and conclusive bit yield
  5. Detector efficiency effect on detection events
  6. Dark count effect on detections and background noise
  7. Test-bit sampling split (beta fraction)
  8. Conclusive-bit generation (click & basis match filtering)
  9. Invalid parameter boundary rejection (HTTP 422 & ValidationError)
  10. Traceability & metric origin calculations
  11. Dual endpoint routing (/api/v1/simulation/generate-material and /simulation/generate-material)
"""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.canonical_models import GenerateMaterialRequest
from main import app

client = TestClient(app)


def test_01_deterministic_seed_reproducibility():
    """1. Deterministic seed: Same protocol + parameters + seed produces identical output."""
    seed = 8492019
    req1 = GenerateMaterialRequest(seed=seed, pulse_count=6000, distance_km=22.5)
    req2 = GenerateMaterialRequest(seed=seed, pulse_count=6000, distance_km=22.5)

    s1 = PracticalQDSEngine.generate_simulation(req1)
    s2 = PracticalQDSEngine.generate_simulation(req2)

    assert s1.seed == s2.seed == seed
    assert s1.material.bob_conclusive_bits == s2.material.bob_conclusive_bits
    assert s1.material.charlie_conclusive_bits == s2.material.charlie_conclusive_bits
    assert s1.measurement_statistics.conclusive_count_bob == s2.measurement_statistics.conclusive_count_bob
    assert s1.measurement_statistics.mismatch_count_bob == s2.measurement_statistics.mismatch_count_bob
    assert s1.measurement_statistics.qber_bob == s2.measurement_statistics.qber_bob
    assert s1.measurement_statistics.qber_charlie == s2.measurement_statistics.qber_charlie
    assert s1.material.test_bits == s2.material.test_bits
    assert s1.material.untested_bits == s2.material.untested_bits


def test_02_different_seeds_produce_different_material():
    """2. Different seeds: Different seeds produce distinct stochastic outputs."""
    req1 = GenerateMaterialRequest(seed=12345, pulse_count=5000)
    req2 = GenerateMaterialRequest(seed=67890, pulse_count=5000)

    s1 = PracticalQDSEngine.generate_simulation(req1)
    s2 = PracticalQDSEngine.generate_simulation(req2)

    assert s1.seed != s2.seed
    assert s1.material.bob_conclusive_bits != s2.material.bob_conclusive_bits
    assert s1.material.charlie_conclusive_bits != s2.material.charlie_conclusive_bits


def test_03_zero_attack_baseline():
    """3. Zero attack baseline: Under low noise e0=0.010 and p_dark=1e-7, observed QBER is close to e0."""
    req = GenerateMaterialRequest(
        seed=500,
        pulse_count=20000,
        distance_km=15.0,
        baseline_qber=0.010,
        dark_count_rate=1.0e-7,
    )
    state = PracticalQDSEngine.generate_simulation(req)

    # Observed QBER should be within statistical deviation of baseline e0 = 1.0%
    assert abs(state.measurement_statistics.qber_bob - 0.010) < 0.005
    assert abs(state.measurement_statistics.qber_charlie - 0.010) < 0.005
    assert state.measurement_statistics.qber_bob <= state.configuration.authentication_threshold


def test_04_channel_distance_effect():
    """4. Channel distance: Increasing fiber distance reduces transmittance and conclusive yield."""
    req_short = GenerateMaterialRequest(seed=314, distance_km=5.0, pulse_count=10000)
    req_long = GenerateMaterialRequest(seed=314, distance_km=60.0, pulse_count=10000)

    s_short = PracticalQDSEngine.generate_simulation(req_short)
    s_long = PracticalQDSEngine.generate_simulation(req_long)

    assert s_short.measurement_statistics.conclusive_count_bob > s_long.measurement_statistics.conclusive_count_bob
    assert s_short.measurement_statistics.conclusive_count_charlie > s_long.measurement_statistics.conclusive_count_charlie
    assert s_short.trace["transmittance"]["result"] > s_long.trace["transmittance"]["result"]


def test_05_detector_efficiency_effect():
    """5. Detector efficiency: Higher detector efficiency increases detection events."""
    req_high_eff = GenerateMaterialRequest(seed=999, detector_efficiency=0.93, pulse_count=8000)
    req_low_eff = GenerateMaterialRequest(seed=999, detector_efficiency=0.30, pulse_count=8000)

    s_high = PracticalQDSEngine.generate_simulation(req_high_eff)
    s_low = PracticalQDSEngine.generate_simulation(req_low_eff)

    assert s_high.measurement_statistics.detected_events > s_low.measurement_statistics.detected_events
    assert s_high.measurement_statistics.conclusive_count_bob > s_low.measurement_statistics.conclusive_count_bob


def test_06_dark_count_effect():
    """6. Dark count: Higher dark count increases non-signal clicks and background error rate."""
    req_zero_dark = GenerateMaterialRequest(seed=111, dark_count_rate=0.0, distance_km=40.0, pulse_count=10000)
    req_high_dark = GenerateMaterialRequest(seed=111, dark_count_rate=0.02, distance_km=40.0, pulse_count=10000)

    s_zero = PracticalQDSEngine.generate_simulation(req_zero_dark)
    s_dark = PracticalQDSEngine.generate_simulation(req_high_dark)

    assert s_dark.measurement_statistics.detected_events > s_zero.measurement_statistics.detected_events
    assert s_dark.measurement_statistics.mismatch_count_bob >= s_zero.measurement_statistics.mismatch_count_bob


def test_07_test_bit_sampling():
    """7. Test-bit sampling: Beta fraction properly splits conclusive bits into test bits and untested M_u."""
    beta = 0.30
    req = GenerateMaterialRequest(seed=777, beta=beta, pulse_count=10000)
    state = PracticalQDSEngine.generate_simulation(req)

    k_b = state.measurement_statistics.conclusive_count_bob
    n_test = state.material.test_bits["bob_test_count"]
    m_u = state.material.untested_bits["M_u_bob"]

    assert n_test == int(k_b * beta)
    assert m_u == k_b - n_test
    assert n_test + m_u == k_b
    assert len(state.material.bob_conclusive_bits) == k_b


def test_08_conclusive_bit_generation():
    """8. Conclusive-bit generation: Conclusive bits require click AND basis match."""
    req = GenerateMaterialRequest(seed=222, pulse_count=10000, baseline_qber=0.01)
    state = PracticalQDSEngine.generate_simulation(req)

    # In BB84 / Practical QDS, basis match probability is ~50%, so conclusive rate <= 50%
    conclusive_rate = state.measurement_statistics.conclusive_count_bob / state.configuration.pulse_count
    assert 0.0 < conclusive_rate < 0.50

    # Ensure conclusive bits string consists strictly of 0 and 1
    assert all(c in ("0", "1") for c in state.material.bob_conclusive_bits)
    assert all(c in ("0", "1") for c in state.material.charlie_conclusive_bits)


def test_09_invalid_parameter_handling():
    """9. Invalid parameter handling: Rejects invalid inputs with validation errors."""
    # Negative pulse count
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(pulse_count=-5)

    # Distance > 500 km
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(distance_km=600.0)

    # Fiber attenuation <= 0
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(fiber_attenuation=0.0)

    # Baseline QBER >= 0.50
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(baseline_qber=0.50)

    # Beta >= 1.0
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(beta=1.0)

    # Ta >= Tv (violation of threshold ordering)
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(authentication_threshold=0.08, verification_threshold=0.05)


def test_10_traceability_and_metric_origins():
    """10. Traceability: Every major metric exposes its mathematical formula, inputs, steps, and result."""
    req = GenerateMaterialRequest(seed=444, pulse_count=8000)
    state = PracticalQDSEngine.generate_simulation(req)

    assert "transmittance" in state.trace
    assert "detection_probability" in state.trace
    assert "qber_bob" in state.trace
    assert "qber_charlie" in state.trace
    assert "test_bit_split" in state.trace

    # Check QBER Bob trace
    qber_trace = state.trace["qber_bob"]
    assert "formula" in qber_trace
    assert "inputs" in qber_trace
    assert "calculation_steps" in qber_trace
    assert "result" in qber_trace
    assert len(qber_trace["calculation_steps"]) >= 2
    assert qber_trace["result"] == state.measurement_statistics.qber_bob

    # Check Model Metadata disclaimer
    assert state.model_metadata.model_type == "SIMULATION MODEL"
    assert "SIMULATION MODEL" in state.model_metadata.disclaimer


def test_11_api_dual_endpoints():
    """11. API Routing: Both /api/v1/simulation/generate-material and /simulation/generate-material work."""
    payload = {
        "protocol": "practical_qds",
        "pulse_count": 4000,
        "distance_km": 15.0,
        "seed": 98765,
    }

    # Test /api/v1/simulation/generate-material
    r1 = client.post("/api/v1/simulation/generate-material", json=payload)
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1["protocol"] == "practical_qds"
    assert data1["seed"] == 98765
    assert "thresholds" in data1
    assert "trace" in data1
    assert "warnings" in data1

    # Test /simulation/generate-material
    r2 = client.post("/simulation/generate-material", json=payload)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["protocol"] == "practical_qds"
    assert data2["seed"] == 98765
    assert data1["material"]["bob_conclusive_bits"] == data2["material"]["bob_conclusive_bits"]
