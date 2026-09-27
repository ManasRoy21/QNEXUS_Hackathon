"""Attack Applicability Matrix — Phase 2 Protocol-Aware Attack Engine.

Machine-readable per-protocol / per-attack-vector applicability table.

Every cell carries:
  protocol_id          — canonical protocol string
  attack_id            — CanonicalAttackID member
  applicable           — bool: does this threat class apply to this protocol?
  model_status         — "QUANTITATIVE" | "QUALITATIVE" | "UNIMPLEMENTED"
  reason               — human-readable one-liner
  quantitative_supported — True only when a real mathematical model exists
  qualitative_supported  — True when a narrative explanation is available
  model_version        — version tag for the model implementation
  references           — list of citation strings

Design constraint:
  model_status == "QUANTITATIVE" MUST have quantitative_supported == True.
  Returning verdict="CLEAN" for UNIMPLEMENTED cells is FORBIDDEN.
"""

from dataclasses import dataclass, field
from typing import List, Optional

from app.engine.attack_engine.attack_ids import CanonicalAttackID


@dataclass(frozen=True)
class ApplicabilityEntry:
    protocol_id: str
    attack_id: CanonicalAttackID
    applicable: bool
    model_status: str           # "QUANTITATIVE" | "QUALITATIVE" | "UNIMPLEMENTED"
    reason: str
    quantitative_supported: bool
    qualitative_supported: bool
    model_version: Optional[str] = None
    references: List[str] = field(default_factory=list)

    def __post_init__(self):
        assert self.model_status in ("QUANTITATIVE", "QUALITATIVE", "UNIMPLEMENTED"), (
            f"model_status must be QUANTITATIVE, QUALITATIVE, or UNIMPLEMENTED; got '{self.model_status}'"
        )
        if self.model_status == "QUANTITATIVE":
            assert self.quantitative_supported, (
                "model_status=QUANTITATIVE requires quantitative_supported=True"
            )


# ─────────────────────────────────────────────────────────────────────────────
# Matrix definition
# ─────────────────────────────────────────────────────────────────────────────

