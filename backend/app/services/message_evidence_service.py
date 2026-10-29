"""Authenticated message-to-experiment evidence; not a quantum signature scheme."""
import hashlib
from datetime import datetime, timezone
from uuid import uuid4
from app.engine.attack_engine import state_store
from app.schemas.message_evidence import MessageManifest, MessageReceipt
from app.services.image_lab_service import image_lab_service
from app.storage.repository import encode


def message_hash(message):
    return hashlib.sha256(message.encode('utf-8')).hexdigest()


def configuration_hash(state):
    return hashlib.sha256(encode({'configuration': state.configuration.model_dump(),
        'parameter_estimation': state.parameter_estimation, 'execution': state.execution,
        'model_version': state.model_version}).encode()).hexdigest()


def sign_message(simulation_id, message):
    state = state_store.require(simulation_id)
    if not state.execution.get('transcript_sha256'):
        raise ValueError('This older run has no measurement transcript. Generate fresh material first.')
    manifest = MessageManifest(receipt_id='msg-'+uuid4().hex,
        issued_at=datetime.now(timezone.utc).isoformat(), key_id=image_lab_service.key_id,
        simulation_id=state.simulation_id, message_sha256=message_hash(message),
        transcript_sha256=state.execution['transcript_sha256'], configuration_sha256=configuration_hash(state))
    signature = image_lab_service.sign_evidence(manifest.model_dump(mode='json'))
    return MessageReceipt(manifest=manifest, signature=signature)


def verify_message(message, receipt):
    manifest = receipt.manifest
    authentic = image_lab_service.verify_evidence(manifest.model_dump(mode='json'), receipt.signature) and manifest.key_id == image_lab_service.key_id
    if not authentic:
        return {'verdict': 'UNTRUSTED_RECEIPT', 'signature_valid': False,
                'message_matches': False, 'evidence_matches': False, 'verifiers': []}
    state = state_store.require(manifest.simulation_id)
    matches = message_hash(message) == manifest.message_sha256
    evidence_matches = (state.execution.get('transcript_sha256') == manifest.transcript_sha256
                        and configuration_hash(state) == manifest.configuration_sha256)
    verifiers = []
    for name in ('bob', 'charlie'):
        estimate = state.parameter_estimation.get(name, {})
        decision = estimate.get('decision', 'NO_DATA')
        status = ('REJECT' if not matches or not evidence_matches or decision == 'SAMPLE_REJECT'
                  else 'ACCEPT' if decision == 'PASS' else 'INCONCLUSIVE')
        verifiers.append({'verifier': name, 'status': status, 'sampling_decision': decision,
                          'remaining_error_upper_bound': estimate.get('remaining_error_upper_bound')})
    verdict = ('MESSAGE_CHANGED' if not matches else 'EVIDENCE_CHANGED' if not evidence_matches
               else 'CHANNEL_REJECTED' if any(v['status'] == 'REJECT' for v in verifiers)
               else 'INCONCLUSIVE' if any(v['status'] == 'INCONCLUSIVE' for v in verifiers) else 'VERIFIED')
    return {'verdict': verdict, 'signature_valid': True, 'message_matches': matches,
            'evidence_matches': evidence_matches, 'candidate_sha256': message_hash(message),
            'verifiers': verifiers, 'scope': 'Classical receipt authenticity plus recorded channel sampling policy. Not QDS non-repudiation.'}
