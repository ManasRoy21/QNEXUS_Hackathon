"""Practical QDS — Quantitative Attack Models (Phase 2, FR-E1 / FR-E2 / FR-E3).

All three models use ONLY values from the canonical CanonicalSimulationState
produced by PracticalQDSEngine.generate_simulation().  No values are hardcoded.

FR-E1 Forgery (epsilon_1):
  I(B:C)  = mutual information between K_B and K_C conclusive bits
  S_c     = min conclusive-bit fraction s.t. H(S_c) >= 1 - I(B:C)  [bisection]
  ε₁ ≤ exp(-(S_c - T_v)² / (2·S_c) · P_C^c · M_u)   when S_c > T_v

FR-E2 Repudiation (epsilon_2):
  ε₂ ≤ exp(-2·(T_v - T_a - Δ)²·M_u²·β² / n_test)

FR-E3 Intercept-Resend / Eavesdropping:
  QBER_obs = QBER_base + 0.5·γ·(1 - 2·QBER_base)
  Abort if QBER_obs > T_a   (γ strictly validated, no clamping)
"""

from __future__ import annotations

import math
from typing import Optional

from app.engine.quantum.entropy import binary_entropy, solve_minimum_sc
from app.schemas.attack_models import MathematicalModel
from app.schemas.canonical_models import CanonicalSimulationState

_MODEL_VERSION = "practical_qds_attack_v1"


# ─────────────────────────────────────────────────────────────────────────────
# Helper: conclusive-bit mutual information I(B:C)
# ─────────────────────────────────────────────────────────────────────────────

def _compute_I_BC(state: CanonicalSimulationState) -> float:
    """Estimate I(B:C) from the conclusive-bit overlap between Bob and Charlie.

    In Practical QDS (Yin, Fu & Chen 2016), Bob's uncertainty regarding Charlie's
    key material is bounded by the mutual information I(B:C) between their conclusive
    bit registers K_B and K_C.

    I(B:C) = 1 - H(p_mismatch) where p_mismatch is the observed disagreement
    rate between Bob's and Charlie's conclusive bits.
    """
    b_bits = state.material.bob_conclusive_bits
    c_bits = state.material.charlie_conclusive_bits
    min_len = min(len(b_bits), len(c_bits))
    if min_len > 0:
        mismatches = sum(1 for i in range(min_len) if b_bits[i] != c_bits[i])
        p_mismatch = mismatches / min_len
    else:
        p_mismatch = 0.50

    # Numerical guard: clamp to (0, 0.5] for binary entropy evaluation
    p_mismatch = max(1e-9, min(p_mismatch, 0.5))
    h_e = binary_entropy(p_mismatch)
    I_BC = max(0.0, 1.0 - h_e)
    return I_BC


# ─────────────────────────────────────────────────────────────────────────────
# FR-E1 Forgery model
# ─────────────────────────────────────────────────────────────────────────────