_MATRIX: List[ApplicabilityEntry] = [

    # ── Practical QDS (Yin, Fu & Chen 2016) ──────────────────────────────────

    ApplicabilityEntry(
        protocol_id="practical_qds",
        attack_id=CanonicalAttackID.FORGERY,
        applicable=True,
        model_status="QUANTITATIVE",
        reason="Chernoff-bound forgery probability ε₁ computed from conclusive-bit overlap I(B:C) and Sc solver.",
        quantitative_supported=True,
        qualitative_supported=True,
        model_version="practical_qds_attack_v1",
        references=["Yin, Fu, Chen — Phys. Rev. A 93, 032316 (2016)"],
    ),

    ApplicabilityEntry(
        protocol_id="practical_qds",
        attack_id=CanonicalAttackID.REPUDIATION,
        applicable=True,
        model_status="QUANTITATIVE",
        reason="Repudiation probability ε₂ computed from threshold gap (T_v - T_a - Δ) and untested bits M_u.",
        quantitative_supported=True,
        qualitative_supported=True,
        model_version="practical_qds_attack_v1",
        references=["Yin, Fu, Chen — Phys. Rev. A 93, 032316 (2016)"],
    ),

    ApplicabilityEntry(
        protocol_id="practical_qds",
        attack_id=CanonicalAttackID.INTERCEPT_RESEND,
        applicable=True,
        model_status="QUANTITATIVE",
        reason="QBER_obs = QBER_base + 0.5γ(1-2·QBER_base); abort decision vs T_a computed from simulation state.",
        quantitative_supported=True,
        qualitative_supported=True,
        model_version="practical_qds_attack_v1",
        references=["Yin, Fu, Chen — Phys. Rev. A 93, 032316 (2016)"],
    ),

    ApplicabilityEntry(
        protocol_id="practical_qds",
        attack_id=CanonicalAttackID.DETECTOR_COMPROMISE,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason=(
            "Practical QDS uses standard BB84 point-to-point optics — it is vulnerable "
            "to detector side-channels in principle, but no quantitative model is implemented in Phase 2."
        ),
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
        references=["Makarov et al. — Phys. Rev. A 74, 022313 (2006)"],
    ),

    ApplicabilityEntry(
        protocol_id="practical_qds",
        attack_id=CanonicalAttackID.PNS_ATTACK,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason=(
            "Practical QDS uses weak coherent pulses but does NOT employ decoy states. "
            "PNS vulnerability exists theoretically; no Phase 2 quantitative model is implemented."
        ),
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
        references=["Brassard et al. — Phys. Rev. Lett. 85, 1330 (2000)"],
    ),

    # ── MDI-QDS ───────────────────────────────────────────────────────────────

    ApplicabilityEntry(
        protocol_id="mdi_qds",
        attack_id=CanonicalAttackID.FORGERY,
        applicable=True,
        model_status="QUALITATIVE",
        reason="MDI-QDS resists forgery via measurement-device-independent BSM; qualitative model only in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=True,
        model_version="mdi_qualitative_v1",
        references=["Lo, Curty, Qi — Phys. Rev. Lett. 108, 130503 (2012)"],
    ),

    ApplicabilityEntry(
        protocol_id="mdi_qds",
        attack_id=CanonicalAttackID.REPUDIATION,
        applicable=True,
        model_status="QUALITATIVE",
        reason="Repudiation blocked by untrusted-node arbitration log; qualitative narrative only.",
        quantitative_supported=False,
        qualitative_supported=True,
        model_version="mdi_qualitative_v1",
        references=["Lo, Curty, Qi — Phys. Rev. Lett. 108, 130503 (2012)"],
    ),

    ApplicabilityEntry(
        protocol_id="mdi_qds",
        attack_id=CanonicalAttackID.INTERCEPT_RESEND,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason=(
            "MDI-QDS is immune to detector side-channels by construction; "
            "intercept-resend on the quantum channel is theoretically possible but no Phase 2 model is implemented."
        ),
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="mdi_qds",
        attack_id=CanonicalAttackID.DETECTOR_COMPROMISE,
        applicable=True,
        model_status="QUALITATIVE",
        reason=(
            "MDI-QDS is mathematically immune to detector side-channels / laser blinding. "
            "Security argument is analytical — no additional quantitative model required."
        ),
        quantitative_supported=False,
        qualitative_supported=True,
        model_version="mdi_qualitative_v1",
        references=["Lo, Curty, Qi — Phys. Rev. Lett. 108, 130503 (2012)"],
    ),

    ApplicabilityEntry(
        protocol_id="mdi_qds",
        attack_id=CanonicalAttackID.PNS_ATTACK,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="PNS attack model not applicable to MDI-QDS architecture; no Phase 2 model implemented.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    # ── OTUH-QDS ──────────────────────────────────────────────────────────────

    ApplicabilityEntry(
        protocol_id="otuh_qds",
        attack_id=CanonicalAttackID.FORGERY,
        applicable=True,
        model_status="QUALITATIVE",
        reason="Epsilon-strongly universal hashing makes forgery probability < 2^-128; qualitative model only.",
        quantitative_supported=False,
        qualitative_supported=True,
        model_version="otuh_qualitative_v1",
        references=["Amiri et al. — Phys. Rev. A 93, 032316 (2016)"],
    ),

    ApplicabilityEntry(
        protocol_id="otuh_qds",
        attack_id=CanonicalAttackID.REPUDIATION,
        applicable=True,
        model_status="QUALITATIVE",
        reason="Pre-distributed seeds hold Alice accountable; qualitative model only.",
        quantitative_supported=False,
        qualitative_supported=True,
        model_version="otuh_qualitative_v1",
    ),

    ApplicabilityEntry(
        protocol_id="otuh_qds",
        attack_id=CanonicalAttackID.INTERCEPT_RESEND,
        applicable=True,
        model_status="QUALITATIVE",
        reason="Eavesdropping on 384-bit seed distribution detected via QBER; qualitative model with flagged hardcoded QBER.",
        quantitative_supported=False,
        qualitative_supported=True,
        model_version="otuh_qualitative_v1",
    ),

    ApplicabilityEntry(
        protocol_id="otuh_qds",
        attack_id=CanonicalAttackID.DETECTOR_COMPROMISE,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="Detector compromise not modelled for OTUH-QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="otuh_qds",
        attack_id=CanonicalAttackID.PNS_ATTACK,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="PNS attack not modelled for OTUH-QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    # ── Twin-Field QDS ────────────────────────────────────────────────────────

    ApplicabilityEntry(
        protocol_id="tf_qds",
        attack_id=CanonicalAttackID.FORGERY,
        applicable=True,
        model_status="QUALITATIVE",
        reason="TF-QDS midpoint interference invalidates forged tokens; qualitative only in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=True,
        model_version="tf_qualitative_v1",
        references=["Zhang et al. — Nat. Photonics 2022"],
    ),

    ApplicabilityEntry(
        protocol_id="tf_qds",
        attack_id=CanonicalAttackID.REPUDIATION,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="Repudiation model not implemented for TF-QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="tf_qds",
        attack_id=CanonicalAttackID.INTERCEPT_RESEND,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="Intercept-resend model not implemented for TF-QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="tf_qds",
        attack_id=CanonicalAttackID.DETECTOR_COMPROMISE,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="Detector compromise model not implemented for TF-QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="tf_qds",
        attack_id=CanonicalAttackID.PNS_ATTACK,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="PNS attack model not implemented for TF-QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    # ── Decoy-State QDS ───────────────────────────────────────────────────────

    ApplicabilityEntry(
        protocol_id="decoy_qds",
        attack_id=CanonicalAttackID.FORGERY,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="Forgery model not implemented for Decoy-State QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="decoy_qds",
        attack_id=CanonicalAttackID.REPUDIATION,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="Repudiation model not implemented for Decoy-State QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="decoy_qds",
        attack_id=CanonicalAttackID.INTERCEPT_RESEND,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="Intercept-resend model not implemented for Decoy-State QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="decoy_qds",
        attack_id=CanonicalAttackID.DETECTOR_COMPROMISE,
        applicable=False,
        model_status="UNIMPLEMENTED",
        reason="Detector compromise model not implemented for Decoy-State QDS in Phase 2.",
        quantitative_supported=False,
        qualitative_supported=False,
        model_version=None,
    ),

    ApplicabilityEntry(
        protocol_id="decoy_qds",
        attack_id=CanonicalAttackID.PNS_ATTACK,
        applicable=True,
        model_status="QUALITATIVE",
        reason="Decoy-state statistics (mu/nu/omega gain ratios) detect PNS; qualitative model via adapter.",
        quantitative_supported=False,
        qualitative_supported=True,
        model_version="decoy_qualitative_v1",
        references=["Wang — Phys. Rev. Lett. 94, 230503 (2005)", "Lo et al. — Phys. Rev. Lett. 94, 230504 (2005)"],
    ),
]

# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

_INDEX: dict[tuple[str, CanonicalAttackID], ApplicabilityEntry] = {
    (e.protocol_id, e.attack_id): e for e in _MATRIX
}

# Canonical alias resolution: EAVESDROPPING → INTERCEPT_RESEND for lookup
_ALIAS_MAP: dict[CanonicalAttackID, CanonicalAttackID] = {
    CanonicalAttackID.EAVESDROPPING: CanonicalAttackID.INTERCEPT_RESEND,
}


def get_applicability(protocol_id: str, attack_id: CanonicalAttackID) -> ApplicabilityEntry:
    """Return the applicability entry for a (protocol, attack) pair.

    Resolves attack aliases (e.g. EAVESDROPPING → INTERCEPT_RESEND).

    Raises KeyError if the combination is not registered in the matrix.
    """
    resolved = _ALIAS_MAP.get(attack_id, attack_id)
    key = (protocol_id.lower(), resolved)
    if key not in _INDEX:
        raise KeyError(
            f"No applicability entry for protocol='{protocol_id}', attack='{attack_id.value}'. "
            f"Registered protocols: {list({e.protocol_id for e in _MATRIX})}"
        )
    return _INDEX[key]


def list_protocol_attacks(protocol_id: str) -> List[ApplicabilityEntry]:
    """Return all applicability entries for a given protocol."""
    return [e for e in _MATRIX if e.protocol_id == protocol_id.lower()]


def get_full_matrix() -> List[dict]:
    """Return the complete matrix as a list of plain dicts (for API serialisation)."""
    result = []
    for e in _MATRIX:
        result.append({
            "protocol_id": e.protocol_id,
            "attack_id": e.attack_id.value,
            "applicable": e.applicable,
            "model_status": e.model_status,
            "reason": e.reason,
            "quantitative_supported": e.quantitative_supported,
            "qualitative_supported": e.qualitative_supported,
            "model_version": e.model_version,
            "references": list(e.references),
        })
    return result
