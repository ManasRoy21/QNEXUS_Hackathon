"""Parameter validators for the analytics engine."""

from typing import List

VALID_SWEEP_PARAMETERS = {
    "distance_km",
    "pulse_count",
    "baseline_qber",
    "detector_efficiency",
    "dark_count_rate",
    "beta",
    "authentication_threshold",
    "verification_threshold",
    "intensity",
    "gamma",
    "delta",
}

def validate_sweep_parameter(param_name: str) -> str:
    """Normalize and validate parameter name."""
    norm = param_name.strip().lower()
    if norm == "gamma":
        norm = "intensity"
    elif norm == "ta":
        norm = "authentication_threshold"
    elif norm == "tv":
        norm = "verification_threshold"

    if norm not in VALID_SWEEP_PARAMETERS:
        raise ValueError(
            f"Invalid sweep parameter '{param_name}'. Supported parameters: {sorted(list(VALID_SWEEP_PARAMETERS))}"
        )
    return norm


def validate_sweep_values(param_name: str, values: List[float]) -> None:
    """Validate numerical domain of swept values."""
    if not values:
        raise ValueError("Values list cannot be empty.")
    if len(values) > 50:
        raise ValueError("Sweep exceeds maximum of 50 points.")

    for v in values:
        if param_name == "distance_km" and v < 0:
            raise ValueError(f"distance_km cannot be negative: {v}")
        elif param_name == "pulse_count" and v < 64:
            raise ValueError(f"pulse_count must be >= 64: {v}")
        elif param_name in ("baseline_qber", "intensity") and not (0.0 <= v <= 1.0):
            raise ValueError(f"{param_name} must be in [0, 1]: {v}")
        elif param_name == "detector_efficiency" and not (0.0 < v <= 1.0):
            raise ValueError(f"detector_efficiency must be in (0, 1]: {v}")
        elif param_name == "beta" and not (0.0 < v < 1.0):
            raise ValueError(f"beta must be in (0, 1): {v}")
        elif param_name in ("authentication_threshold", "verification_threshold") and not (0.0 <= v <= 0.5):
            raise ValueError(f"{param_name} must be in [0, 0.5]: {v}")
