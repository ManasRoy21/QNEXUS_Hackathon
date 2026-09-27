"""Phase 3 Tests: Parameter Sweeps and Statistical Bounds.

Validates:
  - Deterministic sweeps
  - Parameter sensitivity (distance, pulse count, thresholds, gamma)
  - Gamma monotonicity and boundary values (gamma=0, gamma=1)
  - Statistical bound methods (Hoeffding, Chernoff, Serfling, Protocol)
  - Formula presence & mathematical transparency
  - API endpoint integration: /api/v1/simulation/sweep & /api/v1/simulation/statistical-bound
"""

import pytest
from fastapi.testclient import TestClient

from app.engine.analytics.statistical_bounds import StatisticalBoundsEngine
from app.engine.analytics.sweep_engine import SweepEngine
from app.schemas.analytics_models import (
    StatisticalBoundRequest,
    SweepRequest,
)
from main import app

client = TestClient(app)


def test_01_deterministic_sweep_replay():
    """Identical sweep requests produce bit-for-bit identical results."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="distance_km",
        values=[10.0, 20.0, 30.0],
        pulse_count=1000,
        seed=4242,
        attack="FORGERY",
    )
    res1 = SweepEngine.execute_sweep(req)
    res2 = SweepEngine.execute_sweep(req)

    assert len(res1.points) == 3
    for p1, p2 in zip(res1.points, res2.points):
        assert p1.seed == p2.seed
        assert p1.qber_bob == p2.qber_bob
        assert p1.epsilon_1 == p2.epsilon_1
        assert p1.conclusive_count_bob == p2.conclusive_count_bob


def test_02_distance_sweep_affects_qber_and_conclusives():
    """Distance attenuation reduces conclusive detections."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="distance_km",
        values=[0.0, 25.0, 50.0],
        pulse_count=2000,
        seed=100,
    )
    res = SweepEngine.execute_sweep(req)
    # Higher distance -> lower transmittance -> fewer conclusive counts
    assert res.points[0].conclusive_count_bob > res.points[1].conclusive_count_bob
    assert res.points[1].conclusive_count_bob > res.points[2].conclusive_count_bob


def test_03_gamma_sweep_intercept_resend_monotonicity():
    """Gamma sweep for Intercept-Resend shows monotonic QBER increase."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="intensity",
        values=[0.0, 0.25, 0.50, 0.75, 1.0],
        pulse_count=1000,
        seed=500,
        attack="INTERCEPT_RESEND",
    )
    res = SweepEngine.execute_sweep(req)
    qbers = [p.qber_obs for p in res.points]

    # gamma=0 gives baseline
    assert qbers[0] == pytest.approx(res.points[0].qber_bob, abs=1e-6)

    # Monotonic increase
    for i in range(len(qbers) - 1):
        assert qbers[i] <= qbers[i + 1]

    # gamma=1 produces baseline + 0.5*(1 - 2*base)
    expected_qber_1 = res.points[-1].qber_bob + 0.5 * (1.0 - 2.0 * res.points[-1].qber_bob)
    assert qbers[-1] == pytest.approx(expected_qber_1, abs=1e-6)


def test_04_pulse_count_sweep_improves_unforgeability():
    """Larger pulse count increases M_u and drives epsilon_1 down."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="pulse_count",
        values=[500.0, 1500.0, 3000.0],
        seed=333,
        attack="FORGERY",
    )
    res = SweepEngine.execute_sweep(req)
    assert res.points[0].M_u < res.points[1].M_u < res.points[2].M_u
    # epsilon_1 decreases exponentially with M_u
    assert res.points[0].epsilon_1 > res.points[1].epsilon_1 >= res.points[2].epsilon_1


def test_05_ta_tv_gap_sweep_repudiation():
    """Varying authentication threshold affects repudiation bound."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="authentication_threshold",
        values=[0.010, 0.020, 0.030],
        verification_threshold=0.0645,
        pulse_count=1500,
        seed=999,
        attack="REPUDIATION",
        attack_parameters={"delta": 0.005},
    )
    res = SweepEngine.execute_sweep(req)
    # Increasing Ta reduces the gap (Tv - Ta - delta), increasing epsilon_2 (weaker bound)
    assert res.points[0].epsilon_2 <= res.points[1].epsilon_2 <= res.points[2].epsilon_2


def test_06_statistical_bounds_hoeffding():
    """StatisticalBoundsEngine Hoeffding evaluation."""
    req = StatisticalBoundRequest(
        method="HOEFFDING",
        sample_size=1000,
        delta=0.05,
    )
    res = StatisticalBoundsEngine.calculate(req)
    assert res.method == "HOEFFDING"
    assert "formula" in res.model_dump()
    assert res.failure_probability < 1.0
    assert "intermediate_calculation" in res.model_dump()


def test_07_statistical_bounds_chernoff():
    """StatisticalBoundsEngine Chernoff evaluation."""
    req = StatisticalBoundRequest(
        method="CHERNOFF",
        observed_rate=0.02,
        sample_size=2000,
        delta=0.2,
    )
    res = StatisticalBoundsEngine.calculate(req)
    assert res.method == "CHERNOFF"
    assert res.failure_probability < 1.0


def test_08_statistical_bounds_serfling():
    """StatisticalBoundsEngine finite population Serfling bound."""
    req = StatisticalBoundRequest(
        method="FINITE_POPULATION",
        sample_size=500,
        population_size=2000,
        delta=0.03,
    )
    res = StatisticalBoundsEngine.calculate(req)
    assert res.method == "FINITE_POPULATION"
    assert res.failure_probability > 0.0


def test_09_api_sweep_endpoint():
    """POST /api/v1/simulation/sweep full API execution."""
    resp = client.post(
        "/api/v1/simulation/sweep",
        json={
            "protocol": "practical_qds",
            "parameter": "distance_km",
            "values": [5.0, 15.0],
            "pulse_count": 800,
            "seed": 777,
            "attack": "FORGERY",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["parameter"] == "distance_km"
    assert len(data["points"]) == 2
    assert "summary" in data


def test_10_api_statistical_bound_endpoint():
    """POST /api/v1/simulation/statistical-bound full API execution."""
    resp = client.post(
        "/api/v1/simulation/statistical-bound",
        json={
            "method": "HOEFFDING",
            "sample_size": 5000,
            "delta": 0.015,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["method"] == "HOEFFDING"
    assert data["failure_probability"] > 0.0
    assert len(data["intermediate_calculation"]) > 0


def test_11_invalid_sweep_parameters_rejected():
    """Invalid sweep parameters return 422 Unprocessable Entity."""
    resp = client.post(
        "/api/v1/simulation/sweep",
        json={
            "protocol": "practical_qds",
            "parameter": "non_existent_param",
            "values": [1.0, 2.0],
        },
    )
    assert resp.status_code == 422
