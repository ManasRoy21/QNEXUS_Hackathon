"""Bounded wire formats for the educational image-integrity experiment."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ChannelConfig(StrictModel):
    shots: Literal[1024, 4096, 16384] = 4096
    seed: int = Field(default=42, ge=0, le=2**31 - 1)
    noise: float = Field(default=0.01, ge=0, le=0.3)
    interception: float = Field(default=0, ge=0, le=1)


class ChannelMeasurement(StrictModel):
    verifier: Literal["Bob", "Charlie"]
    transmitted: int
    sifted: int
    errors: int
    qber: float
    expected_qber: float
    interval_95: list[float]
    accepted: bool
    matched_counts: dict[str, int]


class ChannelExperiment(StrictModel):
    backend: str
    qiskit_version: str
    aer_version: str
    config: ChannelConfig
    cutoff: float
    circuit_count: int
    circuit_text: str = Field(max_length=12000)
    circuit_qasm: str = Field(max_length=12000)
    measurements: list[ChannelMeasurement] = Field(min_length=2, max_length=2)


class ImageFingerprint(StrictModel):
    width: int = Field(ge=8, le=2048)
    height: int = Field(ge=8, le=2048)
    pixel_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    file_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    tile_hashes: list[str] = Field(min_length=64, max_length=64)


class ImageManifest(StrictModel):
    version: Literal["qds-image-lab/v1"] = "qds-image-lab/v1"
    receipt_id: str = Field(max_length=64)
    issued_at: str = Field(max_length=64)
    key_id: str = Field(max_length=32)
    image: ImageFingerprint
    experiment: ChannelExperiment


class SignedReceipt(StrictModel):
    manifest: ImageManifest
    signature: str = Field(max_length=128)
    algorithm: Literal["Ed25519"] = "Ed25519"


class SealImageRequest(StrictModel):
    image_base64: str = Field(min_length=1, max_length=2_800_000)
    config: ChannelConfig = Field(default_factory=ChannelConfig)


class VerifyImageRequest(StrictModel):
    image_base64: str = Field(min_length=1, max_length=2_800_000)
    receipt: SignedReceipt
