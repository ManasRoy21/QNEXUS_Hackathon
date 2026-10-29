"""Text integrity, signed channel evidence, and bounded API regression tests."""
import hashlib
import pytest
from app.schemas.image_lab import ChannelConfig
from app.schemas.text_lab import SealTextRequest, VerifyTextRequest
from app.services.text_lab_service import seal_text, verify_text

MESSAGE = 'Authorize dataset QN-204.\nApproved by Alice. 🔬'


@pytest.fixture
def receipt():
    return seal_text(SealTextRequest(message=MESSAGE, config=ChannelConfig(noise=0)))


def test_exact_utf8_is_sealed_and_restored(receipt):
    assert receipt.manifest.message_sha256 == hashlib.sha256(MESSAGE.encode('utf-8')).hexdigest()
    assert receipt.manifest.utf8_bytes == len(MESSAGE.encode('utf-8'))
    original_signature = receipt.signature
    baseline = verify_text(VerifyTextRequest(message=MESSAGE, receipt=receipt))
    assert baseline['verdict'] == 'VERIFIED'
    assert all(v['accepted'] for v in baseline['verifiers'])
    changed = verify_text(VerifyTextRequest(message=MESSAGE + '!', receipt=receipt))
    assert changed['verdict'] == 'MESSAGE_CHANGED'
    assert all(v['channel_accepted'] and not v['accepted'] for v in changed['verifiers'])
    assert verify_text(VerifyTextRequest(message=MESSAGE, receipt=receipt))['verdict'] == 'VERIFIED'
    assert receipt.signature == original_signature


@pytest.mark.parametrize('candidate', ['', MESSAGE.lower(), MESSAGE + ' ', MESSAGE.replace('\n', '\r\n')])
def test_case_whitespace_linebreaks_and_deletion_count(receipt, candidate):
    result = verify_text(VerifyTextRequest(message=candidate, receipt=receipt))
    assert result['signature_valid']
    assert not result['message_matches']
    assert result['verdict'] == 'MESSAGE_CHANGED'


def test_unicode_is_not_silently_normalized():
    receipt = seal_text(SealTextRequest(message='café', config=ChannelConfig(noise=0)))
    assert verify_text(VerifyTextRequest(message='cafe\u0301', receipt=receipt))['verdict'] == 'MESSAGE_CHANGED'


@pytest.mark.parametrize('field', ['message', 'cutoff', 'measurement', 'signature', 'issuer', 'version'])
def test_tampered_receipt_is_untrusted(receipt, field):
    changed = receipt.model_copy(deep=True)
    if field == 'message': changed.manifest.message_sha256 = '0' * 64
    if field == 'cutoff': changed.manifest.experiment.cutoff = 1
    if field == 'measurement': changed.manifest.experiment.measurements[0].accepted = False
    if field == 'signature': changed.signature = 'invalid-base64'
    if field == 'issuer': changed.manifest.key_id = 'other-server'
    if field == 'version': changed.manifest.version = 'qds-message-evidence/v1'
    result = verify_text(VerifyTextRequest(message=MESSAGE, receipt=changed))
    assert result['verdict'] == 'UNTRUSTED_RECEIPT'
    assert result['verifiers'] == []


def test_restarted_issuer_invalidates_old_receipts(receipt, monkeypatch):
    from app.services import text_lab_service
    from app.services.image_lab_service import ImageLabService
    monkeypatch.setattr(text_lab_service, 'image_lab_service', ImageLabService())
    assert verify_text(VerifyTextRequest(message=MESSAGE, receipt=receipt))['verdict'] == 'UNTRUSTED_RECEIPT'


@pytest.mark.parametrize('noise,interception', [(.18, 0), (.01, 1)])
def test_intact_text_is_distinct_from_failed_channel(noise, interception):
    receipt = seal_text(SealTextRequest(message=MESSAGE, config=ChannelConfig(noise=noise, interception=interception)))
    result = verify_text(VerifyTextRequest(message=MESSAGE, receipt=receipt))
    assert result['message_matches'] and result['signature_valid']
    assert result['verdict'] == 'CHANNEL_REJECTED'
    assert not any(v['channel_accepted'] for v in result['verifiers'])


def test_text_api_lifecycle_and_no_plaintext_in_receipt(client):
    sealed = client.post('/api/v1/text-lab/seal', json={'message': MESSAGE, 'config': {'noise': 0}})
    assert sealed.status_code == 200
    assert MESSAGE not in sealed.text
    receipt = sealed.json()
    assert receipt['manifest']['version'] == 'qds-text-lab/v1'
    for message, verdict in [(MESSAGE, 'VERIFIED'), ('', 'MESSAGE_CHANGED'), ('Edited', 'MESSAGE_CHANGED')]:
        response = client.post('/api/v1/text-lab/verify', json={'message': message, 'receipt': receipt})
        assert response.status_code == 200
        assert response.json()['verdict'] == verdict
    receipt['manifest']['experiment']['config']['noise'] = .3
    assert client.post('/api/v1/text-lab/verify', json={'message': MESSAGE, 'receipt': receipt}).json()['verdict'] == 'UNTRUSTED_RECEIPT'


@pytest.mark.parametrize('body', [{'message': ''}, {'message': 'x' * 4097},
    {'message': 'OK', 'config': {'shots': 9999999}}, {'message': 'OK', 'config': {'noise': -1}},
    {'message': 'OK', 'config': {'interception': 2}}, {'message': 'OK', 'extra': 'field'}])
def test_invalid_workload_rejected(client, body):
    assert client.post('/api/v1/text-lab/seal', json=body).status_code == 422
