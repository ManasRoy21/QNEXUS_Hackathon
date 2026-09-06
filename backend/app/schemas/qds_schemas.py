"""Module E: Pydantic v2 Request/Response Schemas for QDS API & Telemetry.

Provides strictly typed, validated schemas with OpenAPI documentation examples
for Keygen, Sign, Verify, Attack Injection, Symmetrization, and WebSocket Telemetry.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# 1. Key Generation Schemas
# ─────────────────────────────────────────────────────────────────────────────

class KeygenRequest(BaseModel):
    """Request payload for entangled Bell-state pair generation."""

    session_id: Optional[str] = Field(
        default=None,
        description="Optional session identifier; generated automatically if omitted.",
        examples=["session-alpha-001"],
    )
    num_bits: int = Field(
        default=16,
        ge=4,
        le=4096,
        description="Number of signature bits (Bell pairs) to generate across verifiers.",
        examples=[16],
    )
    parties: List[str] = Field(
        default=["alice", "bob", "charlie"],
        description="Participants in the multi-party QDS distribution.",
        examples=[["alice", "bob", "charlie"]],
    )


class KeygenResponse(BaseModel):
    """Response payload detailing generated Bell state pairs."""

    status: str = Field(default="success", examples=["success"])
    session_id: str = Field(..., description="Unique simulation session ID.", examples=["session-alpha-001"])
    num_bits: int = Field(..., description="Number of Bell state pairs created.", examples=[16])
    bell_pairs_generated: int = Field(..., examples=[16])
    parties: List[str] = Field(..., examples=[["alice", "bob", "charlie"]])
    timestamp: float = Field(..., description="UNIX timestamp of key generation.")
    message: str = Field(default="Entangled Bell-state key generation completed.")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Signature Preparation Schemas
# ─────────────────────────────────────────────────────────────────────────────

class SignRequest(BaseModel):
    """Request payload for quantum signature block preparation."""

    session_id: str = Field(..., description="Active session ID from keygen.", examples=["session-alpha-001"])
    message: Optional[str] = Field(
        default="QDS-TRANSACTION-001",
        description="Classical plaintext message to sign.",
        examples=["QDS-TRANSACTION-001"],
    )
    message_digest: Optional[str] = Field(
        default=None,
        description="Explicit bitstring message digest (overrides message hash if provided).",
        examples=["1011010011001010"],
    )
    signer_public_key: str = Field(
        default="alice-authorized-master-key-001",
        description="Signer's claimed public key identity.",
        examples=["alice-authorized-master-key-001"],
    )


class SignResponse(BaseModel):
    """Response payload containing prepared signature block metadata."""

    status: str = Field(default="success", examples=["success"])
    session_id: str = Field(..., examples=["session-alpha-001"])
    digest: str = Field(..., description="Binary digest encoded into quantum states.", examples=["1011010011001010"])
    target_bases: List[str] = Field(..., description="Measurement bases (Z or X) per bit position.", examples=[["Z", "X", "Z", "Z"]])
    pauli_states: List[str] = Field(..., description="Pauli eigenstates ('0', '1', '+', '-') encoded per bit position.", examples=[["0", "+", "1", "-"]])
    signer_public_key: str = Field(..., examples=["alice-authorized-master-key-001"])
    timestamp: float = Field(..., description="UNIX timestamp of signature creation.")
    nonce: str = Field(..., description="Unique cryptographic nonce preventing replay.")
    message: str = Field(default="Teleportation signature stream successfully generated.")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Attack Injection Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AttackInjectRequest(BaseModel):
    """Request payload configuring attack injection on active session states."""

    session_id: str = Field(..., description="Active session ID.", examples=["session-alpha-001"])
    attack_type: str = Field(
        ...,
        description="Attack vector to inject: INTERCEPT_RESEND, FORGERY, IMPERSONATION, REPLAY, REPUDIATION, DETECTOR_SIDE_CHANNEL",
        examples=["INTERCEPT_RESEND"],
    )
    intensity: float = Field(
        default=0.45,
        ge=0.0,
        le=1.0,
        description="Intensity scalar (eavesdrop rate, tamper fraction, or blinding ratio).",
        examples=[0.45],
    )
    spoofed_public_key: Optional[str] = Field(
        default="mallory-unauthorized-key-0xDEADBEEF",
        description="Spoofed credential string (for IMPERSONATION).",
        examples=["mallory-unauthorized-key-0xDEADBEEF"],
    )
    replay_age_seconds: Optional[float] = Field(
        default=300.0,
        description="Age in seconds to rewind timestamp (for REPLAY).",
        examples=[300.0],
    )
    asymmetry_rate: Optional[float] = Field(
        default=0.4,
        description="Fraction of states corrupted for Charlie (for REPUDIATION).",
        examples=[0.4],
    )
    path_bias_intensity: Optional[float] = Field(
        default=0.45,
        description="Path B blinding fraction (for DETECTOR_SIDE_CHANNEL).",
        examples=[0.45],
    )
    target_verifier: Optional[str] = Field(
        default="charlie",
        description="Specific verifier block targeted (if applicable: 'bob' or 'charlie').",
        examples=["charlie"],
    )


class AttackInjectResponse(BaseModel):
    """Response payload detailing the injected attack transformation."""

    status: str = Field(default="attack_injected", examples=["attack_injected"])
    session_id: str = Field(..., examples=["session-alpha-001"])
    attack_type: str = Field(..., examples=["INTERCEPT_RESEND"])
    intensity: float = Field(..., examples=[0.45])
    description: str = Field(..., examples=["Physical channel eavesdropping simulated on transit channel."])
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Symmetrization Schemas (Module G)
# ─────────────────────────────────────────────────────────────────────────────

class SymmetrizeRequest(BaseModel):
    """Request payload to perform classical encrypted swap between Bob & Charlie."""

    session_id: str = Field(..., description="Active session ID.", examples=["session-alpha-001"])
    swap_ratio: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Fraction of signature bits swapped (default 0.5 = 50%).",
        examples=[0.5],
    )
    seed: Optional[int] = Field(
        default=None,
        description="Optional RNG seed for deterministic reproducibility.",
        examples=[42],
    )


class SymmetrizeResponse(BaseModel):
    """Response payload summarizing the symmetrization exchange."""

    status: str = Field(default="symmetrized", examples=["symmetrized"])
    session_id: str = Field(..., examples=["session-alpha-001"])
    swap_count: int = Field(..., description="Number of bit indices swapped.", examples=[8])
    total_bits: int = Field(..., description="Total signature bits.", examples=[16])
    swap_ratio_actual: float = Field(..., examples=[0.5])
    alice_informed: bool = Field(default=False, description="Always False: Alice learns zero swap metadata.")
    swap_indices: List[int] = Field(..., description="Indices exchanged between Bob and Charlie.")
    message: str = Field(default="Module G classical symmetrization swap completed between Bob and Charlie.")


# ─────────────────────────────────────────────────────────────────────────────
# 5. Verification Schemas
# ─────────────────────────────────────────────────────────────────────────────

class VerifyRequest(BaseModel):
    """Request payload to execute threat evaluation and signature verification."""

    session_id: str = Field(..., description="Active session ID.", examples=["session-alpha-001"])
    verifier_id: str = Field(
        default="bob",
        description="Which verifier evaluates: 'bob', 'charlie', or 'both'.",
        examples=["bob"],
    )
    expected_public_key: Optional[str] = Field(
        default="alice-authorized-master-key-001",
        description="Expected legitimate signer credential.",
        examples=["alice-authorized-master-key-001"],
    )
    shots: int = Field(
        default=4096,
        ge=100,
        le=65536,
        description="Measurement shot count.",
        examples=[4096],
    )
    apply_postselection: bool = Field(
        default=True,
        description="Whether to apply postselection filtering on ambiguous boundary shots.",
        examples=[True],
    )
    ambiguity_margin: float = Field(
        default=0.03,
        ge=0.0,
        le=0.2,
        description="Tolerance margin for boundary zone rejection.",
        examples=[0.03],
    )


class VerifyResponse(BaseModel):
    """Response payload containing threat detection verdicts and Hoeffding bounds."""

    status: str = Field(default="verified", examples=["verified"])
    session_id: str = Field(..., examples=["session-alpha-001"])
    verifier_id: str = Field(..., examples=["bob"])
    threat_detected: bool = Field(..., description="True if an attack was detected.", examples=[False])
    verdict: str = Field(..., description="'SECURE' or 'THREAT DETECTED'", examples=["SECURE"])
    primary_attack_vector: str = Field(..., description="Classified attack vector name.", examples=["CLEAN"])
    severity: str = Field(..., description="'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'", examples=["LOW"])
    qber: float = Field(..., description="Measured Quantum Bit Error Rate.", examples=[0.0])
    fidelity: float = Field(..., description="Calculated quantum state overlap fidelity.", examples=[1.0])
    e_rob: float = Field(..., description="Dynamic Hoeffding robustness bound.", examples=[0.0654])
    e_rep: float = Field(..., description="Dynamic Hoeffding repudiation bound.", examples=[0.1354])
    e_forg: float = Field(..., description="Dynamic Hoeffding forgery bound.", examples=[0.2054])
    hoeffding_threshold: float = Field(..., description="Base Hoeffding threshold.", examples=[0.1354])
    reason_codes: List[str] = Field(default_factory=list, description="Diagnostic error codes if threat detected.")
    diagnostic_message: str = Field(..., description="Human-readable security verdict explanation.")
    postselected_shots: int = Field(..., description="Shots retained after postselection.", examples=[3973])
    discarded_shots: int = Field(..., description="Ambiguous shots discarded by postselection.", examples=[123])
    both_reports: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Populated with individual Bob & Charlie reports when verifier_id='both'.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# 6. WebSocket Live Telemetry Schemas
# ─────────────────────────────────────────────────────────────────────────────

class LiveTelemetryMessage(BaseModel):
    """Structured frame broadcast over the WebSocket live feed."""

    timestamp: float = Field(..., description="UNIX event timestamp.")
    event_type: str = Field(
        ...,
        description="Event lifecycle code: CONNECTED, KEYGEN, SIGN, ATTACK_INJECT, SYMMETRIZE, POSTSELECTION, VERIFY_STEP, VERDICT, COMPLETE",
        examples=["VERDICT"],
    )
    session_id: str = Field(..., examples=["session-alpha-001"])
    qber: float = Field(default=0.0, description="Real-time estimated or measured QBER.")
    hoeffding_threshold: float = Field(default=0.1354, description="Current dynamic Hoeffding threshold.")
    active_threat: str = Field(default="CLEAN", description="Current threat classification.")
    severity: str = Field(default="LOW", description="Current threat severity.")
    channel_telemetry: Dict[str, Any] = Field(default_factory=dict, description="Detailed per-verifier data.")


# ─────────────────────────────────────────────────────────────────────────────
# 7. System Metrics Schemas
# ─────────────────────────────────────────────────────────────────────────────

class MetricsResponse(BaseModel):
    """Response payload detailing aggregated backend metrics and detection stats."""

    total_simulations: int = Field(..., description="Cumulative simulation sessions created.", examples=[42])
    total_verifications: int = Field(..., description="Cumulative verification runs executed.", examples=[84])
    threats_detected: int = Field(..., description="Total threats detected across all sessions.", examples=[12])
    clean_runs: int = Field(..., description="Total clean signature verifications.", examples=[72])
    detection_rate: float = Field(..., description="Percentage of active attacks detected (0-100%).", examples=[100.0])
    average_qber: float = Field(..., description="Mean QBER observed across all sessions.", examples=[0.042])
    active_sessions: int = Field(..., description="Number of active cached sessions in memory.", examples=[3])
    supported_attack_classes: List[str] = Field(
        default=[
            "INTERCEPT_RESEND",
            "FORGERY",
            "IMPERSONATION",
            "REPLAY",
            "REPUDIATION",
            "DETECTOR_SIDE_CHANNEL",
        ],
        description="The 6 supported quantum cryptanalytic attack vectors.",
    )
