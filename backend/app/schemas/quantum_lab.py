"""Bounded teaching experiments and opt-in hardware jobs."""
from typing import Literal
from pydantic import Field
from app.schemas.image_lab import StrictModel


class KeyExchangeRequest(StrictModel):
    pulses: Literal[2048, 4096, 8192] = 4096
    seed: int = Field(default=42, ge=0, le=2**31-1)
    noise: float = Field(default=0, ge=0, le=.3)
    interception: float = Field(default=0, ge=0, le=1)
    message: str = Field(default='Pay ₹10,000 to Rahul. Reference QN-204.', min_length=1, max_length=512)


class DemoEnvelope(StrictModel):
    key_hex: str = Field(pattern=r'^[0-9a-f]{64}$')
    nonce: str = Field(min_length=16, max_length=16)
    ciphertext: str = Field(min_length=24, max_length=3000)


class BellRequest(StrictModel):
    shots: Literal[1024, 4096, 8192] = 4096
    seed: int = Field(default=42, ge=0, le=2**31-1)
    noise: float = Field(default=0, ge=0, le=1)
    interception: float = Field(default=0, ge=0, le=1)
    state: Literal['bell', 'product'] = 'bell'


class HardwareRequest(StrictModel):
    shots: Literal[1024, 2048] = 1024
    confirm_hardware_use: Literal[True]
