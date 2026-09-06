"""Module E: QDS Signature Verification & Threat Evaluation Endpoint."""

from fastapi import APIRouter, HTTPException
from app.schemas.qds_schemas import VerifyRequest, VerifyResponse
from app.services.simulation_service import simulation_service

router = APIRouter()


@router.post("/verify", response_model=VerifyResponse, summary="Execute Verification & Threat Analytics")
async def verify_signature(request: VerifyRequest) -> VerifyResponse:
    """POST /api/v1/simulate/verify - Runs postselection and Hoeffding security bound checks."""
    try:
        return simulation_service.verify(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
