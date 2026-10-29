"""Classical text integrity plus simulated channel evidence; no text is stored."""
from datetime import datetime, timezone
from uuid import uuid4
from app.engine.quantum.image_channel import run_channel
from app.schemas.text_lab import SealTextRequest, VerifyTextRequest, TextManifest, TextReceipt
from app.services.image_lab_service import image_lab_service
from app.services.message_evidence_service import message_hash


def seal_text(request: SealTextRequest) -> TextReceipt:
    manifest = TextManifest(
        receipt_id='txt-' + uuid4().hex,
        issued_at=datetime.now(timezone.utc).isoformat(),
        key_id=image_lab_service.key_id,
        message_sha256=message_hash(request.message),
        utf8_bytes=len(request.message.encode('utf-8')),
        experiment=run_channel(request.config),
    )
    return TextReceipt(manifest=manifest, signature=image_lab_service.sign_evidence(manifest.model_dump(mode='json')))


def verify_text(request: VerifyTextRequest):
    receipt = request.receipt
    digest = message_hash(request.message)
    authentic = (image_lab_service.verify_evidence(receipt.manifest.model_dump(mode='json'), receipt.signature)
                 and receipt.manifest.key_id == image_lab_service.key_id)
    if not authentic:
        return dict(signature_valid=False, message_matches=False, candidate_sha256=digest,
                    verdict='UNTRUSTED_RECEIPT', verifiers=[],
                    explanation='Receipt signature is invalid or the server signing key changed. Reseal the original text.')
    matches = digest == receipt.manifest.message_sha256
    verifiers = [dict(verifier=m.verifier, accepted=matches and m.accepted,
                      channel_accepted=m.accepted, qber=m.qber)
                 for m in receipt.manifest.experiment.measurements]
    verdict = ('MESSAGE_CHANGED' if not matches else 'CHANNEL_REJECTED'
               if not all(v['channel_accepted'] for v in verifiers) else 'VERIFIED')
    explanations = {
        'MESSAGE_CHANGED': 'The candidate UTF-8 bytes differ from the signed original. Case, spaces, line breaks and Unicode representation all count.',
        'CHANNEL_REJECTED': 'The text matches, but at least one simulated channel fails the illustrative 11% error policy.',
        'VERIFIED': 'The receipt is authentic, the text matches, and both simulated channels pass the illustrative error policy.',
    }
    return dict(signature_valid=True, message_matches=matches, candidate_sha256=digest,
                verdict=verdict, explanation=explanations[verdict], verifiers=verifiers)
