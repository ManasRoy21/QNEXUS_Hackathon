"""Module E: Classical Symmetrization Guard Endpoint (Module G)."""

from fastapi import APIRouter, HTTPException
from app.schemas.qds_schemas import SymmetrizeRequest, SymmetrizeResponse
from app.services.simulation_service import simulation_service

router = APIRouter()


@router.post("", response_model=SymmetrizeResponse, summary="Execute Verifier Symmetrization Swap")
async def symmetrize_keys(request: SymmetrizeRequest) -> SymmetrizeResponse:
    """POST /api/v1/symmetrize - Classical authenticated swap between Bob and Charlie to close repudiation gap."""
    try:
        return simulation_service.symmetrize(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
