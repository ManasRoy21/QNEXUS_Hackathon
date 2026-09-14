"""Phase 2: Base Protocol Adapter Interface & Data Contracts.

Conforms strictly to Section 5.1 of the Phase 2 SRS:
Every protocol adapter implements:
  - generateKeys(config) -> produce simulated key/state material and error/loss statistics
  - sign(message, keyMaterial) -> produce protocol-specific signature object
  - verify(message, signature, verifierKeyShare) -> return Accept/Reject with reasoning trace
  - simulateAttack(type, session) -> apply forgery, repudiation, or channel attack
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
import time
from typing import Any, Dict, List, Optional, Union
import secrets


class ProtocolCategory(str, Enum):
    EXPERIMENTAL = "experimental"
    THEORETICAL = "theoretical"


class AttackType(str, Enum):
    CLEAN = "CLEAN"
    FORGERY = "FORGERY"
    REPUDIATION = "REPUDIATION"
    EAVESDROPPING = "EAVESDROPPING"
    DETECTOR_COMPROMISE = "DETECTOR_COMPROMISE"
    PNS_ATTACK = "PNS_ATTACK"


@dataclass
class ProtocolConfig:
    """Session configuration parameters."""
    protocol_id: str
    distance_km: float = 20.0
    channel_loss_db: Optional[float] = None
    message_size_bytes: int = 256
    decoy_state_count: int = 3
    failure_probability: float = 1e-9
    num_bits: int = 384
    untrusted_node_compromised: bool = False
    custom_params: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.distance_km < 0:
            raise ValueError("Distance cannot be negative.")
        if self.channel_loss_db is None:
            # Standard single-mode silica optical fiber loss at 1550nm: ~0.2 dB/km
            self.channel_loss_db = round(self.distance_km * 0.2, 3)
        elif self.channel_loss_db < 0:
            raise ValueError("Channel loss cannot be negative.")
        if self.message_size_bytes <= 0:
            raise ValueError("Message size must be greater than zero.")
        if self.failure_probability <= 0 or self.failure_probability >= 1:
            raise ValueError("Failure probability must be in range (0, 1).")


@dataclass
class KeyMaterialResult:
    """Simulated quantum key / state material produced by generateKeys()."""
    session_id: str
    protocol_id: str
    raw_key_bits_alice: str
    key_share_bob: Dict[str, Any]
    key_share_charlie: Dict[str, Any]
    raw_key_length: int
    effective_key_rate_bps: float
    quantum_bit_error_rate: float
    channel_loss_db: float
    distance_km: float
    generation_latency_ms: float
    decoy_statistics: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_simulated: bool = True
    created_at: float = field(default_factory=time.time)


@dataclass
class SignatureObject:
    """Cryptographic signature object produced by sign()."""
    signature_id: str
    protocol_id: str
    message_digest: str
    message_size_bytes: int
    signature_tokens: List[str]
    signer_public_key: str
    signer_role: str = "Alice"
    signing_latency_ms: float = 0.0
    key_consumed_bits: int = 0
    key_to_message_ratio: float = 1.0
    timestamp: float = field(default_factory=time.time)
    nonce: str = field(default_factory=lambda: secrets.token_hex(16))
    algorithm_details: Dict[str, Any] = field(default_factory=dict)
    is_simulated: bool = True


@dataclass
class VerificationResult:
    """Outcome of signature verification by Bob or Charlie."""
    verifier_role: str  # "Bob" or "Charlie"
    verdict: str  # "ACCEPT" or "REJECT"
    is_valid: bool
    qber: float
    disagreement_rate: float
    security_threshold: float
    reason_code: str
    reasoning_trace: List[str]
    internal_checks: Dict[str, Any]
    verification_latency_ms: float
    transferable: bool = True
    untrusted_node_status: Optional[str] = None
    is_simulated: bool = True
    timestamp: float = field(default_factory=time.time)


@dataclass
class AttackOutcome:
    """Result of an attack simulation against a running session."""
    attack_type: str
    attack_detected: bool
    protocol_resisted: bool
    verdict: str
    reason_code: str
    explanation: str
    resulting_qber: float
    resulting_verdict_bob: str
    resulting_verdict_charlie: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_simulated: bool = True


class BaseProtocolAdapter(ABC):
    """Abstract base class for all QDS protocol adapters.
    
    Adheres strictly to the four-method interface defined in Section 5.1.
    """

    def __init__(self, protocol_id: str, name: str, description: str):
        self.protocol_id = protocol_id
        self.name = name
        self.description = description

    @abstractmethod
    def generate_keys(self, config: ProtocolConfig) -> KeyMaterialResult:
        """Produce simulated key/state material and associated error/loss statistics."""
        pass

    @abstractmethod
    def sign(
        self,
        message: Union[str, bytes],
        key_material: KeyMaterialResult,
        signer_key: Optional[str] = None,
    ) -> SignatureObject:
        """Produce a protocol-specific signature object using Alice's key material."""
        pass

    @abstractmethod
    def verify(
        self,
        message: Union[str, bytes],
        signature: SignatureObject,
        verifier_key_share: Dict[str, Any],
        verifier_role: str = "Bob",
        context: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """Verify (message, signature) pair and return Accept/Reject with reasoning trace."""
        pass

    @abstractmethod
    def simulate_attack(
        self,
        attack_type: str,
        config: ProtocolConfig,
        key_material: KeyMaterialResult,
        signature: SignatureObject,
        params: Optional[Dict[str, Any]] = None,
    ) -> AttackOutcome:
        """Apply forgery, repudiation, or channel attack and return resulting outcome."""
        pass
