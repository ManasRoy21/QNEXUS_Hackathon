"""Canonical Simulation State & Request Schemas.

Conforms to the Developer Specification (REQ-QDS-SIM-2026-V1):
  - Strongly typed Pydantic models for reproducibility and transparency.
  - Replaces flat untyped dictionaries.
  - Enforces physical parameter boundary validations.
"""

from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field, model_validator, ConfigDict


class SimulationConfiguration(BaseModel):
    """Configurable physical and protocol parameters."""
    measurement_backend: Literal["numpy", "qiskit_aer"] = "numpy"
    interception_fraction: float = Field(default=0, ge=0, le=1)

    pulse_count: int = Field(
        ...,
        gt=0,
        description="Total transmitted optical pulses (N) from Alice",
    )
    distance_km: float = Field(
        ...,
        ge=0.0,
        le=500.0,
        description="Physical optical fiber distance in kilometers",
    )
    fiber_attenuation: float = Field(
        ...,
        gt=0.0,
        le=2.0,
        description="Fiber attenuation alpha in dB/km (standard SMF-28 is 0.160 dB/km)",
    )
    detector_efficiency: float = Field(
        ...,
        gt=0.0,
        le=1.0,
        description="Quantum efficiency eta_d of single-photon detectors (SNSPD is ~0.93)",
    )
    dark_count_rate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Dark count probability p_dark per detector gate window",
    )
    baseline_qber: float = Field(
        ...,
        ge=0.0,
        lt=0.5,
        description="Intrinsic optical alignment and polarization drift error rate e0",
    )
    beta: float = Field(
        ...,
        gt=0.0,
        lt=1.0,
        description="Fraction of sifted conclusive bits allocated to parameter estimation (test bits)",
    )
    authentication_threshold: float = Field(
        ...,
        ge=0.0,
        lt=1.0,
        description="Authentication error threshold Ta for accepting Alice's signature material",
    )
    verification_threshold: float = Field(
        ...,
        ge=0.0,
        lt=1.0,
        description="Verification error threshold Tv for Charlie accepting transferred signature",
    )
    security_target: float = Field(
        default=1.0e-5,
        gt=0.0,
        lt=1.0,
        description="Combined information-theoretic failure probability target epsilon_sec",
    )

    @model_validator(mode="after")
    def validate_threshold_ordering(self) -> "SimulationConfiguration":
        if self.authentication_threshold >= self.verification_threshold:
            raise ValueError(
                f"Authentication threshold Ta ({self.authentication_threshold}) "
                f"must be strictly less than Verification threshold Tv ({self.verification_threshold})"
            )
        return self


class SignatureMaterialData(BaseModel):
    """Simulated quantum states, measurements, conclusive bits, and test-bit split."""

    generated_states: List[int] = Field(
        ...,
        description="Alice's prepared state bits (first 64 sample bits for audit display)",
    )
    bob_measurements: List[int] = Field(
        ...,
        description="Bob's raw measured outcome bits (sample for audit display)",
    )
    charlie_measurements: List[int] = Field(
        ...,
        description="Charlie's raw measured outcome bits (sample for audit display)",
    )
    bob_conclusive_bits: str = Field(
        ...,
        description="Bob's sifted conclusive bitstring (K_B)",
    )
    charlie_conclusive_bits: str = Field(
        ...,
        description="Charlie's sifted conclusive bitstring (K_C)",
    )
    test_bits: Dict[str, Any] = Field(
        ...,
        description="Test bits sampled for channel estimation (beta split)",
    )
    untested_bits: Dict[str, Any] = Field(
        ...,
        description="Untested bits M_u retained for signature binding",
    )


class MeasurementStatistics(BaseModel):
    """Auditable empirical measurement statistics derived from simulation."""

    transmitted_pulses: int = Field(..., description="Total Alice optical pulses N")
    detected_events: int = Field(..., description="Total combined optical detection events")
    conclusive_count_bob: int = Field(..., description="Total conclusive bits for Bob |K_B|")
    conclusive_count_charlie: int = Field(..., description="Total conclusive bits for Charlie |K_C|")
    mismatch_count_bob: int = Field(..., description="Total bit mismatches observed by Bob on conclusive bits")
    mismatch_count_charlie: int = Field(..., description="Total bit mismatches observed by Charlie on conclusive bits")
    qber_bob: float = Field(..., description="Empirical QBER for Bob = mismatch_count_bob / |K_B|")
    qber_charlie: float = Field(..., description="Empirical QBER for Charlie = mismatch_count_charlie / |K_C|")


class ThresholdsData(BaseModel):
    """Authentication and verification thresholds with non-repudiation margin."""

    Ta: float = Field(..., description="Authentication threshold Ta (direct verification)")
    Tv: float = Field(..., description="Verification threshold Tv (forwarding verification)")
    gap: float = Field(..., description="Non-repudiation security margin (Tv - Ta)")


class SigningExecution(BaseModel):
    """Alice signature creation binding to generated material."""

    message: str = Field(..., description="Target plaintext message signed by Alice")
    sha256_hash: str = Field(..., description="Cryptographic SHA-256 digest of target message")
    signature_length: int = Field(..., description="Signature length in pulses (2N)")


