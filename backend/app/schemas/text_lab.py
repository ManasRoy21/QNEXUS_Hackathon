"""Text receipts bind exact UTF-8 bytes to a bounded channel experiment."""
from typing import Literal
from pydantic import Field
from app.schemas.image_lab import StrictModel, ChannelConfig, ChannelExperiment


class TextManifest(StrictModel):
    version: Literal['qds-text-lab/v1'] = 'qds-text-lab/v1'
    receipt_id: str = Field(max_length=64)
    issued_at: str = Field(max_length=64)
    key_id: str = Field(max_length=32)
    message_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    utf8_bytes: int = Field(ge=1, le=16384)
    experiment: ChannelExperiment


class TextReceipt(StrictModel):
    algorithm: Literal['Ed25519'] = 'Ed25519'
    manifest: TextManifest
    signature: str = Field(max_length=128)


class SealTextRequest(StrictModel):
    message: str = Field(min_length=1, max_length=4096)
    config: ChannelConfig = Field(default_factory=ChannelConfig)


class VerifyTextRequest(StrictModel):
    # Deleting the entire candidate is still a valid tampering test.
    message: str = Field(max_length=4096)
    receipt: TextReceipt


class TextVerifier(StrictModel):
    verifier: str
    accepted: bool
    channel_accepted: bool
    qber: float


class TextVerification(StrictModel):
    signature_valid: bool
    message_matches: bool
    candidate_sha256: str
    verdict: Literal['VERIFIED', 'MESSAGE_CHANGED', 'CHANNEL_REJECTED', 'UNTRUSTED_RECEIPT']
    explanation: str
    verifiers: list[TextVerifier]
