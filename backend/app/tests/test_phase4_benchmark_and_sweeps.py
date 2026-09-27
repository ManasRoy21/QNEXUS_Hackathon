"""Phase 4 Tests: Benchmark and Parameter Sweep Engine.

Validates:
  1. Sweep boundaries (min, max, step) and point limit enforcement
  2. Step handling and automatic point generation
  3. Deterministic reproducibility (same configuration -> identical numerical points)
  4. Invalid ranges rejection (negative step, min > max, out-of-domain values)
  5. Zero attack strength (gamma=0 yields baseline QBER)
  6. Extreme attack strength (gamma=1 yields expected maximum error rate)
  7. Export payload structure and factual summary generation (no subjective labels)
  8. Graph data consistency for all 6 required graphs:
     - 1. QBER vs Attack Strength (gamma)
     - 2. Failure Probability vs Pulse Count (N)
     - 3. Signature Rate R = Mu / (2N) vs Distance
     - 4. Repudiation Probability vs Ta/Tv Gap
     - 5. Forgery Probability vs Verification Threshold Tv
     - 6. QBER vs Distance
"""

import pytest
import math
from fastapi.testclient import TestClient

from app.engine.analytics.sweep_engine import SweepEngine
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.analytics_models import (
    SweepConfiguration,
    SweepPointResult,
    SweepRequest,
    SweepResponse,
)
from app.schemas.canonical_models import GenerateMaterialRequest
from main import app

client = TestClient(app)


# ── 1. Sweep Boundaries & Step Handling ───────────────────────────────────────

def test_01_sweep_boundaries_and_step_generation():
    """Sweep boundaries (min, max, step) generate expected discrete points within [min, max]."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="intensity",
        min=0.0,
        max=1.0,
        step=0.25,
        attack="INTERCEPT_RESEND",
    )
    assert req.values is not None
    assert len(req.values) == 5  # [0.0, 0.25, 0.5, 0.75, 1.0]
    assert req.values[0] == 0.0
    assert req.values[-1] == 1.0

    res = SweepEngine.execute_sweep(req)
    assert len(res.points) == 5
    assert res.min_value == 0.0
    assert res.max_value == 1.0
    assert res.step == pytest.approx(0.25, abs=1e-5)


# ── 2. Deterministic Reproducibility ──────────────────────────────────────────

def test_02_deterministic_sweep_reproducibility():
    """Same configuration + same seed yields identical numerical points."""
    req_a = SweepRequest(
        protocol="practical_qds",
        parameter="distance_km",
        values=[10.0, 20.0, 30.0],
        pulse_count=1500,
        seed=12345,
    )
    req_b = SweepRequest(
        protocol="practical_qds",
        parameter="distance_km",
        values=[10.0, 20.0, 30.0],
        pulse_count=1500,
        seed=12345,
    )

    res_a = SweepEngine.execute_sweep(req_a)
    res_b = SweepEngine.execute_sweep(req_b)

    for pt_a, pt_b in zip(res_a.points, res_b.points):
        assert pt_a.qber_bob == pt_b.qber_bob
        assert pt_a.conclusive_count_bob == pt_b.conclusive_count_bob
        assert pt_a.M_u == pt_b.M_u
        assert pt_a.signature_rate == pt_b.signature_rate


# ── 3. Invalid Ranges Rejection ───────────────────────────────────────────────

def test_03_invalid_sweep_ranges_rejected():
    """Invalid sweep ranges (negative step, min > max, out-of-domain) are rejected."""
    # Negative step
    with pytest.raises(ValueError):
        SweepRequest(
            protocol="practical_qds",
            parameter="distance_km",
            min=0.0,
            max=50.0,
            step=-5.0,
        )

    # Min > Max
    with pytest.raises(ValueError):
        SweepRequest(
            protocol="practical_qds",
            parameter="distance_km",
            min=50.0,
            max=10.0,
            step=5.0,
        )

    # Values exceeding 50 points
    with pytest.raises(ValueError):
        SweepRequest(
            protocol="practical_qds",
            parameter="distance_km",
            values=list(range(60)),
        )


# ── 4. Zero and Extreme Attack Strength ───────────────────────────────────────

def test_04_zero_and_extreme_attack_strength():
    """gamma=0 yields baseline QBER; gamma=1 yields maximum QBER."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="intensity",
        values=[0.0, 1.0],
        attack="INTERCEPT_RESEND",
        seed=42,
    )
    res = SweepEngine.execute_sweep(req)
    assert len(res.points) == 2

    pt_zero = res.points[0]
    pt_one = res.points[1]

    # gamma = 0 -> QBER_obs == QBER_base
    assert pt_zero.qber_obs == pytest.approx(pt_zero.qber_bob, abs=1e-6)

    # gamma = 1 -> QBER_obs = QBER_base + 0.5*(1 - 2*QBER_base)
    expected_qber_1 = pt_one.qber_bob + 0.5 * (1.0 - 2.0 * pt_one.qber_bob)
    assert pt_one.qber_obs == pytest.approx(expected_qber_1, abs=1e-6)


# ── 5. Graph 1: QBER vs Attack Strength (gamma) ──────────────────────────────

