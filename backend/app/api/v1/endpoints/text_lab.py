"""Sync handlers keep Qiskit work off the async event loop."""
from fastapi import APIRouter
from app.schemas.text_lab import SealTextRequest, VerifyTextRequest, TextReceipt, TextVerification
from app.services.text_lab_service import seal_text, verify_text

router = APIRouter()


@router.post('/seal', response_model=TextReceipt)
def seal(request: SealTextRequest):
    return seal_text(request)


@router.post('/verify', response_model=TextVerification)
def verify(request: VerifyTextRequest):
    return verify_text(request)
