"""Offline verification. The issuer public key MUST come from a trusted source."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from app.schemas.image_lab import SignedReceipt
from app.services.image_lab_service import canonical_manifest, fingerprint_image


def verify_export(report: dict, image_bytes: bytes, trusted_public_key: str) -> dict:
    receipt = SignedReceipt.model_validate(report['receipt'])
    public_bytes = base64.b64decode(trusted_public_key, validate=True)
    public = Ed25519PublicKey.from_public_bytes(public_bytes)
    public.verify(base64.b64decode(receipt.signature, validate=True), canonical_manifest(receipt.manifest))
    if hashlib.sha256(public_bytes).hexdigest()[:16] != receipt.manifest.key_id:
        raise ValueError('Issuer key ID does not match the trusted key.')
    candidate = fingerprint_image(base64.b64encode(image_bytes).decode())
    pixels_match = candidate.pixel_sha256 == receipt.manifest.image.pixel_sha256
    channel_accepted = all(m.accepted for m in receipt.manifest.experiment.measurements)
    return {'signature_valid': True, 'pixels_match': pixels_match,
            'channel_accepted': channel_accepted, 'accepted': pixels_match and channel_accepted}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report', type=Path)
    parser.add_argument('image', type=Path)
    parser.add_argument('--trusted-public-key', required=True, help='Base64 Ed25519 public key independently pinned from issuer')
    args = parser.parse_args()
    try:
        result = verify_export(json.loads(args.report.read_text()), args.image.read_bytes(), args.trusted_public_key)
    except Exception:
        print(json.dumps({'accepted': False, 'error': 'Invalid receipt, untrusted issuer, or unreadable image.'}))
        return 2
    print(json.dumps(result, indent=2))
    return 0 if result['accepted'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
