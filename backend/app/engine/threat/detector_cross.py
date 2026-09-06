"""MDI-style dual path cross-check."""

def verify_cross_detectors(path_a_counts: dict, path_b_counts: dict, tolerance: float = 0.05) -> bool:
    """Performs measurement-device-independent (MDI) style cross-check on dual detector paths."""
    total_a = sum(path_a_counts.values()) or 1
    total_b = sum(path_b_counts.values()) or 1
    diff = abs(total_a - total_b) / max(total_a, total_b)
    return diff <= tolerance
