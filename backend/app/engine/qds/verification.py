"""Multi-verifier majority voting."""

def verify_signature_majority(verifications: list[bool], threshold: float = 0.5) -> bool:
    """Performs multi-verifier majority voting across Bob and Charlie verifications."""
    if not verifications:
        return False
    return (sum(verifications) / len(verifications)) > threshold
