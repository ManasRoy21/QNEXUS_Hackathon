"""Fake-money payment sandbox. Session credential stays out of URLs and exports."""
from typing import Annotated
from fastapi import APIRouter, Header, Response, Path
from app.schemas.payments import DraftPayment, ReceivePayment, InjectAttack, ReceiptCheck,CreatePaymentCase,InvoiceCandidate,ApprovalCandidate
from app.services import payment_gateway as gateway
from app.services import payment_evidence

router = APIRouter()
Token = Annotated[str | None, Header(alias='X-Sandbox-Token', max_length=128)]
Sid = Annotated[str, Path(pattern=r'^[a-f0-9]{32}$')]
CaseId = Annotated[str, Path(pattern=r'^[a-f0-9]{32}$')]


@router.post('/sessions/{sid}/cases',status_code=201)
def create_case(sid: Sid,request: CreatePaymentCase,x_sandbox_token: Token=None):
    return payment_evidence.create(sid,x_sandbox_token,request)


@router.post('/sessions/{sid}/cases/{case_id}/invoice')
def seal_invoice(sid: Sid,case_id: CaseId,request: InvoiceCandidate,x_sandbox_token: Token=None):
    return payment_evidence.seal_invoice(sid,x_sandbox_token,case_id,request)


@router.post('/sessions/{sid}/cases/{case_id}/approval')
def seal_approval(sid: Sid,case_id: CaseId,request: ApprovalCandidate,x_sandbox_token: Token=None):
    return payment_evidence.seal_approval(sid,x_sandbox_token,case_id,request)


@router.post('/sessions', status_code=201)
def create(response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return gateway.create_session()


@router.get('/sessions/{sid}')
def snapshot(sid: Sid, response: Response, x_sandbox_token: Token = None):
    response.headers['Cache-Control'] = 'no-store'
    return gateway.snapshot(sid, x_sandbox_token)


@router.post('/sessions/{sid}/draft')
def draft(sid: Sid, request: DraftPayment, x_sandbox_token: Token = None):
    return gateway.prepare(sid, x_sandbox_token, request)


@router.post('/sessions/{sid}/receive')
def receive(sid: Sid, request: ReceivePayment, x_sandbox_token: Token = None):
    return gateway.receive(sid, x_sandbox_token, request.envelope,request.candidate)


@router.post('/sessions/{sid}/attack')
def attack(sid: Sid, request: InjectAttack, x_sandbox_token: Token = None):
    return gateway.inject(sid, x_sandbox_token, request)


@router.post('/sessions/{sid}/verify-receipt')
def verify_receipt(sid: Sid, request: ReceiptCheck, x_sandbox_token: Token = None):
    return gateway.verify_receipt(sid, x_sandbox_token, request)


@router.post('/sessions/{sid}/benchmark')
def benchmark(sid: Sid, x_sandbox_token: Token = None):
    return gateway.benchmark(sid, x_sandbox_token)
