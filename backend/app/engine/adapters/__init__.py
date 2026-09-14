"""Phase 2: Protocol adapters package."""

from app.engine.adapters.base import (
    BaseProtocolAdapter,
    ProtocolConfig,
    KeyMaterialResult,
    SignatureObject,
    VerificationResult,
    AttackOutcome,
    AttackType,
    ProtocolCategory,
)
from app.engine.adapters.practical_qds import PracticalQDSAdapter
from app.engine.adapters.mdi_qds import MDIQDSAdapter
from app.engine.adapters.otuh_qds import OTUHQDSAdapter
from app.engine.adapters.tf_qds import TFQDSAdapter
from app.engine.adapters.decoy_qds import DecoyStateQDSAdapter
from app.engine.adapters.registry import protocol_registry, ProtocolRegistry

__all__ = [
    "BaseProtocolAdapter",
    "ProtocolConfig",
    "KeyMaterialResult",
    "SignatureObject",
    "VerificationResult",
    "AttackOutcome",
    "AttackType",
    "ProtocolCategory",
    "PracticalQDSAdapter",
    "MDIQDSAdapter",
    "OTUHQDSAdapter",
    "TFQDSAdapter",
    "DecoyStateQDSAdapter",
    "protocol_registry",
    "ProtocolRegistry",
]
