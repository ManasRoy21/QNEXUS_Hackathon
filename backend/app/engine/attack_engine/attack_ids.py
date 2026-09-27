"""Canonical Attack Identifiers for the Phase 2 Protocol-Aware Attack Engine.

Provides a single authoritative enum covering all recognised adversarial
threat classes for Quantum Digital Signature protocols.  No legacy adapter
should introduce its own attack string literals; everything routes through
these identifiers.

Attack IDs follow the FR-E specification in the developer document:
  FR-E1 → FORGERY
  FR-E2 → REPUDIATION
  FR-E3 → EAVESDROPPING / INTERCEPT_RESEND
  FR-E4 → DETECTOR_COMPROMISE   (MDI-QDS-specific)
  FR-E5 → PNS_ATTACK            (Decoy-State-specific)
"""

from enum import Enum


class CanonicalAttackID(str, Enum):
    """Canonical, protocol-neutral attack identifiers.

    All values are UPPER_SNAKE_CASE strings so that they compare directly
    against `attack_type.upper()` strings received from API callers.
    """

    # FR-E1 — Existential Forgery
    FORGERY = "FORGERY"

    # FR-E2 — Repudiation by signer (Alice denies having signed)
    REPUDIATION = "REPUDIATION"

    # FR-E3 — Intercept-Resend / Eavesdropping on quantum channel
    INTERCEPT_RESEND = "INTERCEPT_RESEND"
    EAVESDROPPING = "EAVESDROPPING"        # alias accepted at API boundary

    # FR-E4 — Detector side-channel / laser blinding
    DETECTOR_COMPROMISE = "DETECTOR_COMPROMISE"

    # FR-E5 — Photon Number Splitting (multi-photon pulse exploitation)
    PNS_ATTACK = "PNS_ATTACK"

    @classmethod
    def normalise(cls, raw: str) -> "CanonicalAttackID":
        """Map a raw caller-supplied string to a canonical enum member.

        Accepted aliases:
          "LASER_BLINDING", "DETECTOR_SIDE_CHANNEL" → DETECTOR_COMPROMISE
          "EAVESDROPPING"                            → INTERCEPT_RESEND
          "PHOTON_NUMBER_SPLITTING"                  → PNS_ATTACK

        Raises ValueError for completely unrecognised identifiers.
        """
        token = raw.strip().upper()
        _ALIASES: dict[str, "CanonicalAttackID"] = {
            "LASER_BLINDING": cls.DETECTOR_COMPROMISE,
            "DETECTOR_SIDE_CHANNEL": cls.DETECTOR_COMPROMISE,
            "PHOTON_NUMBER_SPLITTING": cls.PNS_ATTACK,
            "EAVESDROPPING": cls.INTERCEPT_RESEND,
        }
        if token in _ALIASES:
            return _ALIASES[token]
        try:
            return cls(token)
        except ValueError:
            raise ValueError(
                f"Unknown attack identifier '{raw}'. "
                f"Valid attacks: {[m.value for m in cls]}"
            )
