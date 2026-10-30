"""Bounded contracts for an isolated, fake-money payment gateway."""
from typing import Literal
from pydantic import Field
from app.schemas.image_lab import StrictModel

SUITE = 'ML-KEM-768/HKDF-SHA256/AES-256-GCM/ML-DSA-65/v1'


class EvidenceBinding(StrictModel):
    invoice_reference: str = Field(min_length=1, max_length=40, pattern=r'^[A-Za-z0-9_-]+$')
    revision: int = Field(strict=True, ge=1)
    invoice_pixel_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    invoice_file_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    approval_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    invoice_receipt_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    approval_receipt_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    receipt_algorithm: Literal['Ed25519'] = 'Ed25519'


class PaymentInstruction(StrictModel):
    version: Literal['qnexus-payment/v2'] = 'qnexus-payment/v2'
    session_id: str = Field(pattern=r'^[a-f0-9]{32}$')
    transaction_id: str = Field(pattern=r'^[a-f0-9]{32}$')
    nonce: str = Field(pattern=r'^[a-f0-9]{32}$')
    sender_bank: Literal['BANK_A'] = 'BANK_A'
    receiver_bank: Literal['BANK_B'] = 'BANK_B'
    payer: Literal['alice@demo'] = 'alice@demo'
    payee: Literal['rahul@demo', 'mallory@demo']
    amount_paise: int = Field(strict=True, ge=1, le=1_000_000)
    currency: Literal['INR'] = 'INR'
    issued_at: int = Field(strict=True, ge=0)
    expires_at: int = Field(strict=True, ge=0)
    evidence: EvidenceBinding


class PaymentEnvelope(StrictModel):
    version: Literal['qnexus-envelope/v1'] = 'qnexus-envelope/v1'
    suite: Literal['ML-KEM-768/HKDF-SHA256/AES-256-GCM/ML-DSA-65/v1'] = SUITE
    session_id: str = Field(pattern=r'^[a-f0-9]{32}$')
    sender_key_id: str = Field(pattern=r'^[a-f0-9]{24}$')
    receiver_key_id: str = Field(pattern=r'^[a-f0-9]{24}$')
    kem_ciphertext: str = Field(min_length=1452, max_length=1452)
    nonce: str = Field(min_length=16, max_length=16)
    ciphertext: str = Field(min_length=20, max_length=14000)


class CreatePaymentCase(StrictModel):
    amount_paise: int = Field(strict=True, ge=1, le=1_000_000)
    payee: Literal['rahul@demo', 'mallory@demo'] = 'rahul@demo'
    invoice_reference: str = Field(default='INV-204', min_length=1, max_length=40, pattern=r'^[A-Za-z0-9_-]+$')


class InvoiceCandidate(StrictModel):
    image_base64: str = Field(min_length=1, max_length=2_800_000)


class ApprovalCandidate(StrictModel):
    message: str = Field(min_length=1, max_length=4096)


class CandidateEvidence(StrictModel):
    image_base64: str = Field(min_length=1, max_length=2_800_000)
    approval_text: str = Field(max_length=4096)


class DraftPayment(CreatePaymentCase):
    case_id: str = Field(pattern=r'^[a-f0-9]{32}$')
    candidate: CandidateEvidence


class ReceivePayment(StrictModel):
    envelope: PaymentEnvelope
    candidate: CandidateEvidence


class InjectAttack(StrictModel):
    envelope: PaymentEnvelope
    kind: Literal['amount', 'beneficiary', 'expired', 'ciphertext']


class ReceiptCheck(StrictModel):
    receipt: dict = Field(max_length=16)
    signature: str = Field(min_length=4412, max_length=4412)
