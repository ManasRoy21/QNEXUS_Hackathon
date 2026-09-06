"""e_forg, e_rob, e_rep calculations using Hoeffding inequality bounds."""
import numpy as np

def calculate_hoeffding_bound(sample_size: int, epsilon: float = 1e-10) -> float:
    """Computes statistical deviation bound delta = sqrt(ln(1/epsilon) / (2 * sample_size))."""
    if sample_size <= 0:
        return 1.0
    return float(np.sqrt(np.log(1.0 / epsilon) / (2.0 * sample_size)))

def compute_security_parameters(n_qubits: int, qber: float):
    """Calculates e_forg (forgery error), e_rob (robustness), and e_rep (repudiation)."""
    bound = calculate_hoeffding_bound(n_qubits)
    e_forg = qber + bound
    e_rob = qber + 2 * bound
    e_rep = qber + 3 * bound
    return {
        "e_forg": e_forg,
        "e_rob": e_rob,
        "e_rep": e_rep,
        "bound": bound
    }