def simulate_forgery(
    state: CanonicalSimulationState,
) -> tuple[dict, MathematicalModel]:
    """Compute ε₁ (Chernoff-bound forgery probability) from canonical state.

    Returns:
        result_fields: dict of scalar values for AttackSimulationResponse
        math_model: MathematicalModel carrying the full computation chain
    """
    M_u: int = state.material.untested_bits.get("M_u_bob", 0)
    T_v: float = state.configuration.verification_threshold
    T_a: float = state.configuration.authentication_threshold

    I_BC = _compute_I_BC(state)

    # Solve S_c: minimum conclusive fraction where H(S_c) >= 1 - I(B:C)
    # If I_BC = 1 (Bob and Charlie perfectly correlated), S_c = 0 → no bound
    solver_res = solve_minimum_sc(I_BC)
    S_c: float = float(solver_res.get("S_c") or 0.0)

    # P_C^c: probability of conclusive outcome on the quantum channel for Charlie
    # Estimated as conclusive_count_charlie / pulse_count
    pulse_count = state.configuration.pulse_count
    conclusive_charlie = state.measurement_statistics.conclusive_count_charlie
    P_C_c = conclusive_charlie / max(1, pulse_count)

    # Chernoff-bound formula:
    #   ε₁ ≤ exp(-(S_c - T_v)² / (2·S_c) · P_C^c · M_u)  when S_c > T_v
    #        → 1.0 (trivial bound) when S_c <= T_v (forgery not bounded)
    if S_c > T_v and M_u > 0:
        exponent = -((S_c - T_v) ** 2 / (2.0 * S_c)) * P_C_c * M_u
        epsilon_1 = math.exp(exponent)
    else:
        # Adversary can achieve at least T_v agreement → no useful bound
        exponent = 0.0
        epsilon_1 = 1.0  # worst-case: no guarantee

    verdict = "FORGERY_BOUNDED" if epsilon_1 < 1.0 else "FORGERY_UNBOUNDED"
    attack_detected = True  # Forgery is always "detectable" — the bound quantifies risk
    protocol_resisted = epsilon_1 < 0.5

    result_fields = {
        "verdict": verdict,
        "attack_detected": attack_detected,
        "protocol_resisted": protocol_resisted,
        "epsilon_1": epsilon_1,
        "I_BC": I_BC,
        "S_c": S_c,
        "T_v": T_v,
        "M_u": M_u,
        "P_C_c": P_C_c,
    }

    intermediate = (
        f"Step 1: QBER_bob = {state.measurement_statistics.qber_bob:.6f}\n"
        f"Step 2: H(QBER) = {binary_entropy(state.measurement_statistics.qber_bob):.6f}\n"
        f"Step 3: I(B:C)  = 1 - H(QBER) = {I_BC:.6f}\n"
        f"Step 4: Solve H(S_c) = 1 - I(B:C) → S_c = {S_c:.6f}\n"
        f"Step 5: P_C^c  = {conclusive_charlie} / {pulse_count} = {P_C_c:.6f}\n"
        f"Step 6: exponent = -((S_c - T_v)² / 2S_c) · P_C^c · M_u\n"
        f"        = -(({S_c:.4f} - {T_v:.4f})² / (2 × {S_c:.4f})) × {P_C_c:.4f} × {M_u}\n"
        f"        = {exponent:.4f}\n"
        f"Step 7: ε₁ = exp({exponent:.4f}) = {epsilon_1:.4e}"
    )

    math_model = MathematicalModel(
        formula=r"\varepsilon_1 \leq \exp\!\left(-\frac{(S_c - T_v)^2}{2 S_c} \cdot P_C^c \cdot M_u\right)",
        inputs={
            "I_BC": round(I_BC, 6),
            "S_c": round(S_c, 6),
            "T_v": T_v,
            "T_a": T_a,
            "P_C_c": round(P_C_c, 6),
            "M_u": M_u,
            "QBER_bob": round(state.measurement_statistics.qber_bob, 6),
        },
        intermediate_calculation=intermediate,
        final_result=round(epsilon_1, 6),
        interpretation=(
            f"The forgery probability ε₁ = {epsilon_1:.3e}. "
            + (
                f"Protocol provides quantitative unforgeability guarantee (ε₁ ≪ 1)."
                if epsilon_1 < 0.5
                else "WARNING: S_c ≤ T_v — conclusive-bit overlap is too high to bound forgery. "
                     "Security parameters require adjustment."
            )
        ),
    )

    return result_fields, math_model


# ─────────────────────────────────────────────────────────────────────────────
# FR-E2 Repudiation model
# ─────────────────────────────────────────────────────────────────────────────

def simulate_repudiation(
    state: CanonicalSimulationState,
    delta: Optional[float] = None,
) -> tuple[dict, MathematicalModel]:
    """Compute ε₂ (repudiation probability) from canonical state.

    Δ (delta) is the maximum permissible statistical fluctuation between Bob's
    and Charlie's QBER estimates.  It must be an explicit model parameter.
    If not supplied, it defaults to |QBER_bob - QBER_charlie| from the simulation.

    ε₂ ≤ exp(-2·(T_v - T_a - Δ)²·M_u²·β² / n_test)
    """
    T_v: float = state.configuration.verification_threshold
    T_a: float = state.configuration.authentication_threshold
    beta: float = state.configuration.beta
    M_u: int = state.material.untested_bits.get("M_u_bob", 0)
    n_test: int = state.material.test_bits.get("bob_test_count", 1)

    # Δ: explicit model parameter (not hidden)
    if delta is None:
        qber_diff = abs(
            state.measurement_statistics.qber_bob
            - state.measurement_statistics.qber_charlie
        )
        delta = qber_diff
    delta = float(delta)

    gap = T_v - T_a - delta

    if gap > 0.0 and M_u > 0 and n_test > 0:
        exponent = -2.0 * (gap ** 2) * (M_u ** 2) * (beta ** 2) / n_test
        epsilon_2 = math.exp(exponent)
    else:
        exponent = 0.0
        epsilon_2 = 1.0  # no useful bound when gap <= 0

    verdict = "REPUDIATION_BOUNDED" if epsilon_2 < 1.0 else "REPUDIATION_UNBOUNDED"
    attack_detected = True
    protocol_resisted = epsilon_2 < 0.5

    result_fields = {
        "verdict": verdict,
        "attack_detected": attack_detected,
        "protocol_resisted": protocol_resisted,
        "epsilon_2": epsilon_2,
        "T_v": T_v,
        "T_a": T_a,
        "delta": delta,
        "gap": gap,
        "M_u": M_u,
        "n_test": n_test,
        "beta": beta,
    }

    intermediate = (
        f"Step 1: T_v = {T_v:.4f}, T_a = {T_a:.4f}, Δ = {delta:.6f}\n"
        f"Step 2: gap = T_v - T_a - Δ = {T_v:.4f} - {T_a:.4f} - {delta:.6f} = {gap:.6f}\n"
        f"Step 3: M_u = {M_u}, β = {beta:.2f}, n_test = {n_test}\n"
        f"Step 4: exponent = -2·gap²·M_u²·β² / n_test\n"
        f"        = -2 × {gap:.4f}² × {M_u}² × {beta:.2f}² / {n_test}\n"
        f"        = {exponent:.4f}\n"
        f"Step 5: ε₂ = exp({exponent:.4f}) = {epsilon_2:.4e}"
    )

    math_model = MathematicalModel(
        formula=(
            r"\varepsilon_2 \leq \exp\!\left("
            r"-\frac{2(T_v - T_a - \Delta)^2 M_u^2 \beta^2}{n_{\text{test}}}"
            r"\right)"
        ),
        inputs={
            "T_v": T_v,
            "T_a": T_a,
            "delta": round(delta, 6),
            "gap": round(gap, 6),
            "M_u": M_u,
            "beta": beta,
            "n_test": n_test,
        },
        intermediate_calculation=intermediate,
        final_result=round(epsilon_2, 6),
        interpretation=(
            f"The repudiation probability ε₂ = {epsilon_2:.3e}. "
            + (
                "Protocol provides non-repudiation guarantee (ε₂ ≪ 1)."
                if epsilon_2 < 0.5
                else "WARNING: threshold gap T_v − T_a − Δ ≤ 0 — repudiation bound is vacuous. "
                     "Review security parameters."
            )
        ),
    )

    return result_fields, math_model