class ModelMetadata(BaseModel):
    """Scientific model identity, versioning, assumptions, and simplifications."""

    model_name: str = Field(..., description="Descriptive protocol model name")
    model_version: str = Field(..., description="Strict semantic model version (e.g., practical_qds_v1)")
    model_type: str = Field(default="SIMULATION MODEL", description="Strictly designated as SIMULATION MODEL (not laboratory experiment)")
    disclaimer: str = Field(
        default="SIMULATION MODEL — Derived from mathematical and Monte Carlo optical channel models, not experimental laboratory hardware.",
        description="Transparency disclaimer",
    )
    assumptions: List[str] = Field(..., description="Physical and optical assumptions of this model")
    simplifications: List[str] = Field(..., description="Explicit simulation simplifications documented for transparency")


class MetricTrace(BaseModel):
    """Traceability breakdown for a single computed metric."""

    metric_name: str = Field(..., description="Name of computed metric")
    formula: str = Field(..., description="Underlying mathematical formula")
    inputs: Dict[str, Any] = Field(..., description="Raw input values used in calculation")
    calculation_steps: List[str] = Field(..., description="Step-by-step intermediate calculation expressions")
    result: Any = Field(..., description="Computed metric result")
    interpretation: str = Field(..., description="Physical and security interpretation")


class CanonicalSimulationState(BaseModel):
    """Primary canonical state container for all QDS protocol simulation lifecycles."""

    simulation_id: str = Field(..., description="Unique simulation run identifier")
    seed: int = Field(..., description="Deterministic PRNG integer seed")
    protocol: str = Field(default="practical_qds", description="Protocol identifier")
    model_version: str = Field(default="practical_qds_v1", description="Mathematical model version")
    timestamp: float = Field(..., description="UNIX epoch timestamp of execution")
    configuration: SimulationConfiguration
    material: SignatureMaterialData
    measurement_statistics: MeasurementStatistics
    thresholds: ThresholdsData
    signing: SigningExecution
    model_metadata: ModelMetadata
    trace: Dict[str, Any] = Field(default_factory=dict, description="Step-by-step mathematical traceability and origin for all major metrics")
    warnings: List[str] = Field(default_factory=list, description="Advisory warnings or threshold alerts")
    execution: Dict[str, Any] = Field(default_factory=dict)
    parameter_estimation: Dict[str, Any] = Field(default_factory=dict)


class GenerateMaterialRequest(BaseModel):
    """Request payload for POST /api/v1/simulation/generate-material."""
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    measurement_backend: Literal["numpy", "qiskit_aer"] = "numpy"
    interception_fraction: float = Field(default=0, ge=0, le=1)
    estimation_failure_probability: float = Field(default=0.01, gt=0, lt=1)

    protocol: str = Field("practical_qds", description="Target protocol identifier")
    pulse_count: int = Field(
        10_000,
        gt=0,
        le=1_000_000,
        description="Total transmitted pulses (N)",
    )
    distance_km: float = Field(
        20.0,
        ge=0.0,
        le=500.0,
        description="Fiber distance in kilometers",
    )
    fiber_attenuation: float = Field(
        0.160,
        gt=0.0,
        le=2.0,
        description="Fiber attenuation alpha in dB/km",
    )
    detector_efficiency: float = Field(
        0.93,
        gt=0.0,
        le=1.0,
        description="Detector efficiency eta_d",
    )
    dark_count_rate: float = Field(
        1.0e-7,
        ge=0.0,
        le=1.0,
        description="Dark count rate per gate window",
    )
    baseline_qber: float = Field(
        0.010,
        ge=0.0,
        lt=0.5,
        description="Optical baseline QBER e0",
    )
    beta: float = Field(
        0.30,
        gt=0.0,
        lt=1.0,
        description="Test-bit sampling fraction beta",
    )
    authentication_threshold: float = Field(
        0.0150,
        ge=0.0,
        lt=1.0,
        description="Authentication threshold Ta",
    )
    verification_threshold: float = Field(
        0.0645,
        ge=0.0,
        lt=1.0,
        description="Verification threshold Tv",
    )
    seed: Optional[int] = Field(
        None,
        ge=0,
        le=2**31 - 1,
        description="Optional deterministic PRNG integer seed. If omitted, a random seed is selected and returned.",
    )
    message: Optional[str] = Field(
        "Transfer ₹ 10,000 to Account #8849-B",
        max_length=4096,
        description="Plaintext message for signature creation",
    )

    @model_validator(mode="after")
    def validate_threshold_ordering(self) -> "GenerateMaterialRequest":
        if self.measurement_backend == "qiskit_aer" and self.pulse_count > 100_000:
            raise ValueError("Qiskit runs are limited to 100,000 pulses; use NumPy for larger statistical studies.")
        if self.authentication_threshold >= self.verification_threshold:
            raise ValueError(
                f"Authentication threshold Ta ({self.authentication_threshold}) "
                f"must be strictly less than Verification threshold Tv ({self.verification_threshold})"
            )
        return self
