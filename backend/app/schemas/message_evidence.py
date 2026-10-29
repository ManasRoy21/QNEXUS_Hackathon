"""Classical message evidence tied to a saved quantum-distribution experiment."""
from typing import Literal
from pydantic import Field
from app.schemas.image_lab import StrictModel


class SignMessageRequest(StrictModel):
    message: str = Field(min_length=1, max_length=4096)


class MessageManifest(StrictModel):
    version: Literal['qds-message-evidence/v1'] = 'qds-message-evidence/v1'
    receipt_id: str = Field(max_length=64)
    issued_at: str = Field(max_length=64)
    key_id: str = Field(max_length=32)
    simulation_id: str = Field(max_length=64)
    message_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    transcript_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    configuration_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')


class MessageReceipt(StrictModel):
    algorithm: Literal['Ed25519'] = 'Ed25519'
    manifest: MessageManifest
    signature: str = Field(max_length=128)


class VerifyMessageRequest(SignMessageRequest):
    receipt: MessageReceipt
