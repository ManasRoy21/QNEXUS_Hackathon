"""QBER tracking & 11% threshold check."""
from app.core.security_bounds import QBER_THRESHOLD

def evaluate_qber(error_count: int, total_count: int) -> dict:
    """Calculates Quantum Bit Error Rate and checks against security threshold."""
    if total_count == 0:
        return {"qber": 0.0, "breach": False}
    qber = error_count / total_count
    return {
        "qber": qber,
        "breach": qber > QBER_THRESHOLD,
        "threshold": QBER_THRESHOLD
    }
