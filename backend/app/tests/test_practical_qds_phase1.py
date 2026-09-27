"""Phase 1 Backend Verification Test Suite: Practical QDS Simulation Engine.

Verifies:
  TEST 1: Default Practical QDS generation
  TEST 2: Fixed seed reproducibility
  TEST 3: Different seed produces different stochastic material
  TEST 4: Distance affects channel transmittance
  TEST 5: Detector efficiency affects detections
  TEST 6: Dark count affects measurement statistics
  TEST 7: Baseline QBER affects generated errors
  TEST 8: Beta correctly determines test-bit / untested split
  TEST 9: QBER is calculated from actual counts
  TEST 10: Binary entropy handles p=0 and p=1 safely
  TEST 11: Sc solver returns a valid value when a solution exists
  TEST 12: Invalid parameters are rejected (HTTP 422 / Pydantic ValidationError)
"""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.engine.quantum.entropy import binary_entropy, solve_minimum_sc
from app.schemas.canonical_models import GenerateMaterialRequest
from main import app

client = TestClient(app)


def test_01_default_practical_qds_generation():
    """TEST 1: Default Practical QDS generation returns valid canonical state."""
    req = GenerateMaterialRequest()
    state = PracticalQDSEngine.generate_simulation(req)

    assert state.protocol == "practical_qds"
    assert state.model_version == "practical_qds_v1"
    assert state.simulation_id.startswith("sim-qds-")
    assert isinstance(state.seed, int)
    assert state.timestamp > 0

    # Verification of material structure
    assert len(state.material.generated_states) > 0
    assert len(state.material.bob_conclusive_bits) > 0
    assert len(state.material.charlie_conclusive_bits) > 0
    assert state.measurement_statistics.conclusive_count_bob > 0
    assert state.measurement_statistics.conclusive_count_charlie > 0

    # Verification of metadata
    assert state.model_metadata.model_version == "practical_qds_v1"
    assert len(state.model_metadata.assumptions) >= 4
    assert len(state.model_metadata.simplifications) >= 4


def test_02_fixed_seed_reproducibility():
    """TEST 2: Identical seed produces 100% bit-for-bit identical outputs."""
    fixed_seed = 4202918
    req1 = GenerateMaterialRequest(seed=fixed_seed, pulse_count=5000, distance_km=25.0)
    req2 = GenerateMaterialRequest(seed=fixed_seed, pulse_count=5000, distance_km=25.0)

    state1 = PracticalQDSEngine.generate_simulation(req1)
    state2 = PracticalQDSEngine.generate_simulation(req2)

    assert state1.seed == state2.seed == fixed_seed
    assert state1.material.bob_conclusive_bits == state2.material.bob_conclusive_bits
    assert state1.material.charlie_conclusive_bits == state2.material.charlie_conclusive_bits
    assert state1.measurement_statistics.conclusive_count_bob == state2.measurement_statistics.conclusive_count_bob
    assert state1.measurement_statistics.conclusive_count_charlie == state2.measurement_statistics.conclusive_count_charlie
    assert state1.measurement_statistics.mismatch_count_bob == state2.measurement_statistics.mismatch_count_bob
    assert state1.measurement_statistics.mismatch_count_charlie == state2.measurement_statistics.mismatch_count_charlie
    assert state1.measurement_statistics.qber_bob == state2.measurement_statistics.qber_bob
    assert state1.measurement_statistics.qber_charlie == state2.measurement_statistics.qber_charlie
    assert state1.material.test_bits == state2.material.test_bits
    assert state1.material.untested_bits == state2.material.untested_bits


def test_03_different_seed_produces_different_material():
    """TEST 3: Different seeds produce distinct stochastic simulation outputs."""
    req1 = GenerateMaterialRequest(seed=1001, pulse_count=5000)
    req2 = GenerateMaterialRequest(seed=2002, pulse_count=5000)

    state1 = PracticalQDSEngine.generate_simulation(req1)
    state2 = PracticalQDSEngine.generate_simulation(req2)

    assert state1.seed != state2.seed
    assert state1.material.bob_conclusive_bits != state2.material.bob_conclusive_bits


