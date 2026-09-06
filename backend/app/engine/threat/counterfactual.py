"""Zero-transmission channel check."""

def check_counterfactual_integrity(channel_activity: dict) -> bool:
    """Verifies that unchosen path transmissions have not experienced leakage or tampering."""
    return channel_activity.get("untransmitted_signal_detected", False) is False
