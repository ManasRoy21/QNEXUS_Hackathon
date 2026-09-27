"""Attack Dispatcher — Phase 2 Protocol-Aware Attack Engine.

Central entry-point for all attack simulations.  No endpoint file should
branch on protocol names directly — all routing goes through this dispatcher.

Dispatch flow:
  1. Validate protocol_id (known protocol?)
  2. Normalise attack identifier (CanonicalAttackID.normalise)
  3. Query applicability matrix
  4. If UNIMPLEMENTED → return SimulationModelNotAvailableResponse
  5. If QUALITATIVE   → delegate to per-protocol qualitative handler
  6. If QUANTITATIVE  → delegate to per-protocol quantitative handler
  7. Generate FourLayerExplanation (protocol-isolated)
  8. Generate MathematicalModel (QUANTITATIVE only)
  9. Return typed AttackSimulationResponse

Invariant: verdict == "CLEAN" is NEVER returned for UNIMPLEMENTED attacks.
"""

from __future__ import annotations

from typing import Union

from app.engine.attack_engine.applicability_matrix import get_applicability
from app.engine.attack_engine.attack_ids import CanonicalAttackID
from app.engine.attack_engine import explanation_engine as _exp
from app.engine.attack_engine import practical_qds_attacks as _pqa
from app.engine.attack_engine.state_store import require as _require_state
from app.schemas.attack_models import (
    AttackSimulationRequest,
    AttackSimulationResponse,
    FourLayerExplanation,
    SimulationModelNotAvailableResponse,
)
from app.schemas.canonical_models import CanonicalSimulationState

# Protocols known to the Phase 2 attack engine
_KNOWN_PROTOCOLS = frozenset([
    "practical_qds",
    "mdi_qds",
    "otuh_qds",
    "tf_qds",
    "decoy_qds",
])


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def dispatch(
    request: AttackSimulationRequest,
    state: CanonicalSimulationState | None = None,
) -> Union[AttackSimulationResponse, SimulationModelNotAvailableResponse]:
    """Dispatch an attack simulation request.

    If `state` is provided it is used directly (useful for testing).
    Otherwise the canonical state is retrieved from the in-process store
    using request.simulation_id.

    Returns either:
      - AttackSimulationResponse (model_status = QUANTITATIVE | QUALITATIVE)
      - SimulationModelNotAvailableResponse (model_status = UNIMPLEMENTED)
    """
    protocol_id = request.protocol.lower().strip()

    # ── 1. Validate protocol ──────────────────────────────────────────────────
    if protocol_id not in _KNOWN_PROTOCOLS:
        # Return NOT_AVAILABLE for completely unrecognised protocols
        return SimulationModelNotAvailableResponse(
            simulation_id=request.simulation_id,
            protocol=protocol_id,
            attack=request.attack,
            applicable=False,
            reason=(
                f"Protocol '{protocol_id}' is not registered in the Phase 2 attack engine. "
                f"Supported protocols: {sorted(_KNOWN_PROTOCOLS)}"
            ),
        )

    # ── 2. Normalise attack ───────────────────────────────────────────────────
    try:
        canonical_attack = CanonicalAttackID.normalise(request.attack)
    except ValueError as exc:
        return SimulationModelNotAvailableResponse(
            simulation_id=request.simulation_id,
            protocol=protocol_id,
            attack=request.attack,
            applicable=False,
            reason=str(exc),
        )

    # ── 3. Query applicability matrix ─────────────────────────────────────────
    try:
        entry = get_applicability(protocol_id, canonical_attack)
    except KeyError as exc:
        return SimulationModelNotAvailableResponse(
            simulation_id=request.simulation_id,
            protocol=protocol_id,
            attack=canonical_attack.value,
            applicable=False,
            reason=str(exc),
        )

    # ── 4. UNIMPLEMENTED → explicit NOT_AVAILABLE ─────────────────────────────
    if entry.model_status == "UNIMPLEMENTED":
        return SimulationModelNotAvailableResponse(
            simulation_id=request.simulation_id,
            protocol=protocol_id,
            attack=canonical_attack.value,
            applicable=entry.applicable,
            reason=entry.reason,
            model_version=entry.model_version,
            references=list(entry.references),
        )

    # ── 5. Retrieve canonical simulation state (needed for all live models) ───
    if state is None:
        try:
            state = _require_state(request.simulation_id)
        except LookupError as exc:
            return SimulationModelNotAvailableResponse(
                simulation_id=request.simulation_id,
                protocol=protocol_id,
                attack=canonical_attack.value,
                applicable=entry.applicable,
                reason=str(exc),
            )

    # ── 6. Route to protocol + attack handler ─────────────────────────────────
    return _route(request, state, canonical_attack, entry)


# ─────────────────────────────────────────────────────────────────────────────
# Internal routing
# ─────────────────────────────────────────────────────────────────────────────

