"""Practical QDS Reference Parameter Baselines and Configuration Defaults.

Conforms to Section 16 (Table 16) of the QDS Security Analysis & Simulation
Prototype Developer Specification (REQ-QDS-SIM-2026-V1):
  - Fiber attenuation alpha: 0.160 dB/km (standard telecom low-loss SMF-28)
  - Detector efficiency eta_d: 0.93 (Superconducting Nanowire Single-Photon Detectors, SNSPD)
  - Dark count rate p_dark: 1.0e-7 per pulse
  - Baseline QBER e_0: 0.010 (1.0% optical alignment and polarization drift)
  - Test-bit sampling ratio beta: 0.30 (30% used for parameter estimation)
  - Authentication threshold Ta: 0.0150 (1.50%)
  - Verification threshold Tv: 0.0645 (6.45%)
  - Security bound target epsilon_sec: < 1.0e-5
  - Model Version: practical_qds_v1
"""

from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class PracticalQDSReferenceBaselines:
    """Canonical physics and operational baselines for Practical QDS (Yin, Fu & Chen)."""

    # Physical / Optical baselines
    FIBER_ATTENUATION_ALPHA: float = 0.160     # dB/km (SMF-28 ultra low-loss)
    DETECTOR_EFFICIENCY_ETA_D: float = 0.93   # 93.0% (SNSPD)
    DARK_COUNT_RATE_P_DARK: float = 1.0e-7    # per gate window
    BASELINE_QBER_E0: float = 0.010           # 1.0% intrinsic optical error

    # Protocol operational parameters
    TEST_BIT_RATIO_BETA: float = 0.30         # 30.0% parameter estimation split
    AUTH_THRESHOLD_TA: float = 0.0150         # 1.50% authentication cutoff
    VERIF_THRESHOLD_TV: float = 0.0645        # 6.45% verification cutoff
    SECURITY_BOUND_TARGET: float = 1.0e-5     # combined failure probability target

    # Default simulation scale
    DEFAULT_PULSE_COUNT: int = 10_000         # Default transmitted pulses (N)
    DEFAULT_DISTANCE_KM: float = 20.0         # Default fiber length in km
    DEFAULT_MESSAGE: str = "Transfer ₹ 10,000 to Account #8849-B"

    # Model identifiers
    MODEL_NAME: str = "Practical QDS (Yin, Fu & Chen, Phys. Rev. A 2016)"
    MODEL_VERSION: str = "practical_qds_v1"

    # Assumptions & Simplifications documentation
    ASSUMPTIONS: Tuple[str, ...] = (
        "Weak coherent state distribution with single-photon threshold approximation",
        "Identical optical channel attenuation for Alice-Bob and Alice-Charlie fiber links",
        "Independent Poisson dark count events across Bob and Charlie single-photon detectors",
        "Symmetric rectilinear (Z) and diagonal (X) state preparation and measurement probabilities",
    )
    SIMPLIFICATIONS: Tuple[str, ...] = (
        "Phase-randomized pulse dynamics simplified to effective transmission and detection probability",
        "Lumped linear channel loss model using eta = 10^(-alpha * L / 10)",
        "Single-shot Monte Carlo state distribution with PRNG deterministic seeding",
        "Research simulation model — not direct hardware telemetry",
    )


REFERENCE_BASELINES = PracticalQDSReferenceBaselines()
