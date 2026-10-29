"""Pixel integrity and authenticated experiment receipts. Images are not stored."""

import base64
import binascii
import hashlib
import io
import json
import warnings
from datetime import datetime, timezone
from uuid import uuid4

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from PIL import Image, ImageOps, UnidentifiedImageError
from app.core.config import settings

from app.engine.quantum.image_channel import run_channel
from app.schemas.image_lab import ImageFingerprint, ImageManifest, SealImageRequest, VerifyImageRequest, SignedReceipt

MAX_BYTES = 2 * 1024 * 1024
MAX_PIXELS = 2_000_000


def canonical_manifest(manifest: ImageManifest) -> bytes:
    return json.dumps(manifest.model_dump(mode="json"), sort_keys=True,
                      separators=(",", ":"), allow_nan=False).encode()


def fingerprint_image(encoded: str) -> ImageFingerprint:
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("Image must be valid base64 without a data-URL prefix.") from exc
    if len(raw) > MAX_BYTES:
        raise ValueError("Image exceeds the 2 MiB file limit.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as source:
                if source.format not in {"PNG", "JPEG", "WEBP"}:
                    raise ValueError("Use a still PNG, JPEG, or WebP image.")
                width, height = source.size
                if min(width, height) < 8 or max(width, height) > 2048 or width * height > MAX_PIXELS:
                    raise ValueError("Use an image at least 8×8, at most 2048 per side and 2 megapixels.")
                if getattr(source, "n_frames", 1) != 1:
                    raise ValueError("Animated images are not supported.")
                image = ImageOps.exif_transpose(source).convert("RGBA")
                width, height = image.size
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError,
            Image.DecompressionBombWarning) as exc:
        raise ValueError("Cannot decode this image safely. Use a PNG, JPEG, or WebP.") from exc
    header = f"rgba:{width}:{height}:".encode()
    tiles = []
    for row in range(8):
        for column in range(8):
            tile = image.crop((column * width // 8, row * height // 8,
                               (column + 1) * width // 8, (row + 1) * height // 8))
            tiles.append(hashlib.sha256(tile.tobytes()).hexdigest())
    return ImageFingerprint(width=width, height=height,
                            pixel_sha256=hashlib.sha256(header + image.tobytes()).hexdigest(),
                            file_sha256=hashlib.sha256(raw).hexdigest(), tile_hashes=tiles)


class ImageLabService:
    def __init__(self):
        seed = settings.IMAGE_LAB_SIGNING_KEY
        self.persistent = bool(seed)
        if seed:
            self._key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(seed))
        else:
            self._key = Ed25519PrivateKey.generate()
        public = self._key.public_key().public_bytes(serialization.Encoding.Raw,
                                                    serialization.PublicFormat.Raw)
        self.public_key = base64.b64encode(public).decode()
        self.key_id = hashlib.sha256(public).hexdigest()[:16]

    def sign_evidence(self, payload: dict) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
        return base64.b64encode(self._key.sign(encoded)).decode()

    def verify_evidence(self, payload: dict, signature: str) -> bool:
        try:
            encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
            self._key.public_key().verify(base64.b64decode(signature, validate=True), encoded)
            return True
        except (InvalidSignature, ValueError, binascii.Error):
            return False

    def capabilities(self):
        return {"algorithm": "Ed25519", "public_key": self.public_key, "key_id": self.key_id,
                "persistent_key": self.persistent, "max_image_bytes": MAX_BYTES,
                "max_pixels": MAX_PIXELS, "grid_size": 8,
                "model": "BB84 channel demonstration + classical signed image manifest",
                "limitations": ["Local simulation, not IBM quantum hardware.",
                    "No QDS symmetrization, privacy amplification, or non-repudiation proof.",
                    "The 11% channel cutoff is an illustrative policy, not a security guarantee.",
                    "The image digest uses SHA-256; receipt authentication uses classical Ed25519.",
                    "Seeded simulation randomness is reproducible and is not cryptographic key material."]}

    def seal(self, request: SealImageRequest) -> SignedReceipt:
        fingerprint = fingerprint_image(request.image_base64)
        experiment = run_channel(request.config)
        manifest = ImageManifest(receipt_id=f"img-{uuid4().hex}",
                                 issued_at=datetime.now(timezone.utc).isoformat(),
                                 key_id=self.key_id, image=fingerprint, experiment=experiment)
        signature = base64.b64encode(self._key.sign(canonical_manifest(manifest))).decode()
        return SignedReceipt(manifest=manifest, signature=signature)

    def verify(self, request: VerifyImageRequest):
        candidate = fingerprint_image(request.image_base64)
        receipt = request.receipt
        try:
            self._key.public_key().verify(base64.b64decode(receipt.signature, validate=True),
                                          canonical_manifest(receipt.manifest))
            signature_valid = receipt.manifest.key_id == self.key_id
        except (InvalidSignature, ValueError, binascii.Error):
            signature_valid = False
        # Do not display untrusted manifest fields as verified evidence.
        if not signature_valid:
            return {"signature_valid": False, "pixels_match": False, "file_match": False,
                    "dimensions_match": False, "changed_tiles": [], "changed_tile_count": 0,
                    "candidate_sha256": candidate.pixel_sha256, "verdict": "UNTRUSTED_RECEIPT",
                    "verifiers": [], "explanation": "Receipt signature is invalid or its issuer key changed. Reseal the image with this server."}
        original = receipt.manifest.image
        dimensions_match = (original.width, original.height) == (candidate.width, candidate.height)
        pixels_match = original.pixel_sha256 == candidate.pixel_sha256
        changed = ([i for i, (a, b) in enumerate(zip(original.tile_hashes, candidate.tile_hashes)) if a != b]
                   if dimensions_match else list(range(64)))
        verifiers = [{"verifier": m.verifier, "accepted": pixels_match and m.accepted,
                      "channel_accepted": m.accepted, "qber": m.qber}
                     for m in receipt.manifest.experiment.measurements]
        verdict = ("IMAGE_CHANGED" if not pixels_match else
                   "CHANNEL_REJECTED" if not all(v["accepted"] for v in verifiers) else "VERIFIED")
        explanation = {"IMAGE_CHANGED": "Decoded pixels differ from the signed original. Highlighted tiles locate changes; they do not identify who edited the image.",
                       "CHANNEL_REJECTED": "Image pixels match, but at least one simulated channel exceeds the illustrative 11% error policy.",
                       "VERIFIED": "Receipt signature and decoded pixels match. Both simulated channels pass the illustrative error policy."}[verdict]
        return {"signature_valid": True, "pixels_match": pixels_match,
                "file_match": original.file_sha256 == candidate.file_sha256,
                "dimensions_match": dimensions_match, "changed_tiles": changed,
                "changed_tile_count": len(changed), "candidate_sha256": candidate.pixel_sha256,
                "verdict": verdict, "verifiers": verifiers, "explanation": explanation}


image_lab_service = ImageLabService()
