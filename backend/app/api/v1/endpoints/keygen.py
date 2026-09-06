"""Module E: Key Generation API Endpoint."""

from fastapi import APIRouter, HTTPException
from app.schemas.qds_schemas import KeygenRequest, KeygenResponse
from app.services.simulation_service import simulation_service

router = APIRouter()


@router.post("/keygen", response_model=KeygenResponse, summary="Initiate Entangled Bell-State Key Generation")
async def generate_keys(request: KeygenRequest) -> KeygenResponse:
    """POST /api/v1/simulate/keygen - Generates entangled Bell pairs for Alice, Bob, and Charlie."""
    try:
        return simulation_service.keygen(request)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