def test_05_graph1_qber_vs_attack_strength():
    """Graph 1: QBER increases monotonically with attack strength gamma."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="intensity",
        values=[0.0, 0.25, 0.50, 0.75, 1.0],
        attack="INTERCEPT_RESEND",
        seed=99,
    )
    res = SweepEngine.execute_sweep(req)
    qber_obs_list = [p.qber_obs for p in res.points]

    for i in range(len(qber_obs_list) - 1):
        assert qber_obs_list[i] <= qber_obs_list[i + 1]


# ── 6. Graph 2: Failure Probability vs Pulse Count N ──────────────────────────

def test_06_graph2_failure_prob_vs_pulse_count():
    """Graph 2: Forgery epsilon_1 decreases exponentially with pulse count N."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="pulse_count",
        values=[2000, 5000, 10000, 20000],
        attack="FORGERY",
        distance_km=20.0,
        seed=42,
    )
    res = SweepEngine.execute_sweep(req)
    eps1_list = [p.epsilon_1 for p in res.points]

    # Higher pulse count -> larger untested key Mu -> smaller epsilon_1
    for i in range(len(eps1_list) - 1):
        assert eps1_list[i] >= eps1_list[i + 1]


# ── 7. Graph 3: Signature Rate vs Distance (R = Mu / 2N) ─────────────────────

def test_07_graph3_signature_rate_vs_distance():
    """Graph 3: Signature rate R = Mu / (2*N) decreases with distance as channel loss reduces conclusives."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="distance_km",
        values=[5.0, 25.0, 50.0, 80.0],
        pulse_count=3000,
        seed=77,
    )
    res = SweepEngine.execute_sweep(req)

    for pt in res.points:
        assert pt.signature_rate is not None
        assert pt.signature_rate == pytest.approx(pt.M_u / (2.0 * 3000), abs=1e-6)

    rates = [p.signature_rate for p in res.points]
    assert rates[0] > rates[-1]  # 5km yields higher rate than 80km


# ── 8. Graph 4: Repudiation Probability vs Ta/Tv Gap ─────────────────────────

def test_08_graph4_repudiation_vs_gap():
    """Graph 4: Repudiation epsilon_2 increases as Ta increases (gap Tv - Ta narrows)."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="authentication_threshold",
        values=[0.010, 0.020, 0.030, 0.040],
        verification_threshold=0.065,
        attack="REPUDIATION",
        pulse_count=3000,
        seed=88,
    )
    res = SweepEngine.execute_sweep(req)
    eps2_list = [p.epsilon_2 for p in res.points]

    for i in range(len(eps2_list) - 1):
        assert eps2_list[i] <= eps2_list[i + 1]


# ── 9. Graph 5: Forgery Probability vs Verification Threshold Tv ─────────────

def test_09_graph5_forgery_vs_verification_threshold():
    """Graph 5: Forgery epsilon_1 increases as Tv increases toward Sc."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="verification_threshold",
        values=[0.03, 0.05, 0.07, 0.09],
        attack="FORGERY",
        pulse_count=4000,
        seed=101,
    )
    res = SweepEngine.execute_sweep(req)
    eps1_list = [p.epsilon_1 for p in res.points]

    for i in range(len(eps1_list) - 1):
        assert eps1_list[i] <= eps1_list[i + 1]


# ── 10. Graph 6: QBER vs Distance ─────────────────────────────────────────────

def test_10_graph6_qber_vs_distance():
    """Graph 6: Conclusive counts decay with distance while channel loss elevates dark-count error fraction."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="distance_km",
        values=[0.0, 15.0, 30.0, 50.0],
        pulse_count=5000,
        dark_count_rate=1e-5,
        seed=55,
    )
    res = SweepEngine.execute_sweep(req)
    conclusives = [p.conclusive_count_bob for p in res.points]
    assert conclusives[0] > conclusives[-1]
    assert res.points[-1].qber_bob > res.points[0].qber_bob


# ── 11. Factual Summary and No Subjective Labels ─────────────────────────────

def test_11_factual_summary_no_subjective_labels():
    """Sweep summaries provide purely objective factual descriptions and no OPTIMAL/BEST labels."""
    req = SweepRequest(
        protocol="practical_qds",
        parameter="intensity",
        values=[0.0, 0.5, 1.0],
        attack="INTERCEPT_RESEND",
        seed=42,
    )
    res = SweepEngine.execute_sweep(req)
    summary_str = str(res.summary).upper()

    assert "OPTIMAL" not in summary_str
    assert "BEST" not in summary_str
    assert "BALANCED" not in summary_str
    assert "PERFECT" not in summary_str

    assert "factual_observations" in res.summary
    assert len(res.summary["factual_observations"]) > 0


# ── 12. HTTP API Sweep Endpoint ──────────────────────────────────────────────

def test_12_http_api_sweep_endpoint():
    """POST /api/v1/simulation/sweep returns valid SweepResponse with series and summary."""
    payload = {
        "protocol": "practical_qds",
        "parameter": "distance_km",
        "values": [10.0, 20.0, 30.0],
        "pulse_count": 1000,
        "seed": 42,
    }
    resp = client.post("/api/v1/simulation/sweep", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["protocol"] == "practical_qds"
    assert data["parameter"] == "distance_km"
    assert len(data["points"]) == 3
    assert len(data["series"]) > 0
    assert "summary" in data
