"""Phase 5 Comprehensive Verification Test Suite — Statistical Security Bounds Engine.

Validates:
  1. Hoeffding Inequality: P(|X̄ - E[X]| >= ε) <= 2 exp(-2nε²)
     Exposes: n, epsilon, confidence, observed value, bound
  2. Chernoff Formulation: P(X <= (1-δ)μ) <= exp(-δ² μ / 2)
     Exposes: μ, δ, bound
  3. Random Sampling: Practical QDS test-bit vs untested register analysis
     Exposes: Ta, Tv, Delta, beta, n_test, Mu, bound
  4. Protocol Bound: Practical QDS Information-Theoretic security equations
     Exposes: Forgery bound (ε₁), Repudiation bound (ε₂), Failure probability (ε_sec)
  5. Mathematical Transparency Panel:
     INPUTS, FORMULA, SUBSTITUTION, CALCULATION, FINAL BOUND, INTERPRETATION
  6. Scientific Transparency:
     Clear labeling of simulation approximations, no fabricated certainty.
  7. API Endpoints:
     POST /simulation/bounds and POST /api/v1/simulation/bounds
  8. Simulation State Integration:
     Auto-population of parameters via simulation_id from genuine quantum physics state.
"""

import math
import pytest
from fastapi.testclient import TestClient

from main import app
from app.engine.analytics.statistical_bounds import StatisticalBoundsEngine
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.engine.attack_engine import state_store
from app.schemas.analytics_models import (
    StatisticalBoundRequest,
    StatisticalBoundResponse,
)
from app.schemas.canonical_models import GenerateMaterialRequest

client = TestClient(app)


# ──────────────────────────────────────────────────────────────────────────────
# 1. HOEFFDING INEQUALITY
# ──────────────────────────────────────────────────────────────────────────────
def test_01_hoeffding_inequality_exact_values():
    """Verify Hoeffding inequality: P(|X̄ - E[X]| >= ε) <= 2 exp(-2nε²)."""
    n = 2000
    eps = 0.04
    obs = 0.015

    req = StatisticalBoundRequest(
        method="HOEFFDING",
        sample_size=n,
        delta=eps,
        observed_rate=obs,
    )
    res = StatisticalBoundsEngine.calculate(req)

    assert res.method == "HOEFFDING"
    # Expected exponent: -2 * 2000 * (0.04)^2 = -2 * 2000 * 0.0016 = -6.4
    expected_exponent = -2.0 * n * (eps ** 2)
    expected_bound = 2.0 * math.exp(expected_exponent)

    assert res.final_bound == pytest.approx(expected_bound, rel=1e-5)
    assert res.failure_probability == pytest.approx(expected_bound, rel=1e-5)
    assert res.confidence == pytest.approx(1.0 - expected_bound, rel=1e-5)

    # Exposed fields check
    assert "n" in res.inputs
    assert res.inputs["n"] == n
    assert "epsilon" in res.inputs
    assert res.inputs["epsilon"] == eps
    assert "observed_value" in res.inputs
    assert res.inputs["observed_value"] == obs
    assert "confidence" in res.inputs

    # Mathematical transparency check
    assert "exp(-2n" in res.formula or r"\exp(-2n" in res.formula
    assert "Substitution" in res.substitution or res.substitution != ""
    assert len(res.calculation_steps) >= 5
    assert "true expectation" in res.interpretation.lower()
    assert "assumes" in res.interpretation.lower()


# ──────────────────────────────────────────────────────────────────────────────
# 2. CHERNOFF BOUND
# ──────────────────────────────────────────────────────────────────────────────
def test_02_chernoff_lower_tail_formulation():
    """Verify Chernoff formulation: P(X <= (1-δ)μ) <= exp(-δ² μ / 2)."""
    mu = 150.0
    delta = 0.20

    req = StatisticalBoundRequest(
        method="CHERNOFF",
        parameters={"mu": mu, "delta": delta},
    )
    res = StatisticalBoundsEngine.calculate(req)

    assert res.method == "CHERNOFF"
    # Expected exponent: - (0.20^2 * 150.0) / 2 = - (0.04 * 150) / 2 = -3.0
    expected_exponent = -(delta ** 2 * mu) / 2.0
    expected_bound = math.exp(expected_exponent)

    assert res.final_bound == pytest.approx(expected_bound, rel=1e-5)
    assert res.result == pytest.approx(expected_bound, rel=1e-5)

    # Exposed fields check
    assert res.inputs["mu"] == pytest.approx(mu)
    assert res.inputs["delta"] == pytest.approx(delta)
    assert "lower_threshold" in res.inputs
    assert res.inputs["lower_threshold"] == pytest.approx((1.0 - delta) * mu)

    # Mathematical transparency check
    assert "exp(-δ² μ / 2)" in res.formula or r"\exp\left(-\frac{\delta^2 \mu}{2}\right)" in res.formula
    assert len(res.calculation_steps) >= 4
    assert res.interpretation != ""
    assert res.scientific_disclaimer != ""