def _route(
    request: AttackSimulationRequest,
    state: CanonicalSimulationState,
    canonical_attack: CanonicalAttackID,
    entry,
) -> Union[AttackSimulationResponse, SimulationModelNotAvailableResponse]:
    protocol_id = request.protocol.lower().strip()

    if protocol_id == "practical_qds":
        return _handle_practical_qds(request, state, canonical_attack, entry)

    if protocol_id == "mdi_qds":
        return _handle_mdi_qds(request, state, canonical_attack, entry)

    if protocol_id == "otuh_qds":
        return _handle_otuh_qds(request, state, canonical_attack, entry)

    if protocol_id == "tf_qds":
        return _handle_tf_qds(request, state, canonical_attack, entry)

    if protocol_id == "decoy_qds":
        return _handle_decoy_qds(request, state, canonical_attack, entry)

    # Should never reach here — protocol validated above
    return SimulationModelNotAvailableResponse(
        simulation_id=request.simulation_id,
        protocol=protocol_id,
        attack=canonical_attack.value,
        applicable=False,
        reason=f"Internal routing error for protocol '{protocol_id}'.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Practical QDS handlers
# ─────────────────────────────────────────────────────────────────────────────

def _handle_practical_qds(request, state, canonical_attack, entry):
    delta = float(request.parameters.get("delta", None) or 0.0) or None

    if canonical_attack == CanonicalAttackID.FORGERY:
        fields, math_model = _pqa.simulate_forgery(state)
        explanation = _exp.practical_qds_forgery_explanation(
            epsilon_1=fields["epsilon_1"],
            I_BC=fields["I_BC"],
            S_c=fields["S_c"],
            T_v=fields["T_v"],
            M_u=fields["M_u"],
        )
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="practical_qds",
            attack=canonical_attack.value,
            model_status="QUANTITATIVE",
            applicable=True,
            verdict=fields["verdict"],
            attack_detected=fields["attack_detected"],
            protocol_resisted=fields["protocol_resisted"],
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=math_model,
            metadata={
                "epsilon_1": fields["epsilon_1"],
                "I_BC": fields["I_BC"],
                "S_c": fields["S_c"],
                "M_u": fields["M_u"],
                "P_C_c": fields["P_C_c"],
            },
        )

    elif canonical_attack == CanonicalAttackID.REPUDIATION:
        fields, math_model = _pqa.simulate_repudiation(state, delta=delta)
        explanation = _exp.practical_qds_repudiation_explanation(
            epsilon_2=fields["epsilon_2"],
            T_v=fields["T_v"],
            T_a=fields["T_a"],
            delta=fields["delta"],
            M_u=fields["M_u"],
            n_test=fields["n_test"],
            beta=fields["beta"],
        )
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="practical_qds",
            attack=canonical_attack.value,
            model_status="QUANTITATIVE",
            applicable=True,
            verdict=fields["verdict"],
            attack_detected=fields["attack_detected"],
            protocol_resisted=fields["protocol_resisted"],
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=math_model,
            metadata={
                "epsilon_2": fields["epsilon_2"],
                "delta": fields["delta"],
                "gap": fields["gap"],
                "M_u": fields["M_u"],
                "n_test": fields["n_test"],
            },
        )

    elif canonical_attack in (CanonicalAttackID.INTERCEPT_RESEND, CanonicalAttackID.EAVESDROPPING):
        gamma = float(request.intensity)
        fields, math_model = _pqa.simulate_eavesdropping(state, gamma=gamma)
        explanation = _exp.practical_qds_eavesdropping_explanation(
            gamma=fields["gamma"],
            qber_base=fields["qber_base"],
            qber_obs=fields["qber_obs"],
            T_a=fields["T_a"],
            detected=fields["detected"],
        )
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="practical_qds",
            attack=canonical_attack.value,
            model_status="QUANTITATIVE",
            applicable=True,
            verdict=fields["verdict"],
            attack_detected=fields["attack_detected"],
            protocol_resisted=fields["protocol_resisted"],
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=math_model,
            metadata={
                "gamma": gamma,
                "QBER_obs": fields["qber_obs"],
                "QBER_base": fields["qber_base"],
                "T_a": fields["T_a"],
                "detected": fields["detected"],
            },
        )

    # Should not reach here for practical_qds with valid attack
    return SimulationModelNotAvailableResponse(
        simulation_id=request.simulation_id,
        protocol="practical_qds",
        attack=canonical_attack.value,
        applicable=entry.applicable,
        reason="Internal error: unhandled Practical QDS attack branch.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# MDI-QDS handlers (qualitative)
# ─────────────────────────────────────────────────────────────────────────────

def _handle_mdi_qds(request, state, canonical_attack, entry):
    if canonical_attack == CanonicalAttackID.DETECTOR_COMPROMISE:
        explanation = _exp.mdi_qds_detector_compromise_explanation()
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="mdi_qds",
            attack=canonical_attack.value,
            model_status="QUALITATIVE",
            applicable=True,
            verdict="SECURE_IMMUNE",
            attack_detected=True,
            protocol_resisted=True,
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=None,
            metadata={"detector_attack_neutralized": True},
        )

    elif canonical_attack == CanonicalAttackID.FORGERY:
        explanation = _exp.mdi_qds_forgery_explanation()
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="mdi_qds",
            attack=canonical_attack.value,
            model_status="QUALITATIVE",
            applicable=True,
            verdict="REJECT_FORGERY",
            attack_detected=True,
            protocol_resisted=True,
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=None,
        )

    elif canonical_attack == CanonicalAttackID.REPUDIATION:
        explanation = _exp.mdi_qds_repudiation_explanation()
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="mdi_qds",
            attack=canonical_attack.value,
            model_status="QUALITATIVE",
            applicable=True,
            verdict="REPUDIATION_BLOCKED",
            attack_detected=True,
            protocol_resisted=True,
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=None,
        )

    return SimulationModelNotAvailableResponse(
        simulation_id=request.simulation_id,
        protocol="mdi_qds",
        attack=canonical_attack.value,
        applicable=entry.applicable,
        reason=entry.reason,
    )


