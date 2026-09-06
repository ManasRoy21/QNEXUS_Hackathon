"""Request models for API endpoints."""
from pydantic import BaseModel, Field
from typing import Optional, List

class KeyGenRequest(BaseModel):
    key_length: int = Field(default=128, ge=16, le=4096)
    noise_model: Optional[str] = None

class SignRequest(BaseModel):
    message_digest: str
    key_id: str

class VerifyRequest(BaseModel):
    message_digest: str
    signature: str
    key_id: str

class AttackInjectionRequest(BaseModel):
    attack_type: str = Field(..., description="bit_flip, phase_flip, intercept_resend, entanglement_swap, dishonest_alice, compromised_detector")
    intensity: float = Field(default=1.0, ge=0.0, le=1.0)
    target_qubit: Optional[int] = 0

class SymmetrizeRequest(BaseModel):
    session_id: str
    elements_count: int = 64
