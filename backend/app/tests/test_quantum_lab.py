"""Physics, reconciliation, demo encryption and protected hardware integration."""
import base64
from types import SimpleNamespace
import numpy as np
import pytest
from pydantic import SecretStr
from app.core.config import settings
from app.schemas.quantum_lab import KeyExchangeRequest, BellRequest, DemoEnvelope
from app.engine.quantum.key_exchange import run_key_exchange, reconcile, toeplitz_hash, check_envelope, measure_pulses
from app.engine.quantum.bell_lab import run_bell, analyze_counts


@pytest.fixture(scope='module')
def clean_exchange():
    return run_key_exchange(KeyExchangeRequest())


def test_clean_exchange_and_aes_gcm_authentication(clean_exchange):
    r = clean_exchange
    assert r['verdict'] == 'DEMO_KEY_READY'
    assert r['errors'] == 0
    assert r['sifted'] == r['tested']+r['retained']
    assert r['key']['alice_hex'] == r['key']['bob_hex']
    assert len(r['key']['alice_hex']) == 64
    assert r['illustrative_key_budget'] >= 256
    envelope = DemoEnvelope(key_hex=r['key']['alice_hex'], nonce=r['encryption']['nonce'], ciphertext=r['encryption']['ciphertext'])
    assert check_envelope(envelope)['authenticated']
    altered = bytearray(base64.b64decode(envelope.ciphertext)); altered[0] ^= 1
    assert check_envelope(envelope.model_copy(update={'ciphertext':base64.b64encode(altered).decode()})) == dict(authenticated=False, plaintext=None)
    wrong_key = envelope.model_copy(update={'key_hex':'00'*32})
    assert check_envelope(wrong_key)['authenticated'] is False


def test_seed_replays_keys_without_reusing_gcm_nonce(clean_exchange):
    again = run_key_exchange(KeyExchangeRequest())
    assert again['pulse_preview'] == clean_exchange['pulse_preview']
    assert again['key'] == clean_exchange['key']
    assert again['encryption']['nonce'] != clean_exchange['encryption']['nonce']


def test_interception_rejects_before_key_release():
    r = run_key_exchange(KeyExchangeRequest(interception=1))
    assert r['verdict'] == 'CHANNEL_REJECTED'
    assert r['key'] is None and r['encryption'] is None
    assert all(p['intercepted'] for p in r['pulse_preview'])


def test_explicit_eve_obeys_measurement_statistics():
    c=KeyExchangeRequest(interception=1)
    rng=np.random.default_rng(c.seed)
    bits=rng.integers(0,2,c.pulses,dtype=np.uint8)
    a=rng.integers(0,2,c.pulses,dtype=np.uint8)
    b=rng.integers(0,2,c.pulses,dtype=np.uint8)
    intercepted=rng.random(c.pulses)<1
    e=rng.integers(0,2,c.pulses,dtype=np.uint8)
    measured,eve,_,_=measure_pulses(c,bits,a,b,intercepted,e)
    correct=(a==b)&(e==a); wrong=(a==b)&(e!=a)
    assert np.array_equal(measured[correct],bits[correct])
    assert np.array_equal(eve[e==a],bits[e==a])
    assert abs(float(np.mean(measured[wrong]!=bits[wrong]))-.5)<.06


def test_short_exchange_does_not_invent_256_bits():
    r=run_key_exchange(KeyExchangeRequest(pulses=2048))
    assert r['verdict']=='INSUFFICIENT_KEY'
    assert r['key'] is None


def test_parity_reconciliation_corrects_errors_and_records_disclosure():
    alice=np.random.default_rng(17).integers(0,2,2048,dtype=np.uint8)
    bob=alice.copy(); bob[[3,54,600,1033]]^=1
    corrected,leak,flips,passes=reconcile(alice,bob,np.random.default_rng(42))
    assert np.array_equal(alice,corrected)
    assert leak>0 and flips==4 and len(passes)==4


def test_toeplitz_matches_explicit_binary_matrix():
    bits=np.array([1,0,1,1,0],dtype=np.uint8)
    seed=np.array([1,1,0,0,1,0,1],dtype=np.uint8)
    expected=np.array([[1,0,0,1,1],[0,1,0,0,1],[1,0,1,0,0]])@bits%2
    assert np.array_equal(toeplitz_hash(bits,seed,3),expected)


@pytest.mark.parametrize('interception,noise,state,expected',[(0,0,'bell',2*np.sqrt(2)),(1,0,'bell',np.sqrt(2)),(0,.3,'bell',2*np.sqrt(2)*.7),(0,0,'product',np.sqrt(2))])
def test_bell_statistics_and_controls(interception,noise,state,expected):
    r=run_bell(BellRequest(interception=interception,noise=noise,state=state))
    assert abs(r['s']-expected)<.12
    assert r['expected_s']==pytest.approx(expected)
    assert r['violation_supported'] is (interception==0 and noise==0 and state=='bell')
    assert all(sum(row['counts'].values())==4096 for row in r['settings'])


def test_classical_correlated_counts_do_not_fake_bell_violation():
    r=analyze_counts([{'00':512,'11':512}]*4)
    assert r['s']==2
    assert not r['violation_supported']


