"""Phase 2: Protocol Sessions API Endpoints."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from app.schemas.phase2_schemas import (
    AttackSimulateRequest,
    CreateSessionRequest,
    KeygenPhase2Request,
    SessionStateResponse,
    SignPhase2Request,
    TransferRequest,
    VerifyPhase2Request,
)
from app.services.phase2_service import phase2_service

router = APIRouter()


@router.post("/sessions", response_model=SessionStateResponse, summary="Create Protocol Session")
def create_session(request: CreateSessionRequest) -> SessionStateResponse:
    """POST /api/v1/sessions - Creates a new session configured for an interactive protocol."""
    try:
        return phase2_service.create_session(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/sessions/{session_id}", response_model=SessionStateResponse, summary="Get Session State")
def get_session_state(session_id: str) -> SessionStateResponse:
    """GET /api/v1/sessions/{session_id} - Fetches current state, keys, signature, and trace."""
    try:
        sess = phase2_service.get_session(session_id)
        return phase2_service._to_response(sess)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/sessions/{session_id}/keygen", response_model=SessionStateResponse, summary="Generate Simulated Quantum Keys")
def session_keygen(session_id: str, request: Optional[KeygenPhase2Request] = None) -> SessionStateResponse:
    """POST /api/v1/sessions/{session_id}/keygen - Generates simulated quantum key material."""
    try:
        num_bits = request.num_bits if request else 384
        return phase2_service.keygen(session_id, num_bits=num_bits)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/sessions/{session_id}/sign", response_model=SessionStateResponse, summary="Alice Signs Message")
def session_sign(session_id: str, request: SignPhase2Request) -> SessionStateResponse:
    """POST /api/v1/sessions/{session_id}/sign - Alice signs a message or large document."""
    try:
        return phase2_service.sign(
            session_id=session_id,
            message=request.message,
            large_doc_simulated_kb=request.large_doc_simulated_kb,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/sessions/{session_id}/verify", response_model=SessionStateResponse, summary="Bob / Charlie Verification")
def session_verify(session_id: str, request: VerifyPhase2Request) -> SessionStateResponse:
    """POST /api/v1/sessions/{session_id}/verify - Runs verification check for Bob or Charlie."""
    try:
        return phase2_service.verify(
            session_id=session_id,
            verifier_role=request.verifier_role,
            force_forgery=request.force_forgery,
            untrusted_node_compromised=request.untrusted_node_compromised,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/sessions/{session_id}/transfer", response_model=SessionStateResponse, summary="Bob Forwards to Charlie (Transferability)")
def session_transfer(session_id: str, request: Optional[TransferRequest] = None) -> SessionStateResponse:
    """POST /api/v1/sessions/{session_id}/transfer - Forwards accepted signature to Charlie for transferability proof."""
    try:
        return phase2_service.transfer(session_id=session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/sessions/{session_id}/attack", response_model=SessionStateResponse, summary="Simulate Attack Against Session")
def session_attack(session_id: str, request: AttackSimulateRequest) -> SessionStateResponse:
    """POST /api/v1/sessions/{session_id}/attack - Injects forgery, repudiation, or eavesdropping/blinding attack."""
    try:
        return phase2_service.simulate_attack(
            session_id=session_id,
            attack_type=request.attack_type,
            intensity=request.intensity,
            target_role=request.target_role,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
