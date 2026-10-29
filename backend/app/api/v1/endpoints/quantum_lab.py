"""Public bounded simulations; hardware calls require a configured operator secret."""
import secrets
import logging
from typing import Annotated
from fastapi import APIRouter, Header, HTTPException, Path
from app.core.config import settings
from app.schemas.quantum_lab import KeyExchangeRequest, DemoEnvelope, BellRequest, HardwareRequest
from app.engine.quantum.key_exchange import run_key_exchange, check_envelope
from app.engine.quantum.bell_lab import run_bell
from app.services.quantum_hardware_service import hardware_status, submit_bell, get_bell_job

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post('/key-exchange')
def key_exchange(request: KeyExchangeRequest):
    return run_key_exchange(request)


@router.post('/message-check')
def message_check(request: DemoEnvelope):
    try:
        return check_envelope(request)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post('/bell')
def bell(request: BellRequest):
    return run_bell(request)


@router.get('/hardware')
def hardware():
    return hardware_status()


def authorize(token):
    expected = settings.QUANTUM_OPERATOR_TOKEN
    if not expected or not secrets.compare_digest((token or '').encode(), expected.get_secret_value().encode()):
        raise HTTPException(401, 'An operator password is required for hardware access.')
    if not hardware_status()['available']:
        raise HTTPException(503, 'IBM Quantum hardware is not configured on this server.')


@router.post('/hardware/jobs', status_code=202)
def submit(request: HardwareRequest, x_quantum_operator: Annotated[str | None, Header(max_length=512)] = None):
    authorize(x_quantum_operator)
    try:
        return submit_bell(request.shots)
    except Exception:
        # Provider exception strings can contain account identifiers: never return them.
        logger.warning('IBM hardware submission failed; no simulation substituted.')
        raise HTTPException(502, 'IBM Quantum submission failed. Check the configured account, instance and backend in the IBM dashboard.') from None


@router.get('/hardware/jobs/{identifier}')
def hardware_job(identifier: Annotated[str, Path(pattern=r'^[A-Za-z0-9_-]{8,80}$')],
                 x_quantum_operator: Annotated[str | None, Header(max_length=512)] = None):
    authorize(x_quantum_operator)
    try:
        return get_bell_job(identifier)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except Exception:
        raise HTTPException(502, 'Could not retrieve the IBM job. Check its ID and the configured account.') from None