def test_bounded_api_and_envelope_errors(client):
    for route,payload in [('/key-exchange',{'pulses':10000000}),('/bell',{'shots':99999999}),('/bell',{'noise':2}),('/key-exchange',{'message':''})]:
        assert client.post('/api/v1/quantum-lab'+route,json=payload).status_code==422
    assert client.post('/api/v1/quantum-lab/message-check',json={'key_hex':'00'*32,'nonce':'?'*16,'ciphertext':'?'*24}).status_code==422
    r=client.post('/api/v1/quantum-lab/bell',json={'shots':1024})
    assert r.status_code==200 and r.json()['execution']=='simulator'


def test_hardware_is_disabled_without_credentials_and_requires_owner(client,monkeypatch):
    monkeypatch.setattr(settings,'IBM_QUANTUM_ENABLED',False)
    monkeypatch.setattr(settings,'QUANTUM_OPERATOR_TOKEN',SecretStr('owner-only'))
    assert client.get('/api/v1/quantum-lab/hardware').json()['available'] is False
    body={'shots':1024,'confirm_hardware_use':True}
    assert client.post('/api/v1/quantum-lab/hardware/jobs',json=body).status_code==401
    assert client.post('/api/v1/quantum-lab/hardware/jobs',json=body,headers={'X-Quantum-Operator':'wrong'}).status_code==401
    assert client.post('/api/v1/quantum-lab/hardware/jobs',json=body,headers={'X-Quantum-Operator':'owner-only'}).status_code==503
    assert client.post('/api/v1/quantum-lab/hardware/jobs',json={'shots':1024}).status_code==422


def test_hardware_submission_builds_four_isa_circuits_and_caps_runtime(monkeypatch):
    import qiskit_ibm_runtime
    from app.services import quantum_hardware_service as hw
    captured={}
    backend=SimpleNamespace(name='configured_qpu',configuration=lambda:SimpleNamespace(simulator=False),status=lambda:SimpleNamespace(operational=True))
    monkeypatch.setattr(settings,'IBM_QUANTUM_BACKEND','configured_qpu')
    monkeypatch.setattr(hw,'runtime_service',lambda:SimpleNamespace(backend=lambda name:backend))
    monkeypatch.setattr(hw,'generate_preset_pass_manager',lambda **kwargs:SimpleNamespace(run=lambda circuits:circuits))
    class Sampler:
        def __init__(self,mode):
            assert mode is backend
            self.options=qiskit_ibm_runtime.SamplerOptions()
        def run(self,circuits,shots):
            captured.update(circuits=circuits,shots=shots,options=self.options)
            return SimpleNamespace(job_id=lambda:'real-provider-job-id',status=lambda:'QUEUED')
    monkeypatch.setattr(qiskit_ibm_runtime,'SamplerV2',Sampler)
    r=hw.submit_bell(1024)
    assert r['execution']=='ibm_quantum_hardware' and r['status']=='QUEUED'
    assert len(captured['circuits'])==4 and captured['shots']==1024
    assert captured['options'].max_execution_time==60
    assert captured['options'].environment.job_tags==[hw.TAG]


def test_hardware_status_does_not_wait_for_queued_results_and_checks_tags(monkeypatch):
    from app.services import quantum_hardware_service as hw
    monkeypatch.setattr(settings,'IBM_QUANTUM_BACKEND','configured_qpu')
    backend=SimpleNamespace(name='configured_qpu')
    job=SimpleNamespace(tags=[hw.TAG],backend=lambda:backend,status=lambda:'QUEUED',job_id=lambda:'provider-job')
    monkeypatch.setattr(hw,'runtime_service',lambda:SimpleNamespace(job=lambda identifier:job))
    assert hw.get_bell_job('provider-job')['result'] is None
    job.tags=[]
    with pytest.raises(LookupError):hw.get_bell_job('provider-job')


def test_hardware_result_uses_provider_counts(monkeypatch):
    from app.services import quantum_hardware_service as hw
    monkeypatch.setattr(settings,'IBM_QUANTUM_BACKEND','configured_qpu')
    counts=[{'00':450,'11':450,'01':50,'10':50}]*3+[{'00':50,'11':50,'01':450,'10':450}]
    pubs=[SimpleNamespace(data=SimpleNamespace(meas=SimpleNamespace(get_counts=lambda c=c:c))) for c in counts]
    job=SimpleNamespace(tags=[hw.TAG],backend=lambda:SimpleNamespace(name='configured_qpu'),status=lambda:'DONE',job_id=lambda:'provider-job',result=lambda timeout:pubs)
    monkeypatch.setattr(hw,'runtime_service',lambda:SimpleNamespace(job=lambda identifier:job))
    r=hw.get_bell_job('provider-job')
    assert r['result']['s']==pytest.approx(3.2)
    assert r['execution']=='ibm_quantum_hardware'


def test_hardware_failure_never_returns_fake_results_or_secrets(client,monkeypatch):
    from app.api.v1.endpoints import quantum_lab
    monkeypatch.setattr(settings,'QUANTUM_OPERATOR_TOKEN',SecretStr('owner-only'))
    monkeypatch.setattr(quantum_lab,'hardware_status',lambda:{'available':True})
    def failed(shots):raise RuntimeError('private-provider-token')
    monkeypatch.setattr(quantum_lab,'submit_bell',failed)
    r=client.post('/api/v1/quantum-lab/hardware/jobs',json={'shots':1024,'confirm_hardware_use':True},headers={'X-Quantum-Operator':'owner-only'})
    assert r.status_code==502 and 'private-provider-token' not in r.text
