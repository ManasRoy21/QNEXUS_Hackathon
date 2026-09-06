"""Module B & C: Threat Analytics, Channel Noise & Security Bounds Package."""

from app.engine.threats.attack_simulator import AttackConfig, AttackSimulator, AttackType
from app.engine.threats.channel_noise import AdversaryChannel
from app.engine.threats.threat_detector import (
    AttackVector,
    ComprehensiveThreatReport,
    HoeffdingQBEREvaluator,
    QDSThreatDetector,
    QDSThreatDetectorV1,
    ThreatSeverity,
)

__all__ = [
    "AdversaryChannel",
    "AttackConfig",
    "AttackSimulator",
    "AttackType",
    "AttackVector",
    "ComprehensiveThreatReport",
    "HoeffdingQBEREvaluator",
    "QDSThreatDetector",
    "QDSThreatDetectorV1",
    "ThreatSeverity",
]
