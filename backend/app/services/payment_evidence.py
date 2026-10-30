"""One transaction links the existing image/text receipt services to settlement."""
import hashlib
import json
from uuid import uuid4
from fastapi import HTTPException
from app.schemas.image_lab import ChannelConfig, SealImageRequest, VerifyImageRequest, SignedReceipt
from app.schemas.text_lab import SealTextRequest, VerifyTextRequest, TextReceipt
from app.services.image_lab_service import image_lab_service
from app.services.text_lab_service import seal_text, verify_text
from app.schemas.payments import EvidenceBinding


def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',', ':'),ensure_ascii=True,allow_nan=False).encode()).hexdigest()


def case(con, sid, case_id):
    row = con.execute('SELECT * FROM payment_cases WHERE session_id=? AND id=?',(sid,case_id)).fetchone()
    if not row:
        raise HTTPException(404,'Payment case is missing on this instance. Start a new case.')
    return row


def require_open(con, sid, case_id):
    if con.execute('SELECT 1 FROM payment_ledger WHERE session_id=? AND transaction_id=?',(sid,case_id)).fetchone():
        raise HTTPException(409,'This case has settled. Start a new case to seal different evidence.')


def approval_message(row):
    if not row['invoice_receipt']:
        return None
    receipt=json.loads(row['invoice_receipt'])
    return (f"Approve INR {row['amount_paise']//100}.{row['amount_paise']%100:02d} to {row['payee']} "
            f"for invoice {row['invoice_reference']}.\nTransaction: {row['id']}\n"
            f"Invoice pixels SHA-256: {receipt['manifest']['image']['pixel_sha256']}")


def binding(row):
    if not row['invoice_receipt'] or not row['approval_receipt']:
        raise HTTPException(409,'Seal the invoice and its exact approval text before preparing a payment.')
    image=json.loads(row['invoice_receipt']); text=json.loads(row['approval_receipt'])
    return EvidenceBinding(invoice_reference=row['invoice_reference'],revision=row['revision'],
        invoice_pixel_sha256=image['manifest']['image']['pixel_sha256'],
        invoice_file_sha256=image['manifest']['image']['file_sha256'],
        approval_sha256=text['manifest']['message_sha256'],
        invoice_receipt_sha256=digest(image),approval_receipt_sha256=digest(text)).model_dump()


def public_case(row):
    ready=bool(row['invoice_receipt'] and row['approval_receipt'])
    return dict(case_id=row['id'],transaction_id=row['id'],amount_paise=row['amount_paise'],payee=row['payee'],
        invoice_reference=row['invoice_reference'],revision=row['revision'],
        invoice_receipt=json.loads(row['invoice_receipt']) if row['invoice_receipt'] else None,
        approval_receipt=json.loads(row['approval_receipt']) if row['approval_receipt'] else None,
        expected_approval=approval_message(row),evidence_binding=binding(row) if ready else None,
        document_signer=dict(algorithm='Ed25519',key_id=image_lab_service.key_id,public_key=image_lab_service.public_key),
        phase='APPROVAL_SEALED' if ready else 'INVOICE_SEALED' if row['invoice_receipt'] else 'AWAITING_INVOICE')


def create(sid,token,request):
    from app.services.payment_gateway import connection,session
    with connection() as con:
        con.execute('BEGIN IMMEDIATE'); session(con,sid,token)
        identifier=uuid4().hex
        con.execute('INSERT INTO payment_cases(id,session_id,amount_paise,payee,invoice_reference) VALUES(?,?,?,?,?)',
            (identifier,sid,request.amount_paise,request.payee,request.invoice_reference))
        return public_case(case(con,sid,identifier))


def seal_invoice(sid,token,identifier,request):
    from app.services.payment_gateway import connection,session
    with connection() as con:
        session(con,sid,token); require_open(con,sid,identifier)
        previous=case(con,sid,identifier)['revision']
    try:
        receipt=image_lab_service.seal(SealImageRequest(image_base64=request.image_base64,
            config=ChannelConfig(shots=1024,seed=42,noise=0,interception=0)))
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from None
    with connection() as con:
        con.execute('BEGIN IMMEDIATE'); session(con,sid,token,charge=False); require_open(con,sid,identifier)
        if case(con,sid,identifier)['revision'] != previous:
            raise HTTPException(409,'The case changed during sealing. Reopen it and try again.')
        con.execute('UPDATE payment_cases SET invoice_receipt=?,approval_receipt=NULL,revision=revision+1 WHERE session_id=? AND id=?',
            (receipt.model_dump_json(),sid,identifier))
        return public_case(case(con,sid,identifier))


def seal_approval(sid,token,identifier,request):
    from app.services.payment_gateway import connection,session
    with connection() as con:
        session(con,sid,token); require_open(con,sid,identifier)
        row=case(con,sid,identifier); revision=row['revision']; expected=approval_message(row)
    if expected is None:
        raise HTTPException(409,'Seal the invoice first.')
    if request.message != expected:
        raise HTTPException(422,'Approval must match this case’s amount, beneficiary, transaction ID and invoice fingerprint exactly. Restore the generated approval.')
    receipt=seal_text(SealTextRequest(message=request.message,config=ChannelConfig(shots=1024,seed=42,noise=0,interception=0)))
    with connection() as con:
        con.execute('BEGIN IMMEDIATE'); session(con,sid,token,charge=False); require_open(con,sid,identifier)
        if case(con,sid,identifier)['revision'] != revision:
            raise HTTPException(409,'The invoice changed during approval. Approve its new fingerprint.')
        con.execute('UPDATE payment_cases SET approval_receipt=?,revision=revision+1 WHERE session_id=? AND id=?',
            (receipt.model_dump_json(),sid,identifier))
        return public_case(case(con,sid,identifier))


def check(row,candidate,expected_binding=None):
    try:
        pinned=binding(row)
    except HTTPException:
        return dict(valid=False,verdict='EVIDENCE_REQUIRED',explanation='The linked invoice and approval have not both been sealed.')
    if expected_binding is not None and expected_binding != pinned:
        return dict(valid=False,verdict='EVIDENCE_STALE',explanation='The signed payment is bound to a different evidence revision. Prepare a fresh instruction.')
    if candidate is None:
        return dict(valid=False,verdict='EVIDENCE_REQUIRED',explanation='The receiving bank requires the actual invoice and approval text.')
    try:
        image=image_lab_service.verify(VerifyImageRequest(image_base64=candidate.image_base64,
            receipt=SignedReceipt.model_validate_json(row['invoice_receipt'])))
    except ValueError:
        return dict(valid=False,verdict='INVOICE_REJECTED',explanation='The submitted invoice cannot be safely decoded.')
    if image['verdict'] != 'VERIFIED' or not image['file_match']:
        return dict(valid=False,verdict='INVOICE_REJECTED',explanation='The invoice file, pixels or signed receipt differ from this case’s sealed original.',invoice=image)
    text=verify_text(VerifyTextRequest(message=candidate.approval_text,receipt=TextReceipt.model_validate_json(row['approval_receipt'])))
    if text['verdict'] != 'VERIFIED' or candidate.approval_text != approval_message(row):
        return dict(valid=False,verdict='APPROVAL_REJECTED',explanation='The exact approval text or its signed receipt does not match the sealed case.',invoice=image,approval=text)
    return dict(valid=True,verdict='EVIDENCE_VERIFIED',explanation='The exact invoice file, image pixels, approval text and their pinned signatures all match the payment case.',invoice=image,approval=text,binding=pinned)