def test_04_distance_affects_channel_transmittance():
    """TEST 4: Fiber distance decreases channel transmittance and conclusive bit yield."""
    # Transmittance formula check
    eta_0 = PracticalQDSEngine.calculate_transmittance(0.0, 0.160)
    eta_50 = PracticalQDSEngine.calculate_transmittance(50.0, 0.160)
    eta_100 = PracticalQDSEngine.calculate_transmittance(100.0, 0.160)

    assert eta_0 == 1.0
    assert eta_0 > eta_50 > eta_100

    # Simulation yield comparison with fixed seed
    req_near = GenerateMaterialRequest(seed=777, distance_km=5.0, pulse_count=10000)
    req_far = GenerateMaterialRequest(seed=777, distance_km=80.0, pulse_count=10000)

    state_near = PracticalQDSEngine.generate_simulation(req_near)
    state_far = PracticalQDSEngine.generate_simulation(req_far)

    assert state_near.measurement_statistics.conclusive_count_bob > state_far.measurement_statistics.conclusive_count_bob


def test_05_detector_efficiency_affects_detections():
    """TEST 5: Higher detector efficiency increases conclusive detection counts."""
    req_high = GenerateMaterialRequest(seed=888, detector_efficiency=0.93, pulse_count=8000)
    req_low = GenerateMaterialRequest(seed=888, detector_efficiency=0.20, pulse_count=8000)

    state_high = PracticalQDSEngine.generate_simulation(req_high)
    state_low = PracticalQDSEngine.generate_simulation(req_low)

    assert state_high.measurement_statistics.conclusive_count_bob > state_low.measurement_statistics.conclusive_count_bob
    assert state_high.measurement_statistics.conclusive_count_charlie > state_low.measurement_statistics.conclusive_count_charlie


def test_06_dark_count_affects_measurement_statistics():
    """TEST 6: Increased dark count rate injects additional detection events."""
    req_clean = GenerateMaterialRequest(seed=999, dark_count_rate=0.0, pulse_count=10000, distance_km=50.0)
    req_noisy = GenerateMaterialRequest(seed=999, dark_count_rate=0.05, pulse_count=10000, distance_km=50.0)

    state_clean = PracticalQDSEngine.generate_simulation(req_clean)
    state_noisy = PracticalQDSEngine.generate_simulation(req_noisy)

    assert state_noisy.measurement_statistics.detected_events > state_clean.measurement_statistics.detected_events


def test_07_baseline_qber_affects_generated_errors():
    """TEST 7: Baseline QBER directly scales observed error count."""
    req_zero_err = GenerateMaterialRequest(seed=1234, baseline_qber=0.0, dark_count_rate=0.0, pulse_count=6000)
    req_high_err = GenerateMaterialRequest(seed=1234, baseline_qber=0.15, dark_count_rate=0.0, pulse_count=6000)

    state_zero = PracticalQDSEngine.generate_simulation(req_zero_err)
    state_high = PracticalQDSEngine.generate_simulation(req_high_err)

    assert state_zero.measurement_statistics.mismatch_count_bob == 0
    assert state_zero.measurement_statistics.qber_bob == 0.0
    assert state_high.measurement_statistics.mismatch_count_bob > 0
    assert state_high.measurement_statistics.qber_bob > 0.10


def test_08_beta_determines_test_bit_split():
    """TEST 8: Parameter estimation fraction beta precisely divides conclusive bits."""
    beta = 0.35
    req = GenerateMaterialRequest(seed=555, beta=beta, pulse_count=8000)
    state = PracticalQDSEngine.generate_simulation(req)

    k_b = state.measurement_statistics.conclusive_count_bob
    expected_n_test = int(k_b * beta)
    expected_m_u = k_b - expected_n_test

    assert state.material.test_bits["bob_test_count"] == expected_n_test
    assert state.material.untested_bits["M_u_bob"] == expected_m_u
    assert expected_n_test + expected_m_u == k_b


