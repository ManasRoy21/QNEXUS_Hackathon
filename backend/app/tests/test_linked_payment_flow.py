"""Evidence cannot be omitted, swapped, silently resealed, or raced at settlement."""
import base64
import copy
import io
import pytest
from PIL import Image
from fastapi import HTTPException
from app.schemas.payments import CreatePaymentCase,InvoiceCandidate,ApprovalCandidate,DraftPayment,CandidateEvidence,PaymentEnvelope
from app.services import payment_evidence as chain, payment_gateway as gateway
from app.tests.test_payment_gateway import draft,evidence,envelope,args


@pytest.fixture
def linked():
    s=gateway.create_session(); d=draft(s)
    return s,d


def assert_no_settlement(s):
    state=gateway.snapshot(*args(s))
    assert state['balances']==gateway.INITIAL
    assert state['ledger']==[]


def test_invoice_text_payment_and_receipt_share_exact_transaction_and_hashes(linked):
    s,d=linked
    c=d['evidence']; p=d['instruction']; binding=p['evidence']
    assert c['case_id']==c['transaction_id']==p['transaction_id']
    assert c['case_id'] in c['expected_approval']
    assert binding['invoice_pixel_sha256'] in c['expected_approval']
    assert binding['invoice_pixel_sha256']==c['invoice_receipt']['manifest']['image']['pixel_sha256']
    assert binding['approval_sha256']==c['approval_receipt']['manifest']['message_sha256']
    assert binding['invoice_receipt_sha256']==chain.digest(c['invoice_receipt'])
    assert binding['approval_receipt_sha256']==chain.digest(c['approval_receipt'])
    r=gateway.receive(*args(s),envelope(d),evidence(d))
    assert r['accepted'] and r['evidence_check']['valid']
    assert r['receipt']['receipt']['evidence']==binding
    assert r['receipt']['receipt']['transaction_id']==c['case_id']


@pytest.mark.parametrize('kind',['pixel','file','text','empty','malformed'])
def test_changed_actual_candidates_cannot_settle(linked,kind):
    s,d=linked; candidate=evidence(d).model_copy()
    if kind in ['pixel','file']:
        image=Image.open(io.BytesIO(base64.b64decode(candidate.image_base64))).convert('RGB')
        if kind=='pixel': image.putpixel((3,3),(1,2,3))
        stream=io.BytesIO(); image.save(stream,format='PNG',compress_level=0)
        candidate.image_base64=base64.b64encode(stream.getvalue()).decode()
    elif kind=='text': candidate.approval_text+=' '
    elif kind=='empty': candidate.approval_text=''
    else: candidate.image_base64='not base64'
    r=gateway.receive(*args(s),envelope(d),candidate)
    assert r['verdict']==('APPROVAL_REJECTED' if kind in ['text','empty'] else 'INVOICE_REJECTED')
    assert not r['accepted']; assert_no_settlement(s)


def test_missing_evidence_and_old_unbound_api_are_rejected(client,linked):
    s,d=linked; path=f'/api/v1/payments/sessions/{s["session_id"]}'
    h={'X-Sandbox-Token':s['session_token']}
    assert client.post(path+'/receive',headers=h,json={'envelope':d['envelope']}).status_code==422
    assert client.post(path+'/draft',headers=h,json={'amount_paise':100000}).status_code==422
    assert gateway.receive(*args(s),envelope(d))['verdict']=='EVIDENCE_REQUIRED'
    assert_no_settlement(s)


def test_payment_signature_binds_evidence_hashes(linked):
    s,d=linked
    with gateway.connection() as con: row=gateway.session(con,*args(s),charge=False)
    payload,signature,_=gateway.unwrap(envelope(d),row)
    payload['evidence']['approval_sha256']='a'*64
    packet,_=gateway.wrap(payload,gateway.b64(signature),row)
    assert gateway.receive(*args(s),PaymentEnvelope(**packet),evidence(d))['verdict']=='SIGNATURE_REJECTED'
    assert_no_settlement(s)


def test_cross_case_approval_is_not_interchangeable(linked):
    s,d=linked; other=draft(s)
    swapped=evidence(d).model_copy(update={'approval_text':evidence(other).approval_text})
    assert gateway.receive(*args(s),envelope(d),swapped)['verdict']=='APPROVAL_REJECTED'
    assert_no_settlement(s)


def test_wrong_approval_details_are_not_silently_signed(linked):
    s,d=linked; identifier=d['instruction']['transaction_id']
    with pytest.raises(HTTPException) as exc:
        chain.seal_approval(*args(s),identifier,ApprovalCandidate(message=evidence(d).approval_text.replace('1000.00','9999.00')))
    assert exc.value.status_code==422
    with pytest.raises(HTTPException) as exc:
        gateway.prepare(*args(s),DraftPayment(amount_paise=999900,case_id=identifier,candidate=evidence(d)))
    assert exc.value.status_code==422


