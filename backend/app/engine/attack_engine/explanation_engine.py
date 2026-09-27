"""Four-Layer Explanation Engine — Protocol-Isolated Narrative Generator.

Generates protocol-specific four-layer security explanations.
Each helper function is strictly protocol-scoped.  No MDI-QDS text may appear
in a Practical QDS explanation and vice versa.

Layer taxonomy:
  1. Attacker Action         — what the adversary does physically
  2. Physical Effect         — quantum-mechanical / optical consequence
  3. Observable/Statistical  — what verifiers can measure or infer
  4. Security Consequence    — how the protocol detects/blocks, final guarantee
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.schemas.attack_models import FourLayerExplanation


# ─────────────────────────────────────────────────────────────────────────────
# Practical QDS — FR-E1 Forgery
# ─────────────────────────────────────────────────────────────────────────────

def practical_qds_forgery_explanation(
    *,
    epsilon_1: float,
    I_BC: float,
    S_c: float,
    T_v: float,
    M_u: int,
) -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Charlie attempts to forge Alice's signature on a new message without possessing "
            "Alice's original quantum key material K_A. Charlie can only guess the bit strings "
            "sent by Alice to Bob (K_B) using her own correlated share K_C."
        ),
        layer_2_physical_effect=(
            "Because K_B and K_C are generated from independent optical measurements on the same "
            "BB84 channel (Alice → Bob and Alice → Charlie), the mutual information I(B:C) = "
            f"{I_BC:.4f} measures how much Charlie's share reveals about Bob's share. "
            "Quantum no-cloning guarantees that complete knowledge of K_C does not equal K_B."
        ),
        layer_3_observable_effect=(
            f"The minimum conclusive-bit fraction S_c = {S_c:.4f} (derived from the condition "
            f"H(S_c) ≥ 1 − I(B:C)) sets the adversary's best achievable agreement rate with K_B. "
            f"Since S_c = {S_c:.4f} < T_v = {T_v:.4f}, the forged signature produces a bit-string "
            f"disagreement rate that exceeds the verification threshold T_v when checked by Bob."
        ),
        layer_4_security_consequence=(
            f"The Chernoff-bound forgery probability ε₁ = {epsilon_1:.3e} bounds the probability that "
            f"a forgery attempt on {M_u} untested bits passes both Bob's and Charlie's independent "
            "verification checks. This exponentially small probability constitutes the formal "
            "unforgeability guarantee of Practical QDS (Yin, Fu & Chen 2016)."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Practical QDS — FR-E2 Repudiation
# ─────────────────────────────────────────────────────────────────────────────

def practical_qds_repudiation_explanation(
    *,
    epsilon_2: float,
    T_v: float,
    T_a: float,
    delta: float,
    M_u: int,
    n_test: int,
    beta: float,
) -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Alice (the signer) attempts repudiation: she sends a signature that is accepted "
            "by Bob (ACCEPT) but simultaneously tries to prevent Charlie from accepting it, "
            "thereby denying ever having signed the message."
        ),
        layer_2_physical_effect=(
            "Alice's ability to cause an asymmetric outcome requires that Bob and Charlie hold "
            "sufficiently different views of the signed key material. The symmetrization step "
            f"(β = {beta:.2f} test-bit fraction, n_test = {n_test} bits) uses measured QBER "
            "estimates to statistically bound the inter-verifier disagreement. Any asymmetry "
            "Alice can induce is bounded by the threshold gap T_v − T_a − Δ."
        ),
        layer_3_observable_effect=(
            f"The security parameter Δ = {delta:.4f} represents the maximum statistical fluctuation "
            "between Bob's and Charlie's observed QBER estimates. With T_v = {T_v:.4f} and "
            f"T_a = {T_a:.4f}, the effective gap T_v − T_a − Δ = {T_v - T_a - delta:.4f} > 0 "
            "ensures both verifiers are simultaneously satisfied or simultaneously unsatisfied."
        ),
        layer_4_security_consequence=(
            f"The repudiation probability ε₂ = {epsilon_2:.3e} bounds the probability that "
            "Bob accepts while Charlie rejects. This exponential bound is derived from "
            f"the threshold gap ({T_v:.4f} − {T_a:.4f} − {delta:.4f}) = {T_v - T_a - delta:.4f} "
            f"and M_u = {M_u} untested signing bits, giving a formal non-repudiation guarantee."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Practical QDS — FR-E3 Intercept-Resend / Eavesdropping
# ─────────────────────────────────────────────────────────────────────────────

def practical_qds_eavesdropping_explanation(
    *,
    gamma: float,
    qber_base: float,
    qber_obs: float,
    T_a: float,
    detected: bool,
) -> FourLayerExplanation:
    detection_str = "DETECTED — session aborted" if detected else "UNDETECTED (γ too small)"
    return FourLayerExplanation(
        layer_1_attacker_action=(
            f"Eve performs an intercept-resend attack with intensity γ = {gamma:.3f}: "
            f"she intercepts a fraction γ of the quantum pulses on the Alice→Bob or Alice→Charlie "
            "channel, measures in a random basis, and resends her best guess."
        ),
        layer_2_physical_effect=(
            "Each intercepted pulse is projected into Eve's measurement basis. When her basis "
            "mismatches Alice's preparation basis (probability 0.5), Eve resends an orthogonal "
            f"state, introducing bit errors. The base QBER is e₀ = {qber_base:.4f}; "
            f"the additional contribution from interception scales as 0.5γ(1 − 2e₀)."
        ),
        layer_3_observable_effect=(
            f"Observed QBER: e_obs = e₀ + 0.5γ(1 − 2e₀) "
            f"= {qber_base:.4f} + 0.5 × {gamma:.3f} × (1 − 2 × {qber_base:.4f}) "
            f"= {qber_obs:.4f}. "
            f"Authentication threshold T_a = {T_a:.4f}. "
            f"Status: {detection_str}."
        ),
        layer_4_security_consequence=(
            f"{'The observed QBER exceeds T_a, so both Bob and Charlie abort the session before any key material is used for signing. Eve gains zero information about the message. ' if detected else 'The observed QBER is below T_a; the attack is statistically undetectable at this intensity. However, Eve acquires only a γ-fraction of pulses — insufficient to forge or repudiate. Higher-intensity attacks will be detected. '}"
            "This demonstrates the QBER-based security boundary of Practical QDS."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# MDI-QDS — Detector Compromise (qualitative)
# ─────────────────────────────────────────────────────────────────────────────

def mdi_qds_detector_compromise_explanation() -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Eve targets the Bell-state measurement (BSM) detector node at the untrusted "
            "relay. She injects bright laser pulses (detector blinding) or directly compromises "
            "the measurement hardware."
        ),
        layer_2_physical_effect=(
            "In MDI-QDS, Alice and Bob (and Charlie) send optical states toward the relay — they "
            "do NOT perform local measurements on incoming pulses. The relay's BSM results are "
            "classical outcomes (coincidence patterns) that Alice/Bob process classically. "
            "Compromising the detector therefore cannot expose secret key material held by Alice/Bob."
        ),
        layer_3_observable_effect=(
            "Even with the relay fully compromised, Alice's and Bob's key correlations are "
            "established through the joint probability structure of their preparations, not through "
            "local detector outcomes. Anomalous coincidence rates may be observable but do not "
            "cause a silent key compromise."
        ),
        layer_4_security_consequence=(
            "MDI-QDS is SECURE-IMMUNE against all detector side-channel attacks by mathematical "
            "construction (Lo, Curty & Qi 2012). No additional blinding countermeasure is required. "
            "The protocol retains full security guarantees even with a completely untrusted relay node."
        ),
    )


def mdi_qds_forgery_explanation() -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Charlie attempts to forge Alice's signature by manipulating her local BSM outcomes "
            "or by crafting a fake Bell-state announcement."
        ),
        layer_2_physical_effect=(
            "Alice's signed message is bound to the joint BSM coincidence pattern agreed between "
            "Alice and Bob during key distribution. Without Alice's secret preparation basis "
            "choices, a forged BSM announcement produces random parity correlations."
        ),
        layer_3_observable_effect=(
            "Bob's verification check against his own preparation records reveals the discrepancy. "
            "The MDI architecture ensures that the relay cannot be coached to produce valid "
            "coincidence patterns aligned with a forged message."
        ),
        layer_4_security_consequence=(
            "Forgery is rejected by Bob's verification step. MDI-QDS provides unforgeability "
            "against an active adversary controlling the measurement relay. "
            "(Phase 2 qualitative model — quantitative ε₁ bound pending Phase 7.)"
        ),
    )


def mdi_qds_repudiation_explanation() -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Alice attempts repudiation after Bob has accepted her signature, claiming she "
            "never signed the message."
        ),
        layer_2_physical_effect=(
            "The relay's classical BSM log records Alice's photon injection events timestamped "
            "and correlated with Bob's outcomes. Alice cannot alter this log post-facto."
        ),
        layer_3_observable_effect=(
            "Under arbitration, the relay log plus Charlie's independent corroborating "
            "verification form an irrefutable audit trail."
        ),
        layer_4_security_consequence=(
            "Repudiation is blocked by the untrusted-node audit log and Charlie's "
            "cross-verification. MDI-QDS non-repudiation holds even when the relay "
            "is adversarially controlled. (Phase 2 qualitative model.)"
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# OTUH-QDS — qualitative explanations
# ─────────────────────────────────────────────────────────────────────────────

def otuh_qds_forgery_explanation() -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Charlie attempts to forge Alice's OTUH-QDS signature on a different message "
            "without knowing Alice's 384-bit quantum-random one-time seed."
        ),
        layer_2_physical_effect=(
            "The OTUH tag is computed via an ε-strongly universal hash family applied to the "
            "message using the one-time seed. Guessing or reusing the seed requires knowledge "
            "of Alice's quantum-distributed key material."
        ),
        layer_3_observable_effect=(
            "A forged tag computed with a wrong seed produces a hash value that disagrees "
            "with Bob's expected tag with probability ≥ 1 − 2^{−128}."
        ),
        layer_4_security_consequence=(
            "Forgery probability < 2^{-128} under ε-strongly universal hashing. "
            "OTUH-QDS provides computational forgery resistance that is quantitatively bounded "
            "but the Phase 2 implementation only carries the qualitative explanation."
        ),
    )


def otuh_qds_repudiation_explanation() -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Alice signs a document and later denies having signed it, hoping that Bob "
            "and Charlie cannot prove she committed."
        ),
        layer_2_physical_effect=(
            "Alice's 384-bit one-time quantum seed was pre-distributed to Bob and Charlie "
            "before signing. Alice cannot retroactively alter the seed distribution."
        ),
        layer_3_observable_effect=(
            "Both Bob and Charlie independently hold the same seed and can verify the OTUH tag. "
            "Alice's denial is disproved by their independent corroboration."
        ),
        layer_4_security_consequence=(
            "OTUH-QDS pre-distributed seed accountability defeats repudiation. "
            "Alice is bound by the seed she distributed during key generation. "
            "(Phase 2 qualitative model.)"
        ),
    )


def otuh_qds_eavesdropping_explanation(*, resulting_qber: float = 0.38) -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Eve intercepts photons during the 384-bit quantum seed distribution phase "
            "and attempts to extract Alice's one-time seed."
        ),
        layer_2_physical_effect=(
            "Seed distribution uses a BB84-compatible QKD channel. Any interception "
            "introduces measurable QBER on the 384-bit key channel."
        ),
        layer_3_observable_effect=(
            f"Observed QBER ≈ {resulting_qber:.3f} (qualitative estimate). "
            "QBER breach triggers session abort before any message is signed."
        ),
        layer_4_security_consequence=(
            "The QKD-based seed distribution channel provides QBER-based eavesdropping "
            "detection. If QBER exceeds the authentication threshold, the protocol aborts. "
            "Note: the Phase 2 OTUH eavesdropping QBER value is a qualitative placeholder — "
            "a quantitative channel model is pending."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# TF-QDS — qualitative
# ─────────────────────────────────────────────────────────────────────────────

def tf_qds_forgery_explanation() -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Charlie attempts to forge Alice's Twin-Field QDS signature token by "
            "crafting a fake midpoint single-photon interference event announcement."
        ),
        layer_2_physical_effect=(
            "The TF-QDS signature token is bound to a genuine single-photon interference "
            "pattern at the central relay. Without knowledge of Alice's quantum preparation "
            "(phase encoding), a forged interference announcement produces random coincidences."
        ),
        layer_3_observable_effect=(
            "Bob's verification against his own phase preparation records detects the "
            "statistical discrepancy between the forged announcement and the expected "
            "joint interference distribution."
        ),
        layer_4_security_consequence=(
            "TF-QDS rejects forged interference signature tokens. The Twin-Field architecture "
            "inherits QKD-level security against forgery while surpassing the PLOB repeaterless "
            "bound at 500+ km. (Phase 2 qualitative model — quantitative bounds pending.)"
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Decoy-State QDS — PNS (qualitative)
# ─────────────────────────────────────────────────────────────────────────────

def decoy_qds_pns_explanation() -> FourLayerExplanation:
    return FourLayerExplanation(
        layer_1_attacker_action=(
            "Eve performs a Photon Number Splitting (PNS) attack: she blocks all "
            "single-photon pulses and forwards only multi-photon pulses, splitting one "
            "photon to measure later and resending the rest to Bob undetected."
        ),
        layer_2_physical_effect=(
            "For weak coherent pulse sources, the fraction of multi-photon pulses is "
            "Poisson-distributed. Eve's PNS strategy is lossless for multi-photon events, "
            "so she gains full information on those pulses without introducing detectable errors."
        ),
        layer_3_observable_effect=(
            "Decoy-state analysis (μ / ν / ω intensity levels) reveals anomalous gain "
            "ratios: the single-photon gain Q₁ drops relative to expected values while "
            "the multi-photon gain Q₂ remains elevated. This statistical fingerprint "
            "distinguishes PNS from channel loss."
        ),
        layer_4_security_consequence=(
            "The decoy-state protocol detects the PNS attack via gain-ratio anomalies and "
            "aborts the session. Eve learns no useful key material. Decoy-State QDS provides "
            "PNS-immune key distribution. (Phase 2 qualitative model.)"
        ),
    )
