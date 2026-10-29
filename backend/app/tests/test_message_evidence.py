"""Actual message binding replaces the former browser-only signing flags."""
import pytest
from app.engine.attack_engine import state_store
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.canonical_models import GenerateMaterialRequest
from app.schemas.message_evidence import MessageReceipt
from app.services.message_evidence_service import sign_message, verify_message


@pytest.fixture
def run():
    state=PracticalQDSEngine.generate_simulation(GenerateMaterialRequest(measurement_backend='qiskit_aer',pulse_count=8192,seed=42,distance_km=0,detector_efficiency=1,baseline_qber=0,authentication_threshold=.1,verification_threshold=.15))
    state_store.save(state)
    return state


def test_message_sign_verify_and_single_character_edit(run):
    receipt=sign_message(run.simulation_id,'Image evidence: original ✓')
    assert verify_message('Image evidence: original ✓',receipt)['verdict']=='VERIFIED'
    result=verify_message('Image evidence: Original ✓',receipt)
    assert result['verdict']=='MESSAGE_CHANGED'
    assert result['signature_valid'] is True
    assert all(v['status']=='REJECT' for v in result['verifiers'])


@pytest.mark.parametrize('field',['message_sha256','transcript_sha256','configuration_sha256','simulation_id'])
def test_receipt_manifest_tampering(run,field):
    receipt=sign_message(run.simulation_id,'message')
    setattr(receipt.manifest,field,'a'*64 if field!='simulation_id' else 'another-run')
    result=verify_message('message',receipt)
    assert result['verdict']=='UNTRUSTED_RECEIPT'
    assert result['verifiers']==[]


def test_saved_state_changes_break_evidence_binding(run):
    receipt=sign_message(run.simulation_id,'message')
    run.configuration.authentication_threshold=.09
    state_store.save(run)
    result=verify_message('message',receipt)
    assert result['verdict']=='EVIDENCE_CHANGED'
    assert result['signature_valid'] is True


def test_valid_message_does_not_override_missing_channel_data():
    state=PracticalQDSEngine.generate_simulation(GenerateMaterialRequest(measurement_backend='qiskit_aer',pulse_count=1024,distance_km=500,fiber_attenuation=2,dark_count_rate=0,seed=42))
    state_store.save(state)
    receipt=sign_message(state.simulation_id,'message')
    assert verify_message('message',receipt)['verdict']=='INCONCLUSIVE'


def test_api_signs_current_message_not_old_generation_digest(client,run):
    response=client.post(f'/api/v1/runs/{run.simulation_id}/sign-message',json={'message':'A new message'})
    assert response.status_code==200
    receipt=response.json()
    assert receipt['manifest']['message_sha256']!=run.signing.sha256_hash
    good=client.post('/api/v1/verify-message',json={'message':'A new message','receipt':receipt})
    assert good.status_code==200 and good.json()['verdict']=='VERIFIED'
    bad=client.post('/api/v1/verify-message',json={'message':'A NEW message','receipt':receipt})
    assert bad.json()['verdict']=='MESSAGE_CHANGED'
    assert client.post('/api/v1/runs/missing/sign-message',json={'message':'test'}).status_code==404
    assert client.post(f'/api/v1/runs/{run.simulation_id}/sign-message',json={'message':''}).status_code==422
