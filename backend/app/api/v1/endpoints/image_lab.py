"""Image lab routes use sync handlers so Aer work stays off the event loop."""

from fastapi import APIRouter, HTTPException
from app.engine.quantum.image_channel import run_channel
from app.schemas.image_lab import ChannelConfig, SealImageRequest, SignedReceipt, VerifyImageRequest
from app.services.image_lab_service import image_lab_service

router = APIRouter()


@router.get("/capabilities")
def capabilities():
    return image_lab_service.capabilities()


@router.post("/channel")
def channel(config: ChannelConfig):
    return run_channel(config)


@router.post("/seal", response_model=SignedReceipt)
def seal(request: SealImageRequest):
    try:
        return image_lab_service.seal(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/verify")
def verify(request: VerifyImageRequest):
    try:
        return image_lab_service.verify(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
