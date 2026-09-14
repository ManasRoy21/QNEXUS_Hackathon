"""Phase 2 Pydantic Schemas for API requests, responses, and session persistence."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ProtocolInfo(BaseModel):
    """Schema for protocol catalogue entries."""
    id: str
    name: str
    status: str
    category: str
    is_interactive: bool
    description: str
    year: Optional[str] = None
    key_strength: Optional[str] = None
    best_result: Optional[str] = None
    citation: Optional[str] = None
    supported_parameters: Optional[Dict[str, Any]] = None


class ProtocolCatalogueResponse(BaseModel):
    """List of all available protocols."""
    total: int
    protocols: List[ProtocolInfo]
    simulated_disclosure: str = "All quantum physical behaviors are statistically simulated via CSPRNG."


class CreateSessionRequest(BaseModel):
    """Request payload to initialize a new Phase 2 protocol session."""
    protocol_id: str = Field("practical_qds", description="Identifier of the protocol to simulate")
    distance_km: float = Field(20.0, ge=0.0, le=1000.0, description="Simulated optical fiber distance in km")
    channel_loss_db: Optional[float] = Field(None, ge=0.0, description="Explicit channel loss in dB")
    message_size_bytes: int = Field(256, ge=1, le=10485760, description="Simulated message/document size in bytes")
    decoy_state_count: int = Field(3, ge=1, le=5, description="Number of decoy intensities")
    failure_probability: float = Field(1e-9, gt=0.0, lt=1.0, description="Acceptable security failure bound epsilon")
    untrusted_node_compromised: bool = Field(False, description="Toggle for MDI-QDS untrusted relay compromise")


class KeygenPhase2Request(BaseModel):
    session_id: str
    num_bits: int = Field(384, ge=64, le=16384)


class SignPhase2Request(BaseModel):
    session_id: str
    message: str = Field("Authorized Quantum Transfer Order: 50,000,000 USD", description="Plaintext or document content to sign")
    large_doc_simulated_kb: Optional[int] = Field(None, ge=1, le=10240, description="Simulate large document up to 10 MB for OTUH")


class VerifyPhase2Request(BaseModel):
    session_id: str
    verifier_role: str = Field("Bob", description="'Bob' or 'Charlie'")
    force_forgery: bool = Field(False, description="Simulate forgery attempt")
    untrusted_node_compromised: Optional[bool] = Field(None, description="Override MDI untrusted relay node status")


class TransferRequest(BaseModel):
    """Bob forwards (message, signature) to Charlie for independent arbitration."""
    session_id: str


class AttackSimulateRequest(BaseModel):
    """Interactive attack simulation against a running session."""
    session_id: str
    attack_type: str = Field("FORGERY", description="FORGERY, REPUDIATION, EAVESDROPPING, DETECTOR_COMPROMISE, PNS_ATTACK")
    intensity: float = Field(1.0, ge=0.0, le=2.0)
    target_role: str = Field("Bob", description="Bob, Charlie, or Channel")


class BenchmarkPoint(BaseModel):
    distance_km: float
    channel_loss_db: float
    effective_key_rate_bps: float
    simulated_qber: float
    signing_latency_ms: float
    verification_latency_ms: float
    key_consumed_bits: int
    key_to_message_ratio: float
    verdict: str


class ProtocolBenchmarkSeries(BaseModel):
    protocol_id: str
    protocol_name: str
    points: List[BenchmarkPoint]


class BenchmarkSweepRequest(BaseModel):
    protocol_ids: List[str] = Field(default_factory=lambda: ["practical_qds", "mdi_qds", "otuh_qds"])
    distance_points_km: List[float] = Field(default_factory=lambda: [10.0, 30.0, 60.0, 90.0, 120.0])
    message_size_bytes: int = 1024


class BenchmarkSweepResponse(BaseModel):
    sweep_id: str
    parameters: BenchmarkSweepRequest
    series: List[ProtocolBenchmarkSeries]
    total_execution_time_ms: float
    is_simulated: bool = True


class SessionStateResponse(BaseModel):
    session_id: str
    protocol_id: str
    protocol_name: str
    distance_km: float
    channel_loss_db: float
    message_size_bytes: int
    untrusted_node_compromised: bool
    status: str
    key_material: Optional[Dict[str, Any]] = None
    signature: Optional[Dict[str, Any]] = None
    bob_verification: Optional[Dict[str, Any]] = None
    charlie_verification: Optional[Dict[str, Any]] = None
    transfer_status: Optional[str] = None
    last_attack: Optional[Dict[str, Any]] = None
    protocol_trace: List[Dict[str, Any]] = Field(default_factory=list)
    is_simulated: bool = True
    created_at: float
