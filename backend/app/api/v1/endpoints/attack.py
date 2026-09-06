"""Module E: Attack Injection Endpoint."""

from fastapi import APIRouter, HTTPException
from app.schemas.qds_schemas import AttackInjectRequest, AttackInjectResponse
from app.services.simulation_service import simulation_service

router = APIRouter()


@router.post("/inject", response_model=AttackInjectResponse, summary="Inject One of 6 Supported Attack Vectors")
async def inject_attack(request: AttackInjectRequest) -> AttackInjectResponse:
    """POST /api/v1/attack/inject - Applies adversary attack transformation to active verifier state."""
    try:
        return simulation_service.inject_attack(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
