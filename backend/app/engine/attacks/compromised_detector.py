"""Compromised detector attack: Path bias simulation."""
import random

def simulate_detector_bias(outcomes: list[int], bias_probability: float = 0.2, forced_value: int = 1) -> list[int]:
    """Simulates detector hardware tampering biasing measurement outcomes."""
    return [forced_value if random.random() < bias_probability else val for val in outcomes]
