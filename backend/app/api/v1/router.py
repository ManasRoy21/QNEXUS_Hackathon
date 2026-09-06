from fastapi import APIRouter
from app.api.v1.endpoints import keygen, sign, verify, attack, symmetrize, metrics

api_router = APIRouter()

api_router.include_router(keygen.router, prefix="/simulate", tags=["simulate"])
api_router.include_router(sign.router, prefix="/simulate", tags=["simulate"])
api_router.include_router(verify.router, prefix="/simulate", tags=["simulate"])
api_router.include_router(attack.router, prefix="/attack", tags=["attack"])
api_router.include_router(symmetrize.router, prefix="/symmetrize", tags=["symmetrize"])
api_router.include_router(metrics.router, tags=["metrics"])