# ─────────────────────────────────────────────────────────────────────────────
# FR-E3 Intercept-Resend / Eavesdropping model
# ─────────────────────────────────────────────────────────────────────────────

def simulate_eavesdropping(
    state: CanonicalSimulationState,
    gamma: float,
) -> tuple[dict, MathematicalModel]:
    """Compute QBER_obs and abort decision for an intercept-resend attack.

    γ ∈ [0, 1] must already be validated by the caller (no clamping here).
    QBER_obs = QBER_base + 0.5·γ·(1 − 2·QBER_base)
    """
    if not (0.0 <= gamma <= 1.0):
        raise ValueError(f"gamma must be in [0, 1]; received {gamma}")

    qber_base: float = state.measurement_statistics.qber_bob
    T_a: float = state.configuration.authentication_threshold

    qber_incremental = 0.5 * gamma * (1.0 - 2.0 * qber_base)
    qber_obs = qber_base + qber_incremental
    detected = qber_obs > T_a

    verdict = "EAVESDROPPING_DETECTED" if detected else "EAVESDROPPING_BELOW_THRESHOLD"
    attack_detected = detected
    protocol_resisted = detected  # protocol resists by aborting

    result_fields = {
        "verdict": verdict,
        "attack_detected": attack_detected,
        "protocol_resisted": protocol_resisted,
        "qber_obs": qber_obs,
        "qber_base": qber_base,
        "gamma": gamma,
        "T_a": T_a,
        "detected": detected,
    }

    intermediate = (
        f"Step 1: QBER_base = {qber_base:.6f}  (from simulation)\n"
        f"Step 2: Incremental QBER = 0.5 × γ × (1 − 2 × QBER_base)\n"
        f"        = 0.5 × {gamma:.3f} × (1 − 2 × {qber_base:.6f})\n"
        f"        = {qber_incremental:.6f}\n"
        f"Step 3: QBER_obs = {qber_base:.6f} + {qber_incremental:.6f} = {qber_obs:.6f}\n"
        f"Step 4: Compare QBER_obs ({qber_obs:.6f}) vs T_a ({T_a:.6f})\n"
        f"Step 5: {'ABORT — QBER exceeds authentication threshold.' if detected else 'CONTINUE — QBER below threshold (attack undetected at this intensity).'}"
    )

    math_model = MathematicalModel(
        formula=(
            r"e_{\text{obs}} = e_0 + 0.5 \gamma (1 - 2 e_0), "
            r"\quad \text{abort if } e_{\text{obs}} > T_a"
        ),
        inputs={
            "gamma": gamma,
            "QBER_base (e0)": round(qber_base, 6),
            "T_a": T_a,
        },
        intermediate_calculation=intermediate,
        final_result={
            "QBER_obs": round(qber_obs, 6),
            "detected": detected,
            "threshold_T_a": T_a,
        },
        interpretation=(
            f"At γ = {gamma:.3f}, observed QBER = {qber_obs:.4f}. "
            + (
                f"This exceeds T_a = {T_a:.4f}: session aborted. Eve gains no key material."
                if detected
                else f"This is below T_a = {T_a:.4f}: attack is statistically undetectable at this intensity. "
                     f"Eve must use γ > {(T_a - qber_base) / (0.5 * (1 - 2 * qber_base)):.3f} to be detected."
            )
        ),
    )

    return result_fields, math_model
