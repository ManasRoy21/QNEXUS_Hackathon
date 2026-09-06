"""Ambiguous sample filtering."""

def filter_ambiguous_samples(samples: list[dict], min_confidence: float = 0.8) -> list[dict]:
    """Filters out noisy, low-confidence, or multi-photon ambiguous measurement samples."""
    return [s for s in samples if s.get("confidence", 1.0) >= min_confidence]
