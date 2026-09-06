"""Hoeffding bounds and threshold configurations for QDS threat detection."""

# Quantum Bit Error Rate threshold (standard QKD/QDS threshold is ~11%)
QBER_THRESHOLD: float = 0.11

# Security parameters for Hoeffding inequality bounds
EPSILON_SEC: float = 1e-10
DEFAULT_ALPHA: float = 0.05

# Forgery, robustness, and repudiation threshold margins
DELTA_FORG: float = 0.05
DELTA_ROB: float = 0.05
DELTA_REP: float = 0.05
