"""Fake-money payment sandbox. Session credential stays out of URLs and exports."""
from typing import Annotated
from fastapi import APIRouter, Header, Response, Path
from app.schemas.payments import DraftPayment, ReceivePayment, InjectAttack, ReceiptCheck
from app.services import payment_gateway as gateway

router = APIRouter()
Token = Annotated[str | None, Header(alias='X-Sandbox-Token', max_length=128)]
Sid = Annotated[str, Path(pattern=r'^[a-f0-9]{32}$')]


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
    return gateway.receive(sid, x_sandbox_token, request.envelope)


@router.post('/sessions/{sid}/attack')
def attack(sid: Sid, request: InjectAttack, x_sandbox_token: Token = None):
    return gateway.inject(sid, x_sandbox_token, request)


@router.post('/sessions/{sid}/verify-receipt')
def verify_receipt(sid: Sid, request: ReceiptCheck, x_sandbox_token: Token = None):
    return gateway.verify_receipt(sid, x_sandbox_token, request)


@router.post('/sessions/{sid}/benchmark')
def benchmark(sid: Sid, x_sandbox_token: Token = None):
    return gateway.benchmark(sid, x_sandbox_token)
