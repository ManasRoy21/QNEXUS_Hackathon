"""Verdict, Reason Codes, Score schemas and responses."""
from pydantic import BaseModel
from typing import List, Optional

class KeyGenResponse(BaseModel):
    status: str
    message: str
    key_id: str

class SignResponse(BaseModel):
    status: str
    signature: str
    message_digest: str

class VerifyResponse(BaseModel):
    verdict: str  # e.g., "SECURE" or "THREAT DETECTED"
    confidence: float
    reason_codes: List[str] = []
    qber: Optional[float] = None
    e_forg: Optional[float] = None
    e_rob: Optional[float] = None

class AttackInjectionResponse(BaseModel):
    status: str
    attack_type: str
    intensity: float

class SymmetrizeResponse(BaseModel):
    status: str
    swapped_elements: int

class MetricsResponse(BaseModel):
    qber: float
    hoeffding_bound: float
    active_attacks: List[str] = []
