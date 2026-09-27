"""Result Aggregation helper for parameter sweeps (Phase 4).

Strictly adheres to scientific neutrality: provides exact numerical ranges and factual
observations without subjective terminology like 'OPTIMAL' or 'BEST'.
"""

from typing import Any, Dict, List
from app.schemas.analytics_models import SweepPointResult


def aggregate_sweep_summary(parameter: str, points: List[SweepPointResult]) -> Dict[str, Any]:
    """Generates summary statistics and factual descriptions for a completed sweep."""
    if not points:
        return {}

    values = [p.parameter_value for p in points]
    qbers = [p.qber_bob for p in points]
    conclusives = [p.conclusive_count_bob for p in points]
    sig_rates = [p.signature_rate for p in points if p.signature_rate is not None]

    eps1_vals = [p.epsilon_1 for p in points if p.epsilon_1 is not None]
    eps2_vals = [p.epsilon_2 for p in points if p.epsilon_2 is not None]
    eps_sec_vals = [p.epsilon_sec for p in points if p.epsilon_sec is not None]
    qber_obs_vals = [p.qber_obs for p in points if p.qber_obs is not None]

    summary: Dict[str, Any] = {
        "point_count": len(points),
        "parameter": parameter,
        "param_min": min(values),
        "param_max": max(values),
        "avg_qber_bob": round(sum(qbers) / len(qbers), 6),
        "min_qber_bob": min(qbers),
        "max_qber_bob": max(qbers),
        "avg_conclusive_bob": round(sum(conclusives) / len(conclusives), 1),
    }

    if sig_rates:
        summary["min_signature_rate"] = min(sig_rates)
        summary["max_signature_rate"] = max(sig_rates)
        summary["avg_signature_rate"] = round(sum(sig_rates) / len(sig_rates), 6)

    factual_observations: List[str] = []

    if eps1_vals:
        summary["min_epsilon_1"] = min(eps1_vals)
        summary["max_epsilon_1"] = max(eps1_vals)
        factual_observations.append(
            f"Forgery probability ε₁ ranged from {min(eps1_vals):.4e} to {max(eps1_vals):.4e}."
        )

    if eps2_vals:
        summary["min_epsilon_2"] = min(eps2_vals)
        summary["max_epsilon_2"] = max(eps2_vals)
        factual_observations.append(
            f"Repudiation probability ε₂ ranged from {min(eps2_vals):.4e} to {max(eps2_vals):.4e}."
        )

    if eps_sec_vals:
        summary["min_epsilon_sec"] = min(eps_sec_vals)
        summary["max_epsilon_sec"] = max(eps_sec_vals)

    if qber_obs_vals:
        summary["min_qber_obs"] = min(qber_obs_vals)
        summary["max_qber_obs"] = max(qber_obs_vals)
        factual_observations.append(
            f"Observed QBER under attack ranged from {min(qber_obs_vals):.4f} to {max(qber_obs_vals):.4f}."
        )

    summary["factual_observations"] = factual_observations
    return summary

