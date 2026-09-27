"""Phase 2: Protocol Isolation Tests.

Validates that explanations generated for one protocol NEVER leak terminology
or concepts specific to another protocol (e.g. MDI untrusted relay or Decoy
state statistics appearing in Practical QDS results).

Validates:
  - TEST 14: Practical QDS must not receive MDI-QDS-specific explanations
  - TEST 15: Practical QDS must not receive Decoy-State PNS explanations
"""

import pytest

from app.engine.attack_engine.dispatcher import dispatch
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.attack_models import AttackSimulationRequest
from app.schemas.canonical_models import GenerateMaterialRequest


@pytest.fixture
def practical_qds_sim():
    req = GenerateMaterialRequest(
        protocol="practical_qds",
        pulse_count=1000,
        distance_km=25.0,
        seed=888,
    )
    return PracticalQDSEngine.generate_simulation(req)


def _get_full_explanation_text(response) -> str:
    exp = response.four_layer_explanation
    return (
        f"{exp.layer_1_attacker_action} "
        f"{exp.layer_2_physical_effect} "
        f"{exp.layer_3_observable_effect} "
        f"{exp.layer_4_security_consequence}"
    ).lower()


def test_14_practical_qds_no_mdi_leakage(practical_qds_sim):
    """TEST 14: Practical QDS must not receive MDI-QDS-specific explanations."""
    sim = practical_qds_sim
    for atk in ["FORGERY", "REPUDIATION", "INTERCEPT_RESEND"]:
        req = AttackSimulationRequest(
            simulation_id=sim.simulation_id,
            protocol="practical_qds",
            attack=atk,
        )
        res = dispatch(req, state=sim)
        assert res.model_status == "QUANTITATIVE"
        text = _get_full_explanation_text(res)

        # MDI-specific concepts must NOT appear
        assert "bell-state" not in text
        assert "bsm" not in text
        assert "untrusted relay" not in text
        assert "untrusted node" not in text
        assert "detector immunity" not in text
        assert "lo, curty" not in text


def test_15_practical_qds_no_decoy_leakage(practical_qds_sim):
    """TEST 15: Practical QDS must not receive Decoy-State PNS explanations."""
    sim = practical_qds_sim
    for atk in ["FORGERY", "REPUDIATION", "INTERCEPT_RESEND"]:
        req = AttackSimulationRequest(
            simulation_id=sim.simulation_id,
            protocol="practical_qds",
            attack=atk,
        )
        res = dispatch(req, state=sim)
        assert res.model_status == "QUANTITATIVE"
        text = _get_full_explanation_text(res)

        # Decoy-state specific concepts must NOT appear
        assert "pns" not in text
        assert "photon number splitting" not in text
        assert "decoy-state" not in text
        assert "decoy state" not in text
        assert "mu/nu/omega" not in text
        assert "gain ratio" not in text
