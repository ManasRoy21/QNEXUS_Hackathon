"""Phase 2: Practical QDS Quantitative Attack Models Tests.

Validates:
  - TEST 7: Forgery result changes when simulation parameters change
  - TEST 8: Repudiation result changes when Ta/Tv/beta/Mu change
  - TEST 9: Intercept-resend QBER changes monotonically with gamma
  - TEST 10: gamma=0 gives baseline QBER
  - TEST 11: gamma=1 produces expected equation result
  - TEST 12: Deterministic numerical results for identical inputs
  - TEST 13: Different seed changes stochastic material where applicable
  - TEST 18: Invalid gamma values are rejected
"""

import pytest
from pydantic import ValidationError

from app.engine.attack_engine import practical_qds_attacks as pqa
from app.engine.attack_engine.dispatcher import dispatch
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.attack_models import AttackSimulationRequest, AttackSimulationResponse
from app.schemas.canonical_models import GenerateMaterialRequest


def _gen_sim(pulse_count=1000, distance_km=25.0, beta=0.3, ta=0.015, tv=0.0645, seed=42):
    req = GenerateMaterialRequest(
        protocol="practical_qds",
        pulse_count=pulse_count,
        distance_km=distance_km,
        beta=beta,
        authentication_threshold=ta,
        verification_threshold=tv,
        seed=seed,
    )
    return PracticalQDSEngine.generate_simulation(req)


def test_07_forgery_result_changes_with_parameters():
    """TEST 7: Forgery result changes when simulation parameters change."""
    sim1 = _gen_sim(pulse_count=1000, distance_km=10.0, seed=42)
    sim2 = _gen_sim(pulse_count=4000, distance_km=50.0, seed=42)

    res1, math1 = pqa.simulate_forgery(sim1)
    res2, math2 = pqa.simulate_forgery(sim2)

    # Different parameters should yield different conclusive counts, M_u, and epsilon_1
    assert res1["M_u"] != res2["M_u"] or res1["P_C_c"] != res2["P_C_c"]
    assert res1["epsilon_1"] != res2["epsilon_1"]


def test_08_repudiation_result_changes_with_parameters():
    """TEST 8: Repudiation result changes when Ta/Tv/beta/Mu change."""
    sim1 = _gen_sim(pulse_count=1000, beta=0.2, ta=0.01, tv=0.07, seed=42)
    sim2 = _gen_sim(pulse_count=1000, beta=0.4, ta=0.02, tv=0.05, seed=42)

    res1, math1 = pqa.simulate_repudiation(sim1)
    res2, math2 = pqa.simulate_repudiation(sim2)

    # Threshold gaps and beta differ
    assert res1["gap"] != res2["gap"]
    assert res1["beta"] != res2["beta"]
    assert res1["epsilon_2"] != res2["epsilon_2"]


def test_09_intercept_resend_qber_monotonic_with_gamma():
    """TEST 9: Intercept-resend QBER changes monotonically with gamma."""
    sim = _gen_sim(seed=100)
    gammas = [0.0, 0.25, 0.50, 0.75, 1.0]
    qbers = []
    for g in gammas:
        res, _ = pqa.simulate_eavesdropping(sim, gamma=g)
        qbers.append(res["qber_obs"])

    for i in range(len(qbers) - 1):
        assert qbers[i] <= qbers[i + 1], f"Monotonicity violated: {qbers[i]} > {qbers[i+1]}"


def test_10_gamma_zero_gives_baseline_qber():
    """TEST 10: gamma=0 gives baseline QBER."""
    sim = _gen_sim(seed=200)
    res, _ = pqa.simulate_eavesdropping(sim, gamma=0.0)
    assert res["qber_obs"] == pytest.approx(sim.measurement_statistics.qber_bob, abs=1e-9)


def test_11_gamma_one_produces_expected_equation_result():
    """TEST 11: gamma=1 produces the expected equation result."""
    sim = _gen_sim(seed=300)
    qber_base = sim.measurement_statistics.qber_bob
    expected_qber = qber_base + 0.5 * 1.0 * (1.0 - 2.0 * qber_base)

    res, _ = pqa.simulate_eavesdropping(sim, gamma=1.0)
    assert res["qber_obs"] == pytest.approx(expected_qber, abs=1e-9)


def test_12_deterministic_numerical_result():
    """TEST 12: Same seed + same simulation + same attack gives deterministic numerical result."""
    sim_a = _gen_sim(pulse_count=1500, distance_km=20.0, seed=777)
    sim_b = _gen_sim(pulse_count=1500, distance_km=20.0, seed=777)

    forg_a, _ = pqa.simulate_forgery(sim_a)
    forg_b, _ = pqa.simulate_forgery(sim_b)
    assert forg_a["epsilon_1"] == forg_b["epsilon_1"]
    assert forg_a["S_c"] == forg_b["S_c"]

    rep_a, _ = pqa.simulate_repudiation(sim_a, delta=0.005)
    rep_b, _ = pqa.simulate_repudiation(sim_b, delta=0.005)
    assert rep_a["epsilon_2"] == rep_b["epsilon_2"]

    eav_a, _ = pqa.simulate_eavesdropping(sim_a, gamma=0.42)
    eav_b, _ = pqa.simulate_eavesdropping(sim_b, gamma=0.42)
    assert eav_a["qber_obs"] == eav_b["qber_obs"]


def test_13_different_seed_changes_stochastic_material():
    """TEST 13: Different seed changes stochastic material where applicable."""
    sim1 = _gen_sim(pulse_count=2000, seed=111)
    sim2 = _gen_sim(pulse_count=2000, seed=999)

    assert sim1.material.bob_conclusive_bits != sim2.material.bob_conclusive_bits
    assert sim1.seed != sim2.seed


def test_18_invalid_gamma_values_are_rejected():
    """TEST 18: Invalid gamma values are rejected."""
    sim = _gen_sim(seed=55)

    # Negative gamma
    with pytest.raises((ValueError, ValidationError)):
        AttackSimulationRequest(
            simulation_id=sim.simulation_id,
            protocol="practical_qds",
            attack="INTERCEPT_RESEND",
            intensity=-0.1,
        )

    # Gamma > 1.0
    with pytest.raises((ValueError, ValidationError)):
        AttackSimulationRequest(
            simulation_id=sim.simulation_id,
            protocol="practical_qds",
            attack="INTERCEPT_RESEND",
            intensity=1.5,
        )