# ──────────────────────────────────────────────────────────────────────────────
# 3. RANDOM SAMPLING (Practical QDS Protocol-Specific)
# ──────────────────────────────────────────────────────────────────────────────
def test_03_random_sampling_practical_qds():
    """Verify protocol-specific random sampling uses Ta, Tv, Delta, beta, n_test, Mu."""
    Ta = 0.0150
    Tv = 0.0645
    Delta = 0.0050
    beta = 0.30
    n_test = 600
    Mu = 1400

    req = StatisticalBoundRequest(
        method="RANDOM_SAMPLING",
        parameters={
            "Ta": Ta,
            "Tv": Tv,
            "Delta": Delta,
            "beta": beta,
            "n_test": n_test,
            "Mu": Mu,
        },
    )
    res = StatisticalBoundsEngine.calculate(req)

    assert res.method == "RANDOM_SAMPLING"
    # Do NOT replace with generic Hoeffding
    assert res.method != "HOEFFDING"
    assert "T_v" in res.formula or "Tv" in res.formula or "T_a" in res.formula

    # Verify formula calculation:
    gap = Tv - Ta - Delta  # 0.0445
    expected_exp = -2.0 * (gap ** 2) * (Mu ** 2) * (beta ** 2) / float(n_test)
    expected_bound = math.exp(expected_exp)

    assert res.final_bound == pytest.approx(expected_bound, rel=1e-5)

    # Exposed parameters: Ta, Tv, Delta, beta, n_test, Mu
    assert res.inputs["Ta"] == pytest.approx(Ta)
    assert res.inputs["Tv"] == pytest.approx(Tv)
    assert res.inputs["Delta"] == pytest.approx(Delta)
    assert res.inputs["beta"] == pytest.approx(beta)
    assert res.inputs["n_test"] == n_test
    assert res.inputs["Mu"] == Mu
    assert res.inputs["effective_gap"] == pytest.approx(gap)


# ──────────────────────────────────────────────────────────────────────────────
# 4. PROTOCOL BOUND (Practical QDS Complete Equations)
# ──────────────────────────────────────────────────────────────────────────────
def test_04_protocol_bound_forgery_repudiation_combined():
    """Verify protocol bound connects to forgery bound, repudiation bound, and ε_sec."""
    Sc = 0.4900
    Tv = 0.0645
    Ta = 0.0150
    Delta = 0.0050
    P_C_c = 0.2000
    Mu = 2000
    beta = 0.30
    n_test = 800

    req = StatisticalBoundRequest(
        method="PROTOCOL_BOUND",
        parameters={
            "Sc": Sc,
            "Tv": Tv,
            "Ta": Ta,
            "Delta": Delta,
            "P_C_c": P_C_c,
            "Mu": Mu,
            "beta": beta,
            "n_test": n_test,
        },
    )
    res = StatisticalBoundsEngine.calculate(req)

    assert res.method == "PROTOCOL_BOUND"

    # Forgery bound calculation
    exp1 = -((Sc - Tv) ** 2 / (2.0 * Sc)) * P_C_c * Mu
    expected_eps1 = math.exp(exp1)

    # Repudiation bound calculation
    gap = Tv - Ta - Delta
    exp2 = -2.0 * (gap ** 2) * (Mu ** 2) * (beta ** 2) / float(n_test)
    expected_eps2 = math.exp(exp2)

    # Total failure probability
    expected_eps_sec = expected_eps1 + expected_eps2

    assert res.details["forgery_bound"] == pytest.approx(expected_eps1, rel=1e-5)
    assert res.details["repudiation_bound"] == pytest.approx(expected_eps2, rel=1e-5)
    assert res.details["security_failure_probability"] == pytest.approx(expected_eps_sec, rel=1e-5)
    assert res.final_bound == pytest.approx(expected_eps_sec, rel=1e-5)

    # Transparency steps check
    assert any("Forgery" in step for step in res.calculation_steps)
    assert any("Repudiation" in step for step in res.calculation_steps)
    assert any("Total" in step for step in res.calculation_steps)