# ─────────────────────────────────────────────────────────────────────────────
# OTUH-QDS handlers (qualitative)
# ─────────────────────────────────────────────────────────────────────────────

def _handle_otuh_qds(request, state, canonical_attack, entry):
    if canonical_attack == CanonicalAttackID.FORGERY:
        explanation = _exp.otuh_qds_forgery_explanation()
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="otuh_qds",
            attack=canonical_attack.value,
            model_status="QUALITATIVE",
            applicable=True,
            verdict="REJECT_FORGERY",
            attack_detected=True,
            protocol_resisted=True,
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=None,
        )

    elif canonical_attack == CanonicalAttackID.REPUDIATION:
        explanation = _exp.otuh_qds_repudiation_explanation()
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="otuh_qds",
            attack=canonical_attack.value,
            model_status="QUALITATIVE",
            applicable=True,
            verdict="REPUDIATION_BLOCKED",
            attack_detected=True,
            protocol_resisted=True,
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=None,
        )

    elif canonical_attack in (CanonicalAttackID.INTERCEPT_RESEND, CanonicalAttackID.EAVESDROPPING):
        explanation = _exp.otuh_qds_eavesdropping_explanation(resulting_qber=0.38)
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="otuh_qds",
            attack=canonical_attack.value,
            model_status="QUALITATIVE",
            applicable=True,
            verdict="SESSION_ABORTED",
            attack_detected=True,
            protocol_resisted=True,
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=None,
            metadata={"note": "QBER value is a qualitative estimate; quantitative model pending."},
        )

    return SimulationModelNotAvailableResponse(
        simulation_id=request.simulation_id,
        protocol="otuh_qds",
        attack=canonical_attack.value,
        applicable=entry.applicable,
        reason=entry.reason,
    )


# ─────────────────────────────────────────────────────────────────────────────
# TF-QDS handlers (qualitative for Forgery only)
# ─────────────────────────────────────────────────────────────────────────────

def _handle_tf_qds(request, state, canonical_attack, entry):
    if canonical_attack == CanonicalAttackID.FORGERY:
        explanation = _exp.tf_qds_forgery_explanation()
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="tf_qds",
            attack=canonical_attack.value,
            model_status="QUALITATIVE",
            applicable=True,
            verdict="REJECT_FORGERY",
            attack_detected=True,
            protocol_resisted=True,
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=None,
        )

    return SimulationModelNotAvailableResponse(
        simulation_id=request.simulation_id,
        protocol="tf_qds",
        attack=canonical_attack.value,
        applicable=entry.applicable,
        reason=entry.reason,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Decoy-State QDS handlers (qualitative for PNS only)
# ─────────────────────────────────────────────────────────────────────────────

def _handle_decoy_qds(request, state, canonical_attack, entry):
    if canonical_attack == CanonicalAttackID.PNS_ATTACK:
        explanation = _exp.decoy_qds_pns_explanation()
        return AttackSimulationResponse(
            simulation_id=request.simulation_id,
            seed=request.seed,
            protocol="decoy_qds",
            attack=canonical_attack.value,
            model_status="QUALITATIVE",
            applicable=True,
            verdict="REJECT_PNS_BREACH",
            attack_detected=True,
            protocol_resisted=True,
            model_version=entry.model_version,
            four_layer_explanation=explanation,
            mathematical_model=None,
        )

    return SimulationModelNotAvailableResponse(
        simulation_id=request.simulation_id,
        protocol="decoy_qds",
        attack=canonical_attack.value,
        applicable=entry.applicable,
        reason=entry.reason,
    )
