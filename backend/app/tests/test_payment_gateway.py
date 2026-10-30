"""Native PQ crypto, recipient enforcement, concurrency and ledger invariant tests."""
import base64
import io
from PIL import Image
from app.services import payment_evidence
from app.schemas.payments import CreatePaymentCase,InvoiceCandidate,ApprovalCandidate,CandidateEvidence
from concurrent.futures import ThreadPoolExecutor
import copy
import json
import time
import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.mldsa import MLDSA65PublicKey
from app.services import payment_gateway as gateway
from app.schemas.payments import DraftPayment, InjectAttack, PaymentEnvelope


@pytest.fixture
def sandbox():
    return gateway.create_session()


def args(s):
    return s['session_id'], s['session_token']


def draft(s, amount=100000):
    stream=io.BytesIO(); Image.new('RGB',(32,32),'white').save(stream,format='PNG')
    encoded=base64.b64encode(stream.getvalue()).decode()
    c=payment_evidence.create(*args(s),CreatePaymentCase(amount_paise=amount))
    c=payment_evidence.seal_invoice(*args(s),c['case_id'],InvoiceCandidate(image_base64=encoded))
    c=payment_evidence.seal_approval(*args(s),c['case_id'],ApprovalCandidate(message=c['expected_approval']))
    candidate=CandidateEvidence(image_base64=encoded,approval_text=c['expected_approval'])
    result=gateway.prepare(*args(s),DraftPayment(amount_paise=amount,case_id=c['case_id'],candidate=candidate))
    result['_candidate']=candidate
    return result


def evidence(d):
    return d['_candidate']


def envelope(d):
    return PaymentEnvelope.model_validate(d['envelope'])


def test_real_crypto_settlement_and_independent_public_receipt_verification(sandbox):
    d = draft(sandbox)
    assert len(base64.b64decode(d['envelope']['kem_ciphertext'])) == 1088
    assert d['metrics']['signature_bytes'] == 3309
    assert b'rahul@demo' not in base64.b64decode(d['envelope']['ciphertext'])
    result = gateway.receive(*args(sandbox), envelope(d), evidence(d))
    assert result['accepted'] and result['verdict'] == 'SETTLED'
    assert result['balances'] == {'alice@demo':900000, 'rahul@demo':300000, 'mallory@demo':0}
    receipt = result['receipt']
    pub = MLDSA65PublicKey.from_public_bytes(base64.b64decode(sandbox['public_keys']['bank_b_receipts']))
    pub.verify(base64.b64decode(receipt['signature']), gateway.canonical(receipt['receipt']), context=gateway.RECEIPT_CONTEXT)
    altered = copy.deepcopy(receipt['receipt']); altered['amount_paise'] += 1
    with pytest.raises(InvalidSignature):
        pub.verify(base64.b64decode(receipt['signature']), gateway.canonical(altered), context=gateway.RECEIPT_CONTEXT)
    assert len(gateway.snapshot(*args(sandbox))['ledger']) == 1


@pytest.mark.parametrize('kind,expected', [('amount','SIGNATURE_REJECTED'),('beneficiary','SIGNATURE_REJECTED'),('expired','EXPIRED_OR_INVALID_TIME'),('ciphertext','ENVELOPE_REJECTED')])
def test_each_controlled_attack_preserves_every_balance(sandbox,kind,expected):
    d = draft(sandbox)
    attack = gateway.inject(*args(sandbox), InjectAttack(envelope=envelope(d),kind=kind))
    r = gateway.receive(*args(sandbox), PaymentEnvelope(**attack['envelope']), evidence(d))
    assert r['verdict'] == expected and not r['accepted']
    assert r['balances'] == gateway.INITIAL
    assert gateway.snapshot(*args(sandbox))['ledger'] == []
    assert gateway.receive(*args(sandbox), envelope(d), evidence(d))['accepted']


def test_concurrent_duplicate_cannot_debit_twice(sandbox):
    d = draft(sandbox)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: gateway.receive(*args(sandbox), envelope(d), evidence(d)), range(4)))
    assert sum(r['accepted'] for r in results) == 1
    assert sum(r['verdict'] == 'REPLAY_REJECTED' for r in results) == 3
    state = gateway.snapshot(*args(sandbox))
    assert state['balances']['alice@demo'] == 900000
    assert sum(state['balances'].values()) == sum(gateway.INITIAL.values())
    assert len(state['ledger']) == 1


def test_concurrent_different_payments_cannot_overdraw(sandbox):
    drafts = [draft(sandbox,700000), draft(sandbox,700000)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda d: gateway.receive(*args(sandbox),envelope(d), evidence(d)), drafts))
    assert sum(r['accepted'] for r in results) == 1
    assert any(r['verdict'] == 'INSUFFICIENT_FUNDS' for r in results)
    state = gateway.snapshot(*args(sandbox))
    assert state['balances']['alice@demo'] == 300000
    assert sum(state['balances'].values()) == 1200000


def test_cross_session_key_substitution_and_packet_binding(sandbox):
    other = gateway.create_session()
    d = draft(sandbox)
    packet = envelope(d)
    packet.session_id = other['session_id']
    assert gateway.receive(*args(other),packet,evidence(d))['verdict'] == 'ENVELOPE_REJECTED'
    packet = envelope(d); packet.receiver_key_id = '0'*24
    assert gateway.receive(*args(sandbox),packet,evidence(d))['verdict'] == 'ENVELOPE_REJECTED'