# ──────────────────────────────────────────────────────────────────────────────
# 5. MATHEMATICAL TRANSPARENCY PANEL COMPLIANCE
# ──────────────────────────────────────────────────────────────────────────────
def test_05_mathematical_transparency_structure():
    """Verify all 6 required transparency components are present in every response."""
    modes = [
        ("HOEFFDING", {"sample_size": 1500, "delta": 0.03, "observed_rate": 0.012}),
        ("CHERNOFF", {"parameters": {"mu": 80.0, "delta": 0.25}}),
        ("RANDOM_SAMPLING", {"parameters": {"Ta": 0.015, "Tv": 0.065, "Delta": 0.005, "Mu": 1000, "beta": 0.3, "n_test": 400}}),
        ("PROTOCOL_BOUND", {"parameters": {"Sc": 0.49, "Tv": 0.0645, "Ta": 0.015, "Mu": 1500, "beta": 0.3, "n_test": 500}}),
    ]

    for mode_name, kwargs in modes:
        req = StatisticalBoundRequest(method=mode_name, **kwargs)
        res = StatisticalBoundsEngine.calculate(req)

        # 1. INPUTS
        assert isinstance(res.inputs, dict) and len(res.inputs) > 0
        # 2. FORMULA
        assert isinstance(res.formula, str) and len(res.formula) > 5
        # 3. SUBSTITUTION
        assert isinstance(res.substitution, str) and len(res.substitution) > 5
        # 4. CALCULATION
        assert isinstance(res.calculation_steps, list) and len(res.calculation_steps) >= 3
        # 5. FINAL BOUND
        assert res.final_bound is not None and res.final_bound <= 1.0
        # 6. INTERPRETATION
        assert isinstance(res.interpretation, str) and len(res.interpretation) > 10
        # 7. DISCLAIMER
        assert "laboratory validation" in res.scientific_disclaimer.lower()


# ──────────────────────────────────────────────────────────────────────────────
# 6. SIMULATION ID INTEGRATION & STATE STORE AUTO-POPULATION
# ──────────────────────────────────────────────────────────────────────────────
def test_06_simulation_id_state_auto_population():
    """Verify simulation_id automatically pulls genuine parameters from state store."""
    mat_req = GenerateMaterialRequest(
        pulse_count=3000,
        distance_km=25.0,
        baseline_qber=0.015,
        authentication_threshold=0.018,
        verification_threshold=0.070,
        beta=0.35,
        seed=10101,
    )
    state = PracticalQDSEngine.generate_simulation(mat_req)
    state_store.save(state)

    # Request protocol bound passing only simulation_id
    bound_req = StatisticalBoundRequest(
        method="PROTOCOL_BOUND",
        simulation_id=state.simulation_id,
    )
    bound_res = StatisticalBoundsEngine.calculate(bound_req)

    # Parameters should have been auto-populated from state
    assert bound_res.inputs["Tv"] == pytest.approx(0.070)
    assert bound_res.inputs["Ta"] == pytest.approx(0.018)
    assert bound_res.inputs["beta"] == pytest.approx(0.35)
    assert bound_res.inputs["Mu"] == state.material.untested_bits["M_u_bob"]
    assert bound_res.simulation_id == state.simulation_id
    assert bound_res.final_bound < 1.0



# ──────────────────────────────────────────────────────────────────────────────
# 7. HTTP API DUAL ROUTING & ENDPOINT CHECKS
# ──────────────────────────────────────────────────────────────────────────────
def test_07_http_api_endpoints():
    """Verify POST /simulation/bounds, /api/v1/simulation/bounds, and /statistical-bound."""
    body = {
        "method": "HOEFFDING",
        "parameters": {
            "n": 2500,
            "epsilon": 0.035,
            "observed_value": 0.012,
        },
    }

    # 1. Canonical POST /simulation/bounds
    resp1 = client.post("/simulation/bounds", json=body)
    assert resp1.status_code == 200, resp1.text
    data1 = resp1.json()
    assert data1["method"] == "HOEFFDING"
    assert data1["inputs"]["n"] == 2500
    assert "calculation_steps" in data1
    assert "substitution" in data1

    # 2. Canonical POST /api/v1/simulation/bounds
    resp2 = client.post("/api/v1/simulation/bounds", json=body)
    assert resp2.status_code == 200, resp2.text
    assert resp2.json()["method"] == "HOEFFDING"

    # 3. Legacy alias POST /api/v1/simulation/statistical-bound
    resp3 = client.post("/api/v1/simulation/statistical-bound", json=body)
    assert resp3.status_code == 200, resp3.text
    assert resp3.json()["method"] == "HOEFFDING"


# ──────────────────────────────────────────────────────────────────────────────
# 8. INVALID PARAMETER HANDLING
# ──────────────────────────────────────────────────────────────────────────────
def test_08_invalid_parameter_handling():
    """Verify invalid parameters are rejected with 422 or clear errors."""
    # Negative sample size
    with pytest.raises(ValueError):
        StatisticalBoundsEngine.calculate(
            StatisticalBoundRequest(method="HOEFFDING", sample_size=-10, delta=0.05)
        )

    # Delta <= 0
    with pytest.raises(ValueError):
        StatisticalBoundsEngine.calculate(
            StatisticalBoundRequest(method="HOEFFDING", sample_size=1000, delta=-0.01)
        )

    # Chernoff delta >= 1
    with pytest.raises(ValueError):
        StatisticalBoundsEngine.calculate(
            StatisticalBoundRequest(
                method="CHERNOFF", parameters={"mu": 100.0, "delta": 1.5}
            )
        )

    # Unknown method
    with pytest.raises(ValueError):
        StatisticalBoundsEngine.calculate(
            StatisticalBoundRequest(method="QUANTUM_MAGIC_BOUND", sample_size=1000)
        )