def test_09_qber_calculated_from_actual_counts():
    """TEST 9: QBER metric is strictly calculated as mismatch_count / conclusive_count."""
    req = GenerateMaterialRequest(seed=4321, baseline_qber=0.04, pulse_count=10000)
    state = PracticalQDSEngine.generate_simulation(req)

    stats = state.measurement_statistics
    assert stats.conclusive_count_bob > 0
    expected_qber_b = stats.mismatch_count_bob / stats.conclusive_count_bob
    assert abs(stats.qber_bob - expected_qber_b) < 1e-4

    assert stats.conclusive_count_charlie > 0
    expected_qber_c = stats.mismatch_count_charlie / stats.conclusive_count_charlie
    assert abs(stats.qber_charlie - expected_qber_c) < 1e-4

    # Confirms no hardcoded arbitrary constants
    assert stats.qber_bob not in (0.25, 0.35, 0.2542, 0.485)


def test_10_binary_entropy_limits():
    """TEST 10: Binary Shannon entropy safely evaluates limits at p=0 and p=1."""
    assert binary_entropy(0.0) == 0.0
    assert binary_entropy(1.0) == 0.0
    assert binary_entropy(0.5) == 1.0

    # Monotonicity on [0, 0.5]
    assert 0.0 < binary_entropy(0.1) < binary_entropy(0.2) < binary_entropy(0.4) < 1.0

    # Bounds validation
    with pytest.raises(ValueError):
        binary_entropy(-0.01)
    with pytest.raises(ValueError):
        binary_entropy(1.01)


def test_11_sc_solver_numerical_root():
    """TEST 11: Sc solver finds valid minimal mismatch root satisfying H(S_c) >= 1 - I(B:C)."""
    # Case A: Typical mutual information I(B:C) = 0.3 -> Target entropy = 0.70
    res_a = solve_minimum_sc(I_BC=0.3)
    assert res_a["solution_exists"] is True
    assert 0.0 < res_a["S_c"] < 0.5
    assert abs(res_a["H_Sc"] - 0.70) < 1e-6

    # Case B: Zero mutual information I(B:C) = 0.0 -> Maximum uncertainty S_c = 0.5
    res_b = solve_minimum_sc(I_BC=0.0)
    assert res_b["solution_exists"] is True
    assert res_b["S_c"] == 0.5
    assert res_b["H_Sc"] == 1.0

    # Case C: Complete mutual information I(B:C) = 1.0 -> Zero uncertainty S_c = 0.0
    res_c = solve_minimum_sc(I_BC=1.0)
    assert res_c["solution_exists"] is True
    assert res_c["S_c"] == 0.0

    # Case D: Unphysical negative mutual information I(B:C) = -0.2 -> No root
    res_d = solve_minimum_sc(I_BC=-0.2)
    assert res_d["solution_exists"] is False


def test_12_invalid_parameters_rejected():
    """TEST 12: API and Schema reject out-of-boundary simulation parameters."""
    # 1. Negative pulse count
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(pulse_count=-100)

    # 2. Negative distance
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(distance_km=-5.0)

    # 3. Non-positive attenuation
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(fiber_attenuation=0.0)

    # 4. Detector efficiency out of range
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(detector_efficiency=1.5)

    # 5. Baseline QBER >= 0.50
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(baseline_qber=0.55)

    # 6. Beta >= 1.0
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(beta=1.0)

    # 7. Authentication threshold Ta >= Verification threshold Tv
    with pytest.raises(ValidationError):
        GenerateMaterialRequest(authentication_threshold=0.10, verification_threshold=0.05)

    # 8. Test HTTP endpoint validation via FastAPI TestClient
    response = client.post(
        "/api/v1/simulation/generate-material",
        json={"pulse_count": -50, "protocol": "practical_qds"},
    )
    assert response.status_code == 422

    # 9. Unsupported protocol in Phase 1
    unsupported_resp = client.post(
        "/api/v1/simulation/generate-material",
        json={"protocol": "uncalibrated_qds"},
    )
    assert unsupported_resp.status_code == 400