def test_reseal_clears_approval_and_stales_previous_payment(linked):
    s,d=linked; identifier=d['instruction']['transaction_id']
    c=chain.seal_invoice(*args(s),identifier,InvoiceCandidate(image_base64=evidence(d).image_base64))
    assert c['approval_receipt'] is None and c['evidence_binding'] is None
    with pytest.raises(HTTPException):
        gateway.prepare(*args(s),DraftPayment(amount_paise=100000,case_id=identifier,candidate=evidence(d)))
    c=chain.seal_approval(*args(s),identifier,ApprovalCandidate(message=c['expected_approval']))
    assert c['revision']>d['instruction']['evidence']['revision']
    assert gateway.receive(*args(s),envelope(d),evidence(d))['verdict']=='EVIDENCE_STALE'
    assert_no_settlement(s)


def test_evidence_revision_race_cannot_settle(linked,monkeypatch):
    s,d=linked; original=chain.check
    def race(row,candidate,expected_binding=None):
        checked=original(row,candidate,expected_binding)
        with gateway.connection() as con:
            con.execute('UPDATE payment_cases SET revision=revision+1 WHERE id=?',(row['id'],))
        return checked
    monkeypatch.setattr(chain,'check',race)
    assert gateway.receive(*args(s),envelope(d),evidence(d))['verdict']=='EVIDENCE_STALE'
    assert_no_settlement(s)


def test_expiry_during_document_verification_is_rechecked_under_lock(linked,monkeypatch):
    s,d=linked; original=chain.check
    def expire(row,candidate,expected_binding=None):
        checked=original(row,candidate,expected_binding)
        monkeypatch.setattr(gateway.time,'time',lambda:d['instruction']['expires_at']+1)
        return checked
    monkeypatch.setattr(chain,'check',expire)
    assert gateway.receive(*args(s),envelope(d),evidence(d))['verdict']=='EXPIRED_OR_INVALID_TIME'
    assert_no_settlement(s)


def test_tampered_pinned_classical_receipt_is_rejected(linked):
    s,d=linked; identifier=d['instruction']['transaction_id']
    with gateway.connection() as con:
        import json
        row=chain.case(con,s['session_id'],identifier)
        receipt=json.loads(row['invoice_receipt']); receipt['signature']='invalid'
        con.execute('UPDATE payment_cases SET invoice_receipt=? WHERE id=?',(json.dumps(receipt),identifier))
    assert not gateway.receive(*args(s),envelope(d),evidence(d))['accepted']
    assert_no_settlement(s)


def test_settled_case_is_frozen(linked):
    s,d=linked; identifier=d['instruction']['transaction_id']
    assert gateway.receive(*args(s),envelope(d),evidence(d))['accepted']
    with pytest.raises(HTTPException) as exc:
        chain.seal_invoice(*args(s),identifier,InvoiceCandidate(image_base64=evidence(d).image_base64))
    assert exc.value.status_code==409
    with pytest.raises(HTTPException) as exc:
        chain.seal_approval(*args(s),identifier,ApprovalCandidate(message=evidence(d).approval_text))
    assert exc.value.status_code==409


def test_api_entire_flow_uses_existing_labs_and_verifies_at_receiver(client):
    s=client.post('/api/v1/payments/sessions',json={}).json()
    h={'X-Sandbox-Token':s['session_token']}; path=f'/api/v1/payments/sessions/{s["session_id"]}'
    c=client.post(path+'/cases',headers=h,json={'amount_paise':100000,'invoice_reference':'INV-204'}).json()
    image=Image.new('RGB',(32,32),'white'); stream=io.BytesIO(); image.save(stream,format='PNG')
    encoded=base64.b64encode(stream.getvalue()).decode(); cp=path+'/cases/'+c['case_id']
    assert client.post(cp+'/approval',headers=h,json={'message':'Approve'}).status_code==409
    c=client.post(cp+'/invoice',headers=h,json={'image_base64':encoded}).json()
    assert c['invoice_receipt']['algorithm']=='Ed25519'
    c=client.post(cp+'/approval',headers=h,json={'message':c['expected_approval']}).json()
    assert c['approval_receipt']['algorithm']=='Ed25519'
    candidate={'image_base64':encoded,'approval_text':c['expected_approval']}
    prepared=client.post(path+'/draft',headers=h,json={'amount_paise':100000,'case_id':c['case_id'],'candidate':candidate}).json()
    changed={**candidate,'approval_text':candidate['approval_text']+'!'}
    assert client.post(path+'/receive',headers=h,json={'envelope':prepared['envelope'],'candidate':changed}).json()['verdict']=='APPROVAL_REJECTED'
    valid=client.post(path+'/receive',headers=h,json={'envelope':prepared['envelope'],'candidate':candidate}).json()
    assert valid['accepted'] and valid['receipt']['receipt']['transaction_id']==c['case_id']
    assert client.post(path+'/verify-receipt',headers=h,json=valid['receipt']).json()['valid']
    assert client.post(path+'/receive',headers=h,json={'envelope':prepared['envelope'],'candidate':candidate}).json()['verdict']=='REPLAY_REJECTED'
