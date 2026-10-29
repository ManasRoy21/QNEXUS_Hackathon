"""Scientific and integrity tests for the image lab; uses real Aer execution."""
import base64
import io
import pytest
from PIL import Image
from app.engine.quantum.image_channel import run_channel
from app.schemas.image_lab import ChannelConfig, SealImageRequest, VerifyImageRequest
from app.services.image_lab_service import ImageLabService, fingerprint_image


def encode(image, compress_level=6):
    stream = io.BytesIO()
    image.save(stream, format='PNG', compress_level=compress_level)
    return base64.b64encode(stream.getvalue()).decode()


@pytest.fixture
def image():
    return Image.new('RGBA', (64, 64), (50, 120, 190, 255))


@pytest.fixture
def service():
    return ImageLabService()


@pytest.fixture
def receipt(service, image):
    return service.seal(SealImageRequest(image_base64=encode(image), config=ChannelConfig(noise=0)))


@pytest.mark.parametrize('noise,interception,expected', [(0, 0, 0), (.01, 0, .01), (0, 1, .25), (.18, 0, .18), (.01, 1, .255), (.01, .5, .1325)])
def test_aer_agrees_with_channel_prediction(noise, interception, expected):
    experiment = run_channel(ChannelConfig(shots=16384, noise=noise, interception=interception))
    for result in experiment.measurements:
        assert result.sifted == 8192
        assert sum(result.matched_counts.values()) == 8192
        assert result.expected_qber == pytest.approx(expected)
        assert abs(result.qber - expected) < .025
        assert result.interval_95[0] <= result.qber <= result.interval_95[1]
        if expected == 0:
            assert result.errors == 0
        if expected >= .18:
            assert result.accepted is False


def test_seed_repeats_measurements():
    config = ChannelConfig(interception=1, seed=17)
    assert run_channel(config) == run_channel(config)
    different = run_channel(config.model_copy(update={'seed': 18}))
    assert different.measurements != run_channel(config).measurements


def test_original_is_verified(service, receipt, image):
    result = service.verify(VerifyImageRequest(image_base64=encode(image), receipt=receipt))
    assert result['verdict'] == 'VERIFIED'
    assert all(v['accepted'] for v in result['verifiers'])
    assert result['changed_tiles'] == []


def test_single_pixel_change_is_localized(service, receipt, image):
    image.putpixel((17, 25), (51, 120, 190, 255))
    result = service.verify(VerifyImageRequest(image_base64=encode(image), receipt=receipt))
    assert result['verdict'] == 'IMAGE_CHANGED'
    assert result['signature_valid']
    assert result['changed_tiles'] == [3 * 8 + 2]
    assert not any(v['accepted'] for v in result['verifiers'])


def test_recompression_is_not_a_pixel_change(service, receipt, image):
    result = service.verify(VerifyImageRequest(image_base64=encode(image, 0), receipt=receipt))
    assert result['verdict'] == 'VERIFIED'
    assert result['file_match'] is False


@pytest.mark.parametrize('mutation', ['hash', 'threshold', 'signature', 'key_id'])
def test_manifest_or_signature_edits_are_rejected(service, receipt, image, mutation):
    changed = receipt.model_copy(deep=True)
    if mutation == 'hash': changed.manifest.image.pixel_sha256 = 'a' * 64
    if mutation == 'threshold': changed.manifest.experiment.cutoff = 1
    if mutation == 'signature': changed.signature = base64.b64encode(b'x' * 64).decode()
    if mutation == 'key_id': changed.manifest.key_id = 'someone-else'
    result = service.verify(VerifyImageRequest(image_base64=encode(image), receipt=changed))
    assert result['verdict'] == 'UNTRUSTED_RECEIPT'
    assert result['verifiers'] == []


def test_another_server_key_cannot_impersonate_issuer(receipt, image):
    result = ImageLabService().verify(VerifyImageRequest(image_base64=encode(image), receipt=receipt))
    assert result['verdict'] == 'UNTRUSTED_RECEIPT'


def test_dimensions_change_marks_all_tiles(service, receipt):
    result = service.verify(VerifyImageRequest(image_base64=encode(Image.new('RGB', (32, 64))), receipt=receipt))
    assert result['dimensions_match'] is False
    assert result['changed_tile_count'] == 64


def test_intact_image_can_fail_channel_policy(service, image):
    request = SealImageRequest(image_base64=encode(image), config=ChannelConfig(noise=0, interception=1))
    receipt = service.seal(request)
    result = service.verify(VerifyImageRequest(image_base64=encode(image), receipt=receipt))
    assert result['pixels_match'] is True
    assert result['verdict'] == 'CHANNEL_REJECTED'


@pytest.mark.parametrize('encoded', ['not-base64', base64.b64encode(b'not an image').decode(), ''])
def test_invalid_images_rejected(encoded):
    with pytest.raises(ValueError): fingerprint_image(encoded)


def test_oversized_image_rejected():
    with pytest.raises(ValueError, match='megapixels'):
        fingerprint_image(encode(Image.new('RGB', (2048, 2048))))


def test_animated_image_rejected():
    stream = io.BytesIO()
    Image.new('RGB', (16, 16), 'red').save(stream, format='PNG', save_all=True, append_images=[Image.new('RGB', (16, 16), 'blue')])
    with pytest.raises(ValueError, match='Animated'):
        fingerprint_image(base64.b64encode(stream.getvalue()).decode())


def test_api_lifecycle(client, image):
    assert client.get('/api/v1/image-lab/capabilities').status_code == 200
    seal = client.post('/api/v1/image-lab/seal', json={'image_base64': encode(image), 'config': {'noise': 0}})
    assert seal.status_code == 200
    verify = client.post('/api/v1/image-lab/verify', json={'image_base64': encode(image), 'receipt': seal.json()})
    assert verify.status_code == 200
    assert verify.json()['verdict'] == 'VERIFIED'
    assert client.post('/api/v1/image-lab/seal', json={'image_base64': 'bad'}).status_code == 400


@pytest.mark.parametrize('config', [{'shots': 999999999}, {'noise': -1}, {'interception': 1.1}, {'seed': -1}, {'noise': float('inf')}, {'unknown': 1}])
def test_bounded_workload_and_parameters(config):
    with pytest.raises(ValueError): ChannelConfig(**config)


def test_offline_verifier_requires_trusted_issuer(service, receipt, image):
    from cryptography.exceptions import InvalidSignature
    from verify_image_receipt import verify_export
    report = {'receipt': receipt.model_dump(mode='json'), 'public_key': 'untrusted field'}
    raw = base64.b64decode(encode(image))
    assert verify_export(report, raw, service.public_key)['accepted'] is True
    with pytest.raises(InvalidSignature):
        verify_export(report, raw, ImageLabService().public_key)
    image.putpixel((0, 0), (0, 0, 0, 255))
    assert verify_export(report, base64.b64decode(encode(image)), service.public_key)['accepted'] is False


def test_configured_signing_key_is_stable(monkeypatch, image):
    from app.core.config import settings
    monkeypatch.setattr(settings, 'IMAGE_LAB_SIGNING_KEY', '01' * 32)
    first, second = ImageLabService(), ImageLabService()
    assert first.key_id == second.key_id
    receipt = first.seal(SealImageRequest(image_base64=encode(image)))
    assert second.verify(VerifyImageRequest(image_base64=encode(image), receipt=receipt))['verdict'] == 'VERIFIED'
