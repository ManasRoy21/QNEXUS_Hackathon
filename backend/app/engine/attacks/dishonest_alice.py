"""Dishonest Alice attack: Post-distribution declaration mismatch."""

def simulate_dishonest_alice(original_states: list[str], altered_states: list[str]) -> dict:
    """Simulates Alice declaring conflicting quantum state definitions to verifiers."""
    mismatches = [i for i, (orig, alt) in enumerate(zip(original_states, altered_states)) if orig != alt]
    return {
        "mismatches_detected": len(mismatches),
        "indices": mismatches
    }
