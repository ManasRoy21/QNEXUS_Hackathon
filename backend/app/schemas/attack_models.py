"""Phase 2 Attack Simulation Request / Response Schemas.

Typed Pydantic v2 models for the POST /api/v1/simulation/attack endpoint.

Key design invariants:
  1. AttackSimulationResponse carries model_status so the UI can distinguish
     QUANTITATIVE / QUALITATIVE / UNIMPLEMENTED at a glance.
  2. SimulationModelNotAvailableResponse is NEVER confused with a security verdict.
     Its `verdict` field is always "SIMULATION_MODEL_NOT_AVAILABLE".
  3. FourLayerExplanation is protocol-isolated — fields are populated only with
     content relevant to the active protocol.
  4. MathematicalModel carries the full computation chain for transparency.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ─────────────────────────────────────────────────────────────────────────────
# Request
# ─────────────────────────────────────────────────────────────────────────────

class AttackSimulationRequest(BaseModel):
    """Request body for POST /api/v1/simulation/attack."""

    simulation_id: str = Field(
        ...,
        description=(
            "ID of a previously generated canonical simulation state "
            "(from POST /api/v1/simulation/generate-material)."
        ),
    )
    protocol: str = Field(
        ...,
        description="Protocol identifier, e.g. 'practical_qds', 'mdi_qds'.",
    )
    attack: str = Field(
        ...,
        description=(
            "Attack identifier. Accepted values: FORGERY, REPUDIATION, "
            "INTERCEPT_RESEND, EAVESDROPPING, DETECTOR_COMPROMISE, PNS_ATTACK. "
            "Aliases: LASER_BLINDING, DETECTOR_SIDE_CHANNEL, PHOTON_NUMBER_SPLITTING."
        ),
    )
    seed: Optional[int] = Field(
        default=None,
        description="Optional RNG seed for reproducible attack simulations.",
    )
    intensity: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description=(
            "Attack intensity γ ∈ [0, 1]. Interpretation is attack-specific. "
            "For INTERCEPT_RESEND: fraction of pulses intercepted. "
            "Validated strictly — clamping is FORBIDDEN."
        ),
    )
    target_role: Optional[str] = Field(
        default=None,
        description="Target verifier role, e.g. 'Bob' or 'Charlie'.",
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Attack-specific extra parameters (e.g. delta for repudiation model).",
    )

    @field_validator("intensity")
    @classmethod
    def validate_intensity(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError(f"intensity must be in [0, 1]; received {v}")
        return v


# ─────────────────────────────────────────────────────────────────────────────
# Four-Layer Explanation
# ─────────────────────────────────────────────────────────────────────────────

class FourLayerExplanation(BaseModel):
    """Protocol-isolated four-layer security explanation."""

    layer_1_attacker_action: str = Field(
        ...,
        description="What the attacker physically does (Layer 1: Attacker Action).",
    )
    layer_2_physical_effect: str = Field(
        ...,
        description="Physical / quantum-mechanical consequence (Layer 2: Physical Effect).",
    )
    layer_3_observable_effect: str = Field(
        ...,
        description="Observable or statistical signature detectable by verifiers (Layer 3: Observable Effect).",
    )
    layer_4_security_consequence: str = Field(
        ...,
        description=(
            "Security consequence: how the protocol detects / blocks the attack "
            "and what the resulting security guarantee is (Layer 4: Security Consequence)."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Mathematical Transparency Model
# ─────────────────────────────────────────────────────────────────────────────

class MathematicalModel(BaseModel):
    """Full mathematical transparency for quantitative attack models."""

    formula: str = Field(
        ...,
        description="LaTeX / symbolic formula for the security bound.",
    )
    inputs: Dict[str, Any] = Field(
        default_factory=dict,
        description="Named input values used in the computation (with units where applicable).",
    )
    intermediate_calculation: str = Field(
        default="",
        description="Step-by-step computation narrative.",
    )
    final_result: Any = Field(
        ...,
        description="Numeric or categorical final result of the model.",
    )
    interpretation: str = Field(
        ...,
        description="Plain-language interpretation of the result.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Attack Response — successful model execution
# ─────────────────────────────────────────────────────────────────────────────

class AttackSimulationResponse(BaseModel):
    """Response from POST /api/v1/simulation/attack when a model is available."""

    simulation_id: str
    seed: Optional[int]
    protocol: str
    attack: str
    model_status: str = Field(
        ...,
        description="'QUANTITATIVE' | 'QUALITATIVE'",
    )
    applicable: bool
    verdict: str = Field(
        ...,
        description=(
            "Security verdict for this attack/protocol combination. "
            "Never 'CLEAN' for unimplemented models."
        ),
    )
    attack_detected: bool
    protocol_resisted: bool
    model_version: Optional[str]
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
    four_layer_explanation: FourLayerExplanation
    mathematical_model: Optional[MathematicalModel] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Attack Response — model not available
# ─────────────────────────────────────────────────────────────────────────────

class SimulationModelNotAvailableResponse(BaseModel):
    """Structured response when no model exists for the (protocol, attack) pair.

    The `verdict` field is ALWAYS 'SIMULATION_MODEL_NOT_AVAILABLE'.
    This response must NEVER be confused with a positive security clearance.
    """

    simulation_id: str
    protocol: str
    attack: str
    verdict: str = "SIMULATION_MODEL_NOT_AVAILABLE"
    model_status: str = "UNIMPLEMENTED"
    applicable: bool
    reason: str
    model_version: Optional[str] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
    references: List[str] = Field(default_factory=list)
    message: str = Field(
        default=(
            "This attack vector has no quantitative or qualitative model implemented "
            "for this protocol in the current phase. "
            "Do NOT interpret this as a security clearance."
        ),
    )

    @model_validator(mode="after")
    def ensure_verdict_constant(self) -> "SimulationModelNotAvailableResponse":
        if self.verdict != "SIMULATION_MODEL_NOT_AVAILABLE":
            raise ValueError(
                "SimulationModelNotAvailableResponse.verdict MUST be "
                "'SIMULATION_MODEL_NOT_AVAILABLE'; it must never be overridden."
            )
        return self
