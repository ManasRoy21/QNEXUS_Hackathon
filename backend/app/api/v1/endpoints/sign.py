"""Module E: Teleportation Signature Generation Endpoint."""

from fastapi import APIRouter, HTTPException
from app.schemas.qds_schemas import SignRequest, SignResponse
from app.services.simulation_service import simulation_service

router = APIRouter()


@router.post("/sign", response_model=SignResponse, summary="Generate Quantum Digital Signature Block")
async def sign_message(request: SignRequest) -> SignResponse:
    """POST /api/v1/simulate/sign - Encodes digest into Pauli eigenstates with basis choices and nonce."""
    try:
        return simulation_service.sign(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
