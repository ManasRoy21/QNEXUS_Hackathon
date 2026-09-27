"""Rigorous Statistical Security Bounds Engine — Phase 5.

Implements the four core analytical modes for QDS threat detection:
  1. HOEFFDING: Classical bounded concentration inequality
     P(|X̄ - E[X]| >= ε) <= 2 exp(-2nε²)
  2. CHERNOFF: Multiplicative lower-tail concentration bound
     P(X <= (1-δ)μ) <= exp(-δ² μ / 2)
  3. RANDOM_SAMPLING: Practical QDS test-bit vs untested-bit finite sampling analysis
     ε_sampling <= exp(-2·(Tv - Ta - Δ)²·Mu²·β² / n_test)
  4. PROTOCOL_BOUND: Information-theoretic security equations for Practical QDS
     ε₁ <= exp(-((Sc - Tv)² / 2Sc) · P_C^c · Mu)  [Forgery]
     ε₂ <= exp(-2·(Tv - Ta - Δ)²·Mu²·β² / n_test)  [Repudiation]
     ε_sec = ε₁ + ε₂  [Total Protocol Failure Probability]

Mathematical transparency:
  Every result exposes:
    - INPUTS
    - FORMULA
    - SUBSTITUTION
    - CALCULATION STEPS
    - FINAL BOUND / RESULT
    - INTERPRETATION
    - SCIENTIFIC DISCLAIMER (No fabricated certainty; labels simulation approximations)
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from app.engine.attack_engine.state_store import get as get_sim_state
from app.schemas.analytics_models import (
    StatisticalBoundRequest,
    StatisticalBoundResponse,
)


class StatisticalBoundsEngine:
    """Rigorous analytical engine for statistical confidence & protocol security bounds."""

    DISCLAIMER = (
        "Theoretical analytical model approximation. "
        "Calculated from classical concentration inequalities and finite-key security models. "
        "Does not claim experimental laboratory validation."
    )

    @classmethod
    def calculate(cls, req: StatisticalBoundRequest) -> StatisticalBoundResponse:
        """Route request to the corresponding analytical mode."""
        raw_method = req.method.strip().upper()

        # Handle simulation_id state auto-population if provided
        sim_state = None
        if req.simulation_id:
            sim_state = get_sim_state(req.simulation_id)

        if raw_method in ("HOEFFDING", "HOEFFDING_BOUND"):
            return cls._calc_hoeffding(req, sim_state)
        elif raw_method in ("CHERNOFF", "CHERNOFF_BOUND"):
            return cls._calc_chernoff(req, sim_state)
        elif raw_method in ("RANDOM_SAMPLING", "RANDOM_SAMPLING_ANALYSIS"):
            return cls._calc_random_sampling(req, sim_state)
        elif raw_method in ("FINITE_POPULATION", "SERFLING"):
            return cls._calc_serfling(req)

        elif raw_method in (
            "PROTOCOL_BOUND",
            "PROTOCOL_SECURITY_BOUND",
            "PRACTICAL_QDS",
            "PROTOCOL_PRACTICAL_QDS_FORGERY",
            "PROTOCOL_PRACTICAL_QDS_REPUDIATION",
        ):
            if raw_method == "PROTOCOL_PRACTICAL_QDS_FORGERY":
                return cls._calc_qds_forgery_legacy(req, sim_state)
            if raw_method == "PROTOCOL_PRACTICAL_QDS_REPUDIATION":
                return cls._calc_qds_repudiation_legacy(req, sim_state)
            return cls._calc_protocol_bound(req, sim_state)
        else:
            raise ValueError(
                f"Unknown statistical method '{req.method}'. "
                "Supported modes: 'HOEFFDING', 'CHERNOFF', 'RANDOM_SAMPLING', 'PROTOCOL_BOUND'."
            )

    # ──────────────────────────────────────────────────────────────────────────
    # MODE 1: HOEFFDING INEQUALITY
    # ──────────────────────────────────────────────────────────────────────────
    @classmethod
    def _calc_hoeffding(
        cls, req: StatisticalBoundRequest, sim_state: Any
    ) -> StatisticalBoundResponse:
        """P(|X̄ - E[X]| >= ε) <= 2 exp(-2nε²)."""
        p = req.parameters or {}

        # Resolve sample size n
        n = req.sample_size
        if n is None:
            n = int(p.get("n", p.get("sample_size", 1000)))
        if n < 1:
            raise ValueError("Sample size n must be >= 1 for Hoeffding bound.")

        # Resolve epsilon (deviation)
        epsilon = req.delta
        if epsilon is None:
            epsilon = float(p.get("epsilon", p.get("delta", p.get("t", 0.03))))
        if epsilon <= 0:
            raise ValueError("Epsilon (deviation tolerance) must be > 0.")

        # Resolve observed value (empirical mean X̄)
        observed_val = req.observed_rate
        if observed_val is None:
            if sim_state is not None:
                observed_val = sim_state.measurement_statistics.qber_bob
            else:
                observed_val = float(p.get("observed_value", p.get("observed_rate", 0.015)))

        exponent = -2.0 * n * (epsilon ** 2)
        bound = min(1.0, 2.0 * math.exp(exponent))
        confidence = max(0.0, 1.0 - bound)

        formula = r"P(|X̄ − E[X]| \geq \varepsilon) \leq 2 \exp(-2n\varepsilon^2)"
        substitution = (
            f"P(|X̄ − E[X]| ≥ {epsilon}) ≤ 2 · exp(-2 · {n} · ({epsilon})²)\n"
            f"= 2 · exp({exponent:.6f})"
        )

        steps = [
            f"Step 1: Read sample size n = {n}",
            f"Step 2: Read deviation tolerance ε = {epsilon}",
            f"Step 3: Read empirical observed value X̄ = {observed_val:.6f}",
            f"Step 4: Compute exponent: -2 · n · ε² = -2 · {n} · ({epsilon})² = {exponent:.6f}",
            f"Step 5: Compute exponential factor: exp({exponent:.6f}) = {math.exp(exponent):.6e}",
            f"Step 6: Multiply by two-sided coefficient: bound = 2 · exp({exponent:.6f}) = {bound:.6e}",
            f"Step 7: Compute statistical confidence target: 1 − bound = {confidence:.6%}",
        ]

        ci_low = max(0.0, observed_val - epsilon)
        ci_high = min(1.0, observed_val + epsilon)

        interpretation = (
            f"With sample size n={n} and observed sample mean X̄={observed_val:.4f}, the probability that the "
            f"true expectation E[X] deviates by more than ±{epsilon} is bounded by {bound:.3e}. "
            f"The true mean lies in [{ci_low:.4f}, {ci_high:.4f}] with statistical confidence ≥ {confidence*100:.3f}%. "
            f"Assumes independent identically distributed (i.i.d.) observations."
        )

        inputs = {
            "n": n,
            "epsilon": epsilon,
            "confidence": round(confidence, 6),
            "observed_value": observed_val,
            "confidence_interval": [round(ci_low, 6), round(ci_high, 6)],
        }

        return StatisticalBoundResponse(
            method="HOEFFDING",
            formula=formula,
            inputs=inputs,
            substitution=substitution,
            calculation_steps=steps,
            intermediate_calculation="\n".join(steps),
            result=bound,
            final_bound=bound,
            failure_probability=bound,
            confidence=confidence,
            interpretation=interpretation,
            simulation_id=req.simulation_id,
            scientific_disclaimer=cls.DISCLAIMER,
            details={"n": n, "epsilon": epsilon, "bound": bound, "confidence": confidence},
        )

    # ──────────────────────────────────────────────────────────────────────────
    # MODE 2: CHERNOFF BOUND
    # ──────────────────────────────────────────────────────────────────────────
    @classmethod
    def _calc_chernoff(
        cls, req: StatisticalBoundRequest, sim_state: Any
    ) -> StatisticalBoundResponse:
        """P(X <= (1-δ)μ) <= exp(-δ² μ / 2)."""
        p = req.parameters or {}

        # Resolve mu (expected count)
        mu = None
        if "mu" in p:
            mu = float(p["mu"])
        elif req.sample_size is not None and req.observed_rate is not None:
            mu = req.sample_size * req.observed_rate
        elif sim_state is not None:
            mu = (
                sim_state.measurement_statistics.conclusive_count_bob
                * sim_state.measurement_statistics.qber_bob
            )
        else:
            n_val = req.sample_size or int(p.get("n", 2000))
            p_val = req.observed_rate or float(p.get("p", 0.05))
            mu = n_val * p_val

        if mu <= 0:
            raise ValueError("Expected value μ must be > 0 for Chernoff lower tail bound.")

        # Resolve delta (relative margin)
        delta = req.delta
        if delta is None:
            delta = float(p.get("delta", 0.15))
        if delta <= 0 or delta >= 1.0:
            raise ValueError("Relative deviation parameter δ must satisfy 0 < δ < 1.")

        exponent = - (delta ** 2 * mu) / 2.0
        bound = min(1.0, math.exp(exponent))
        lower_threshold = (1.0 - delta) * mu

        formula = r"P(X \leq (1-\delta)\mu) \leq \exp\left(-\frac{\delta^2 \mu}{2}\right)"
        substitution = (
            f"P(X ≤ (1 - {delta}) · {mu:.2f}) ≤ exp(-({delta}² · {mu:.2f}) / 2)\n"
            f"= exp({exponent:.6f})"
        )

        steps = [
            f"Step 1: Expected event count μ = {mu:.4f}",
            f"Step 2: Relative lower deviation parameter δ = {delta:.4f}",
            f"Step 3: Lower-tail count threshold: (1 - δ) · μ = (1 - {delta:.4f}) · {mu:.4f} = {lower_threshold:.2f}",
            f"Step 4: Compute exponent: -(δ² · μ) / 2 = -({delta:.4f}² · {mu:.4f}) / 2 = {exponent:.6f}",
            f"Step 5: Compute tail bound: exp({exponent:.6f}) = {bound:.6e}",
        ]

        interpretation = (
            f"For an expected event count of μ={mu:.2f}, the probability of observing fewer than "
            f"{lower_threshold:.1f} events (a drop of ≥{delta*100:.1f}%) is bounded by {bound:.3e}. "
            f"Applies to sums of independent Bernoulli random variables."
        )

        inputs = {
            "mu": round(mu, 4),
            "delta": delta,
            "lower_threshold": round(lower_threshold, 2),
        }

        return StatisticalBoundResponse(
            method="CHERNOFF",
            formula=formula,
            inputs=inputs,
            substitution=substitution,
            calculation_steps=steps,
            intermediate_calculation="\n".join(steps),
            result=bound,
            final_bound=bound,
            failure_probability=bound,
            interpretation=interpretation,
            simulation_id=req.simulation_id,
            scientific_disclaimer=cls.DISCLAIMER,
            details={"mu": mu, "delta": delta, "bound": bound},
        )

    # ──────────────────────────────────────────────────────────────────────────
    # MODE 3: RANDOM SAMPLING ANALYSIS (Practical QDS Finite Registers)
    # ──────────────────────────────────────────────────────────────────────────
    @classmethod
    def _calc_random_sampling(
        cls, req: StatisticalBoundRequest, sim_state: Any
    ) -> StatisticalBoundResponse:
        """Practical QDS random-sampling analysis using Ta, Tv, Delta, beta, n_test, Mu.

        Formula:
          ε_sampling <= exp(-2·(Tv - Ta - Δ)²·Mu²·β² / n_test)
        """
        p = req.parameters or {}

        # Resolve parameters from state or inputs
        Ta = float(p.get("Ta", p.get("authentication_threshold", 0.0150)))
        Tv = float(p.get("Tv", p.get("verification_threshold", 0.0645)))
        Delta = float(p.get("Delta", p.get("delta", req.delta if req.delta is not None else 0.0050)))
        beta = float(p.get("beta", 0.30))

        # Pull from simulation state if available
        if sim_state is not None:
            Ta = sim_state.configuration.authentication_threshold
            Tv = sim_state.configuration.verification_threshold
            beta = sim_state.configuration.beta

        # Untested bits Mu
        Mu = None
        if "Mu" in p or "M_u" in p:
            Mu = int(p.get("Mu", p.get("M_u")))
        elif req.sample_size is not None and req.sample_size > 0:
            Mu = req.sample_size
        elif sim_state is not None:
            if hasattr(sim_state, "material") and hasattr(sim_state.material, "untested_bits"):
                Mu = int(sim_state.material.untested_bits.get("M_u_bob", 1500))
            else:
                Mu = 1500
        else:
            Mu = 1500

        # Test bits n_test
        n_test = None
        if "n_test" in p:
            n_test = int(p["n_test"])
        elif sim_state is not None:
            if hasattr(sim_state, "material") and hasattr(sim_state.material, "test_bits"):
                n_test = int(sim_state.material.test_bits.get("n_test_bob", int(Mu * beta / (1.0 - beta))))
            else:
                n_test = max(1, int(Mu * beta / (1.0 - beta))) if beta < 1.0 else 500
        else:
            n_test = max(1, int(Mu * beta / (1.0 - beta))) if beta < 1.0 else 500


        gap = Tv - Ta - Delta
        if gap <= 0:
            exponent = 0.0
            bound = 1.0
            gap_note = f"Warning: Effective threshold gap (Tv - Ta - Δ) = {gap:.4f} <= 0. No security guarantee."
        elif n_test <= 0 or Mu <= 0:
            exponent = 0.0
            bound = 1.0
            gap_note = "Warning: Zero sample size. Bound is trivial (1.0)."
        else:
            # Exponent: -2 * (gap)^2 * Mu^2 * beta^2 / n_test
            exponent = -2.0 * (gap ** 2) * (Mu ** 2) * (beta ** 2) / float(n_test)
            bound = min(1.0, math.exp(exponent))
            gap_note = f"Effective threshold gap (Tv - Ta - Δ) = {gap:.4f} > 0."

        formula = r"\varepsilon_{\text{sampling}} \leq \exp\left(-\frac{2(T_v - T_a - \Delta)^2 M_u^2 \beta^2}{n_{\text{test}}}\right)"
        substitution = (
            f"ε_sampling ≤ exp(-2 · ({Tv:.4f} - {Ta:.4f} - {Delta:.4f})² · ({Mu})² · ({beta:.2f})² / {n_test})\n"
            f"= exp({exponent:.6f})"
        )

        steps = [
            f"Step 1: Read authentication threshold Ta = {Ta:.4f}",
            f"Step 2: Read verification threshold Tv = {Tv:.4f}",
            f"Step 3: Read statistical margin parameter Δ = {Delta:.4f}",
            f"Step 4: Compute effective threshold gap: Tv − Ta − Δ = {Tv:.4f} − {Ta:.4f} − {Delta:.4f} = {gap:.4f}",
            f"Step 5: Read untested signature register Mu = {Mu} bits and sampling fraction β = {beta:.2f}",
            f"Step 6: Read test-bit sample size n_test = {n_test} bits",
            f"Step 7: Compute exponent: -2 · ({gap:.4f})² · ({Mu})² · ({beta:.2f})² / {n_test} = {exponent:.6f}",
            f"Step 8: Compute random-sampling bound: exp({exponent:.6f}) = {bound:.6e}",
        ]

        interpretation = (
            f"Practical QDS finite-size random sampling bound ε_sampling ≤ {bound:.3e}. "
            f"{gap_note} When Alice attempts to forge or repudiate, the probability that the error "
            f"mismatch discrepancy between Bob's test bits (n_test={n_test}) and the untested signature "
            f"register (Mu={Mu}) exceeds the threshold margin is bounded by {bound:.3e}. "
            f"Analytical model based on Yin, Fu & Chen sampling without replacement."
        )

        inputs = {
            "Ta": Ta,
            "Tv": Tv,
            "Delta": Delta,
            "beta": beta,
            "n_test": n_test,
            "Mu": Mu,
            "effective_gap": round(gap, 6),
        }

        return StatisticalBoundResponse(
            method="RANDOM_SAMPLING",
            formula=formula,
            inputs=inputs,
            substitution=substitution,
            calculation_steps=steps,
            intermediate_calculation="\n".join(steps),
            result=bound,
            final_bound=bound,
            failure_probability=bound,
            interpretation=interpretation,
            simulation_id=req.simulation_id,
            scientific_disclaimer=cls.DISCLAIMER,
            details={
                "Ta": Ta,
                "Tv": Tv,
                "Delta": Delta,
                "beta": beta,
                "n_test": n_test,
                "Mu": Mu,
                "bound": bound,
            },
        )

    # ──────────────────────────────────────────────────────────────────────────
    # MODE 4: PROTOCOL BOUND (Practical QDS Complete Information-Theoretic Equations)
    # ──────────────────────────────────────────────────────────────────────────
    @classmethod
    def _calc_protocol_bound(
        cls, req: StatisticalBoundRequest, sim_state: Any
    ) -> StatisticalBoundResponse:
        """Protocol security equations for Practical QDS:

        1. Forgery bound (ε₁):
           ε₁ <= exp(-((Sc - Tv)² / 2Sc) · P_C^c · Mu)
        2. Repudiation bound (ε₂):
           ε₂ <= exp(-2·(Tv - Ta - Δ)²·Mu²·β² / n_test)
        3. Overall Security Failure Probability (ε_sec):
           ε_sec = ε₁ + ε₂
        """
        p = req.parameters or {}

        # ── Protocol Parameters ──
        Sc = float(p.get("Sc", p.get("S_c", 0.4900)))
        Tv = float(p.get("Tv", p.get("verification_threshold", 0.0645)))
        Ta = float(p.get("Ta", p.get("authentication_threshold", 0.0150)))
        Delta = float(p.get("Delta", p.get("delta", req.delta if req.delta is not None else 0.0050)))
        P_C_c = float(p.get("P_C_c", 0.2000))
        beta = float(p.get("beta", 0.30))

        # Pull from simulation state if available
        if sim_state is not None:
            if hasattr(sim_state, "trace") and isinstance(sim_state.trace, dict):
                Sc = float(sim_state.trace.get("min_conclusive_error_bound", sim_state.trace.get("S_c", Sc)))
            Tv = sim_state.configuration.verification_threshold
            Ta = sim_state.configuration.authentication_threshold
            beta = sim_state.configuration.beta
            pulse_cnt = sim_state.configuration.pulse_count
            if pulse_cnt > 0:
                P_C_c = sim_state.measurement_statistics.conclusive_count_charlie / float(pulse_cnt)

        # Untested bits Mu
        Mu = None
        if "Mu" in p or "M_u" in p:
            Mu = int(p.get("Mu", p.get("M_u")))
        elif req.sample_size is not None and req.sample_size > 0:
            Mu = req.sample_size
        elif sim_state is not None:
            if hasattr(sim_state, "material") and hasattr(sim_state.material, "untested_bits"):
                Mu = int(sim_state.material.untested_bits.get("M_u_bob", 1500))
            else:
                Mu = 1500
        else:
            Mu = 1500

        # Test bits n_test
        n_test = None
        if "n_test" in p:
            n_test = int(p["n_test"])
        elif sim_state is not None:
            if hasattr(sim_state, "material") and hasattr(sim_state.material, "test_bits"):
                n_test = int(sim_state.material.test_bits.get("n_test_bob", int(Mu * beta / (1.0 - beta))))
            else:
                n_test = max(1, int(Mu * beta / (1.0 - beta))) if beta < 1.0 else 500
        else:
            n_test = max(1, int(Mu * beta / (1.0 - beta))) if beta < 1.0 else 500


        # ── 1. Forgery Bound ε₁ ──
        if Sc > Tv and Mu > 0 and Sc > 0:
            exp1 = -((Sc - Tv) ** 2 / (2.0 * Sc)) * P_C_c * Mu
            eps_1 = min(1.0, math.exp(exp1))
        else:
            exp1 = 0.0
            eps_1 = 1.0

        # ── 2. Repudiation Bound ε₂ ──
        gap = Tv - Ta - Delta
        if gap > 0 and n_test > 0 and Mu > 0:
            exp2 = -2.0 * (gap ** 2) * (Mu ** 2) * (beta ** 2) / float(n_test)
            eps_2 = min(1.0, math.exp(exp2))
        else:
            exp2 = 0.0
            eps_2 = 1.0

        # ── 3. Combined Security Failure Probability ε_sec ──
        eps_sec = min(1.0, eps_1 + eps_2)

        formula = (
            r"\varepsilon_1 \leq \exp\left(-\frac{(S_c - T_v)^2}{2 S_c} \cdot P_C^c \cdot M_u\right), \quad "
            r"\varepsilon_2 \leq \exp\left(-\frac{2(T_v - T_a - \Delta)^2 M_u^2 \beta^2}{n_{\text{test}}}\right), \quad "
            r"\varepsilon_{\text{sec}} = \varepsilon_1 + \varepsilon_2"
        )

        substitution = (
            f"ε₁ ≤ exp(-(({Sc:.4f} - {Tv:.4f})² / (2 · {Sc:.4f})) · {P_C_c:.4f} · {Mu}) = exp({exp1:.6f}) = {eps_1:.4e}\n"
            f"ε₂ ≤ exp(-2 · ({Tv:.4f} - {Ta:.4f} - {Delta:.4f})² · ({Mu})² · ({beta:.2f})² / {n_test}) = exp({exp2:.6f}) = {eps_2:.4e}\n"
            f"ε_sec = ε₁ + ε₂ = {eps_1:.4e} + {eps_2:.4e} = {eps_sec:.4e}"
        )

        steps = [
            f"Step 1 (Inputs): Sc={Sc:.4f}, Tv={Tv:.4f}, Ta={Ta:.4f}, Δ={Delta:.4f}, Mu={Mu}, n_test={n_test}, P_C^c={P_C_c:.4f}",
            f"Step 2 (Forgery Gap): Sc − Tv = {Sc:.4f} − {Tv:.4f} = {Sc - Tv:.4f}",
            f"Step 3 (Forgery Exponent): -((Sc - Tv)² / 2Sc) · P_C^c · Mu = {exp1:.6f}",
            f"Step 4 (Forgery Bound): ε₁ = exp({exp1:.6f}) = {eps_1:.6e}",
            f"Step 5 (Repudiation Gap): Tv − Ta − Δ = {gap:.4f}",
            f"Step 6 (Repudiation Exponent): -2(Tv - Ta - Δ)² · Mu² · β² / n_test = {exp2:.6f}",
            f"Step 7 (Repudiation Bound): ε₂ = exp({exp2:.6f}) = {eps_2:.6e}",
            f"Step 8 (Total Failure): ε_sec = ε₁ + ε₂ = {eps_1:.6e} + {eps_2:.6e} = {eps_sec:.6e}",
        ]

        interpretation = (
            f"Practical QDS finite-key protocol security evaluation: "
            f"Existential Forgery Bound ε₁ ≤ {eps_1:.3e}; Signer Repudiation Bound ε₂ ≤ {eps_2:.3e}; "
            f"Combined Security Failure Probability ε_sec ≤ {eps_sec:.3e}. "
            f"Guarantees that a signature on message m is unforgeable and transferable with "
            f"probability ≥ 1 − ε_sec. Derived from the Yin, Fu & Chen information-theoretic model."
        )

        inputs = {
            "Sc": Sc,
            "Tv": Tv,
            "Ta": Ta,
            "Delta": Delta,
            "P_C_c": P_C_c,
            "Mu": Mu,
            "beta": beta,
            "n_test": n_test,
        }

        details = {
            "forgery_bound": eps_1,
            "repudiation_bound": eps_2,
            "security_failure_probability": eps_sec,
            "eps_1": eps_1,
            "eps_2": eps_2,
            "eps_sec": eps_sec,
        }

        return StatisticalBoundResponse(
            method="PROTOCOL_BOUND",
            formula=formula,
            inputs=inputs,
            substitution=substitution,
            calculation_steps=steps,
            intermediate_calculation="\n".join(steps),
            result=eps_sec,
            final_bound=eps_sec,
            failure_probability=eps_sec,
            interpretation=interpretation,
            simulation_id=req.simulation_id,
            scientific_disclaimer=cls.DISCLAIMER,
            details=details,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # LEGACY / BACKWARDS-COMPATIBILITY HANDLERS
    # ──────────────────────────────────────────────────────────────────────────
    @classmethod
    def _calc_qds_forgery_legacy(
        cls, req: StatisticalBoundRequest, sim_state: Any
    ) -> StatisticalBoundResponse:
        full = cls._calc_protocol_bound(req, sim_state)
        eps_1 = full.details["forgery_bound"]
        return StatisticalBoundResponse(
            method="PROTOCOL_PRACTICAL_QDS_FORGERY",
            formula=r"\varepsilon_1 \leq \exp\left(-\frac{(S_c - T_v)^2}{2 S_c} \cdot P_C^c \cdot M_u\right)",
            inputs=full.inputs,
            substitution=full.substitution.split("\n")[0],
            calculation_steps=full.calculation_steps[:4],
            intermediate_calculation="\n".join(full.calculation_steps[:4]),
            result=eps_1,
            final_bound=eps_1,
            failure_probability=eps_1,
            interpretation=f"Practical QDS forgery bound ε₁ ≤ {eps_1:.3e}.",
            simulation_id=req.simulation_id,
            scientific_disclaimer=cls.DISCLAIMER,
            details=full.details,
        )

    @classmethod
    def _calc_qds_repudiation_legacy(
        cls, req: StatisticalBoundRequest, sim_state: Any
    ) -> StatisticalBoundResponse:
        full = cls._calc_protocol_bound(req, sim_state)
        eps_2 = full.details["repudiation_bound"]
        return StatisticalBoundResponse(
            method="PROTOCOL_PRACTICAL_QDS_REPUDIATION",
            formula=r"\varepsilon_2 \leq \exp\left(-\frac{2(T_v - T_a - \Delta)^2 M_u^2 \beta^2}{n_{\text{test}}}\right)",
            inputs=full.inputs,
            substitution=full.substitution.split("\n")[1],
            calculation_steps=full.calculation_steps[4:7],
            intermediate_calculation="\n".join(full.calculation_steps[4:7]),
            result=eps_2,
            final_bound=eps_2,
            failure_probability=eps_2,
            interpretation=f"Practical QDS repudiation bound ε₂ ≤ {eps_2:.3e}.",
            simulation_id=req.simulation_id,
            scientific_disclaimer=cls.DISCLAIMER,
            details=full.details,
        )

    @classmethod
    def _calc_serfling(cls, req: StatisticalBoundRequest) -> StatisticalBoundResponse:
        """Serfling bound for sampling without replacement from a finite population."""
        n = req.sample_size or 500
        N = req.population_size if req.population_size is not None else (n * 3)
        if n >= N:
            raise ValueError(f"Sample size n ({n}) cannot exceed population size N ({N}).")
        delta = req.delta if req.delta is not None else 0.02
        t = float(delta)

        # Serfling factor: (1 - (n-1)/N)
        f_n = 1.0 - (n - 1) / float(N)
        exponent = -2.0 * n * (t ** 2) / f_n
        fail_prob = min(1.0, 2.0 * math.exp(exponent))

        formula = r"P(|f_n - F_N| \geq t) \leq 2 \exp\left(-\frac{2 n t^2}{1 - (n-1)/N}\right)"
        steps = [
            f"Step 1: Sample size n = {n}, Population N = {N}",
            f"Step 2: Finite population correction factor 1 - (n-1)/N = {f_n:.6f}",
            f"Step 3: Deviation tolerance t = {t}",
            f"Step 4: Exponent = -2 * n * t^2 / factor = {exponent:.6f}",
            f"Step 5: Failure probability = {fail_prob:.4e}",
        ]
        interpretation = (
            f"Sampling {n} items without replacement from a population of {N} ensures the sample "
            f"frequency is within ±{t} of the true population frequency with failure probability ≤ {fail_prob:.3e}."
        )

        return StatisticalBoundResponse(
            method="FINITE_POPULATION",
            formula=formula,
            inputs={"sample_size_n": n, "population_size_N": N, "tolerance_t": t, "serfling_factor": f_n},
            substitution=f"P(|f_n - F_N| ≥ {t}) ≤ 2 exp(-2·{n}·({t})² / {f_n:.4f}) = {fail_prob:.4e}",
            calculation_steps=steps,
            intermediate_calculation="\n".join(steps),
            final_bound=t,
            failure_probability=fail_prob,
            result=fail_prob,
            interpretation=interpretation,
            scientific_disclaimer=cls.DISCLAIMER,
        )