def test_nonce_reuse_is_rejected_even_under_a_fresh_signed_transaction_id(sandbox):
    d = draft(sandbox)
    assert gateway.receive(*args(sandbox),envelope(d), evidence(d))['accepted']
    with gateway.connection() as con:
        row = gateway.session(con,*args(sandbox),charge=False)
    payload,_,_ = gateway.unwrap(envelope(d),row)
    second=draft(sandbox)
    payload2,_,_=gateway.unwrap(envelope(second),row)
    payload2['nonce']=payload['nonce']
    payload=payload2
    a,_,_ = gateway.keys(row)
    signature = a.sign(gateway.canonical(payload),context=gateway.PAYMENT_CONTEXT)
    packet,_ = gateway.wrap(payload,gateway.b64(signature),row)
    assert gateway.receive(*args(sandbox),PaymentEnvelope(**packet),evidence(second))['verdict'] == 'REPLAY_REJECTED'


def test_expiry_future_time_and_real_authentic_signature(sandbox,monkeypatch):
    d=draft(sandbox)
    issued=d['instruction']['issued_at']
    monkeypatch.setattr(gateway.time,'time',lambda:issued+121)
    assert gateway.receive(*args(sandbox),envelope(d), evidence(d))['verdict']=='EXPIRED_OR_INVALID_TIME'
    monkeypatch.setattr(gateway.time,'time',lambda:issued-10)
    assert gateway.receive(*args(sandbox),envelope(d), evidence(d))['verdict']=='EXPIRED_OR_INVALID_TIME'


def test_session_credential_boundaries_and_api_limits(client,sandbox):
    path=f'/api/v1/payments/sessions/{sandbox["session_id"]}'
    assert client.get(path).status_code==401
    assert client.get(path,headers={'X-Sandbox-Token':'wrong'}).status_code==401
    headers={'X-Sandbox-Token':sandbox['session_token']}
    for amount in [0,-1,1000001,True,1.1,'100']:
        assert client.post(path+'/cases',headers=headers,json={'amount_paise':amount}).status_code==422
    assert client.post(path+'/cases',headers=headers,json={'amount_paise':100,'payee':'attacker@real'}).status_code==422
    assert client.get(path,headers=headers).headers['cache-control']=='no-store'
    with gateway.connection() as con:
        con.execute('DELETE FROM payment_sessions WHERE id=?',(sandbox['session_id'],))
    assert client.get(path,headers=headers).status_code==401


def test_api_lifecycle_receipt_and_nonsecret_export_contract(client):
    created=client.post('/api/v1/payments/sessions',json={})
    assert created.status_code==201 and created.headers['cache-control']=='no-store'
    s=created.json(); path=f'/api/v1/payments/sessions/{s["session_id"]}'
    h={'X-Sandbox-Token':s['session_token']}
    linked=draft(s,12345)
    d=client.post(path+'/draft',headers=h,json={'amount_paise':12345,'case_id':linked['instruction']['transaction_id'],'candidate':evidence(linked).model_dump()}).json()
    candidate=evidence(linked).model_dump()
    result=client.post(path+'/receive',headers=h,json={'envelope':d['envelope'],'candidate':candidate}).json()
    assert result['verdict']=='SETTLED'
    assert client.post(path+'/verify-receipt',headers=h,json=result['receipt']).json()['valid']
    result['receipt']['receipt']['payee']='mallory@demo'
    assert not client.post(path+'/verify-receipt',headers=h,json=result['receipt']).json()['valid']
    replay=client.post(path+'/receive',headers=h,json={'envelope':d['envelope'],'candidate':candidate}).json()
    assert replay['verdict']=='REPLAY_REJECTED'
    text=json.dumps([d,result,replay,client.get(path,headers=h).json()])
    assert s['session_token'] not in text
    assert not any(name in text for name in ['a_seed','b_seed','kem_seed'])


def test_benchmark_is_measured_native_crypto_not_a_quantum_speedup(sandbox):
    b=gateway.benchmark(*args(sandbox))
    assert b['samples']==9
    assert b['classical']['signature_bytes']==64
    assert b['post_quantum']['signature_bytes']==3309
    assert b['post_quantum']['signing_public_key_bytes']==1952
    assert b['post_quantum']['key_exchange_wire_bytes']==1088
    for mode in ['classical','post_quantum']:
        for name in ['sign','verify','key_establishment']:
            assert 0<b[mode][name]['median_ms']<=b[mode][name]['p95_ms']


def test_receipt_wrong_context_cannot_be_accepted_as_payment_signature(sandbox):
    d=draft(sandbox)
    with gateway.connection() as con:
        row=gateway.session(con,*args(sandbox),charge=False)
    a,_,_=gateway.keys(row)
    sig=a.sign(gateway.canonical(d['instruction']),context=gateway.RECEIPT_CONTEXT)
    packet,_=gateway.wrap(d['instruction'],gateway.b64(sig),row)
    assert gateway.receive(*args(sandbox),PaymentEnvelope(**packet),evidence(d))['verdict']=='SIGNATURE_REJECTED'
