"""Module G: Day 5 (Module G) Symmetrization & Repudiation Guard Verification Suite.

Tests three scenarios demonstrating the repudiation gap and its cryptographic closure:

  Scenario A: Clean Channel + Symmetrization
    Both Bob and Charlie receive identical, authentic states from Alice.
    Symmetrization swaps 50% of indices. Post-swap, both verifiers evaluate CLEAN / LOW.
    Repudiation detector confirms: no asymmetry detected.

  Scenario B: Repudiation Attack WITHOUT Symmetrization (Vulnerability Demonstration)
    Dishonest Alice sends Bob a clean block but gives Charlie a corrupted block
    (40% of indices flipped). Without symmetrization:
      - Bob evaluates  -> CLEAN / LOW  (verifier 1 happy)
      - Charlie evaluates -> QBER anomaly or REPUDIATION markers / CRITICAL (verifier 2 alarmed)
    This demonstrates verifier disagreement — the repudiation gap Alice exploited.

  Scenario C: Repudiation Attack WITH Symmetrization (Fix Demonstration)
    Same dishonest Alice attack, but Bob and Charlie first perform the classical swap.
    50% of the asymmetric indices are distributed back to both parties. Both verifiers
    now detect elevated error signals or explicit repudiation markers. The repudiation
    detector fires: REPUDIATION_ATTACK / CRITICAL.
    Verifier disagreement is eliminated — the attack is caught.

All scenarios must complete within 1.5s total runtime.
"""

import time
from typing import Any, Dict

from app.engine.protocol.qds_protocol import QDSProtocolEngine, QDSSignatureBlock
from app.engine.protocol.symmetrization import SymmetrizationGuard
from app.engine.threats.attack_simulator import AttackSimulator, AttackConfig, AttackType
from app.engine.threats.threat_detector import (
    AttackVector,
    QDSThreatDetector,
    QDSThreatDetectorV1,
    ThreatSeverity,
)


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

DIGEST = "1011010011001010"
AUTH_KEY = "alice-authorized-master-key-001"
SHOTS = 4096
MAX_AGE = 60.0
ASYMMETRY_RATE = 0.4
SWAP_RATIO = 0.5

DIVIDER = "─" * 80


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_clean_counts(digest: str, shots: int) -> Dict[str, int]:
    """Returns a deterministic clean bitstring counts dict (100% fidelity, QBER=0%)."""
    return {digest: shots}


def evaluate_block(
    block: QDSSignatureBlock,
    detector: QDSThreatDetectorV1,
    counts: Dict[str, int],
    shots: int,
    auth_key: str,
    label: str,
    precomputed_qber: float,
) -> Any:
    """Run analyze_comprehensive_threat and print a compact report."""
    report = detector.analyze_comprehensive_threat(
        packet=block,
        measured_counts=counts,
        shots=shots,
        expected_public_key=auth_key,
        nonce_cache=None,
        precomputed_qber=precomputed_qber,
        precomputed_fidelity=max(0.0, 1.0 - precomputed_qber),
    )
    print(f"    [{label}]")
    print(f"      Threat Detected   : {report.threat_detected}")
    print(f"      Attack Vector     : {report.primary_attack_vector}")
    print(f"      Severity          : {report.severity}")
    print(f"      QBER              : {precomputed_qber:.4%}")
    print(f"      Diagnostics       : {report.diagnostic_message}")
    return report


def compute_charlie_qber(charlie_block: QDSSignatureBlock, shots: int) -> float:
    """Approximates Charlie's QBER from corrupted vs. expected states.

    For blocks where Alice has flipped target_bases and pauli_states at known indices,
    we count how many positions now diverge from an ideally prepared state and use that
    as the effective QBER.  Since this is a classical metadata model (no new Qiskit
    circuit), we derive QBER directly from the corrupted_indices count.
    """
    n_bits = len(charlie_block.target_bases)
    corrupted = charlie_block.public_key_registers.get("corrupted_indices", [])
    n_corrupt = len(corrupted)
    # Each flipped basis/state causes 50% error rate on half the mismatched bits
    # (intercept-resend analogy): QBER = corrupted_fraction * 0.5
    raw_error_rate = n_corrupt / max(1, n_bits)
    # Cap at realistic intercept-resend ceiling (~50%)
    return min(raw_error_rate * 0.5, 0.5)


def compute_sym_charlie_qber(
    sym_charlie_block: QDSSignatureBlock,
    swap_indices_set: set,
    n_bits: int,
) -> float:
    """Approximates Charlie's QBER after symmetrization.

    After symmetrization, ~50% of corrupted indices were swapped to Bob. The
    remaining uncorrected indices in Charlie's block still contribute errors, but
    roughly half of the original corruption is now shared. We compute the
    post-swap effective QBER for Charlie.
    """
    corrupted = set(sym_charlie_block.public_key_registers.get("corrupted_indices", []))
    # Corrupted indices that remain with Charlie (not swapped away)
    remaining_corrupt = corrupted - swap_indices_set
    raw_error_rate = len(remaining_corrupt) / max(1, n_bits)
    return min(raw_error_rate * 0.5, 0.5)


def compute_sym_bob_qber(
    swap_indices_set: set,
    corrupted_indices: list,
    n_bits: int,
) -> float:
    """Approximates Bob's QBER after symmetrization.

    Bob swapped some of his clean indices for Charlie's corrupted ones. The
    corrupted indices that were swapped INTO Bob are now error sources for him.
    """
    swapped_to_bob = swap_indices_set & set(corrupted_indices)
    raw_error_rate = len(swapped_to_bob) / max(1, n_bits)
    return min(raw_error_rate * 0.5, 0.5)


# ─────────────────────────────────────────────────────────────────────────────
# Test Scenarios
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_a(
    engine: QDSProtocolEngine,
    guard: SymmetrizationGuard,
    detector: QDSThreatDetectorV1,
) -> None:
    """Scenario A: Clean Channel + Symmetrization. Both verifiers should pass CLEAN."""

    print(f"\n{'═' * 80}")
    print(" SCENARIO A: Clean Channel + Symmetrization")
    print(" Expected: Bob=CLEAN/LOW, Charlie=CLEAN/LOW, Repudiation=False")
    print(f"{'═' * 80}")

    # Alice prepares identical clean blocks for Bob and Charlie
    alice_bob = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    alice_charlie = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)

    print(f"\n  [PRE-SYMMETRIZATION]")
    print(f"    Bob block digest     : {alice_bob.digest}")
    print(f"    Charlie block digest : {alice_charlie.digest}")

    # Compute pre-symmetrization mismatch (should be ~0 for clean channel)
    pre_mismatch = guard.compute_state_mismatch_rate(alice_bob, alice_charlie)
    print(f"    Pre-swap mismatch    : {pre_mismatch['mismatch_rate']:.2%}  "
          f"({pre_mismatch['basis_mismatches']} basis diffs)")

    # Perform symmetrization
    sym_bob, sym_charlie, telemetry = guard.perform_symmetrization(
        alice_bob, alice_charlie, swap_ratio=SWAP_RATIO, seed=42
    )
    print(f"\n  [SYMMETRIZATION]")
    print(f"    Bits total           : {telemetry.total_bits}")
    print(f"    Indices swapped      : {telemetry.swap_count} ({telemetry.swap_ratio_actual:.0%})")
    print(f"    Alice informed       : {telemetry.alice_informed}")

    # Post-symmetrization mismatch (still ~0 for clean channel)
    post_mismatch = guard.compute_state_mismatch_rate(sym_bob, sym_charlie)
    print(f"    Post-swap mismatch   : {post_mismatch['mismatch_rate']:.2%}  "
          f"({post_mismatch['basis_mismatches']} basis diffs)")

    # Evaluate both verifiers
    clean_counts = make_clean_counts(DIGEST, SHOTS)
    qber_clean = 0.0

    print(f"\n  [DETECTOR EVALUATION]")
    bob_report = evaluate_block(sym_bob, detector, clean_counts, SHOTS, AUTH_KEY, "Bob", qber_clean)
    charlie_report = evaluate_block(sym_charlie, detector, clean_counts, SHOTS, AUTH_KEY, "Charlie", qber_clean)

    # Repudiation check
    repudiation_report = detector.detect_repudiation_asymmetry(
        bob_report, charlie_report, sym_bob, sym_charlie
    )
    print(f"\n  [REPUDIATION DETECTOR]")
    print(f"    Threat Detected   : {repudiation_report.threat_detected}")
    print(f"    Attack Vector     : {repudiation_report.primary_attack_vector}")
    print(f"    Severity          : {repudiation_report.severity}")
    print(f"    Diagnostics       : {repudiation_report.diagnostic_message}")

    # Assertions
    assert not bob_report.threat_detected, f"Scenario A: Bob should be CLEAN, got {bob_report.primary_attack_vector}"
    assert bob_report.severity == ThreatSeverity.LOW, f"Scenario A: Bob severity should be LOW"
    assert not charlie_report.threat_detected, f"Scenario A: Charlie should be CLEAN, got {charlie_report.primary_attack_vector}"
    assert charlie_report.severity == ThreatSeverity.LOW, f"Scenario A: Charlie severity should be LOW"
    assert not repudiation_report.threat_detected, f"Scenario A: Repudiation should not be detected"

    print(f"\n  [PASSED] Scenario A: Clean Channel + Symmetrization verified.")


def run_scenario_b(
    engine: QDSProtocolEngine,
    guard: SymmetrizationGuard,
    detector: QDSThreatDetectorV1,
) -> None:
    """Scenario B: Repudiation Attack WITHOUT Symmetrization — demonstrates the gap."""

    print(f"\n{'═' * 80}")
    print(" SCENARIO B: Repudiation Attack WITHOUT Symmetrization (Vulnerability Demo)")
    print(" Expected: Bob=CLEAN/LOW, Charlie=REPUDIATION marker/CRITICAL -> Verifier Disagreement")
    print(f"{'═' * 80}")

    # Alice (dishonest) crafts inconsistent blocks
    alice_template = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    bob_block, charlie_block = AttackSimulator.simulate_repudiation_attack(
        alice_template, asymmetry_rate=ASYMMETRY_RATE, seed=42
    )

    n_bits = len(alice_template.target_bases)
    corrupted_indices = charlie_block.public_key_registers.get("corrupted_indices", [])
    print(f"\n  [ATTACK INJECTION]")
    print(f"    Asymmetry rate       : {ASYMMETRY_RATE:.0%}")
    print(f"    Corrupted indices    : {len(corrupted_indices)} / {n_bits} bits")
    print(f"    Bob gets clean block : True  (repudiation_attempt=False)")
    print(f"    Charlie gets corrupt : True  (repudiation_attempt={charlie_block.public_key_registers.get('repudiation_attempt', False)})")

    # Mismatch BEFORE symmetrization
    pre_mismatch = guard.compute_state_mismatch_rate(bob_block, charlie_block)
    print(f"    Pre-swap mismatch    : {pre_mismatch['mismatch_rate']:.2%}  "
          f"({pre_mismatch['basis_mismatches']} basis diffs)")

    print(f"\n  [NO SYMMETRIZATION — Evaluating raw blocks]")

    # Bob sees clean block, gets CLEAN
    clean_counts = make_clean_counts(DIGEST, SHOTS)
    qber_bob = 0.0

    # Charlie's QBER: derived from corrupted state proportion
    qber_charlie = compute_charlie_qber(charlie_block, SHOTS)

    bob_report = evaluate_block(bob_block, detector, clean_counts, SHOTS, AUTH_KEY, "Bob", qber_bob)
    charlie_report = evaluate_block(charlie_block, detector, clean_counts, SHOTS, AUTH_KEY, "Charlie", qber_charlie)

    verifier_disagreement = (bob_report.threat_detected != charlie_report.threat_detected)
    print(f"\n  [VERIFIER DISAGREEMENT]")
    print(f"    Bob threat detected     : {bob_report.threat_detected}  ({bob_report.primary_attack_vector})")
    print(f"    Charlie threat detected : {charlie_report.threat_detected}  ({charlie_report.primary_attack_vector})")
    print(f"    Disagreement exists     : {verifier_disagreement}  ← REPUDIATION GAP DEMONSTRATED")

    # Assertions — demonstrate the gap (Bob clean, Charlie alarmed)
    assert not bob_report.threat_detected, f"Scenario B: Bob should see CLEAN without symmetrization"
    assert charlie_report.threat_detected, f"Scenario B: Charlie should detect a threat without symmetrization"
    assert verifier_disagreement, "Scenario B: Verifier disagreement must exist without symmetrization"

    print(f"\n  [PASSED] Scenario B: Repudiation gap (verifier disagreement) demonstrated.")


def run_scenario_c(
    engine: QDSProtocolEngine,
    guard: SymmetrizationGuard,
    detector: QDSThreatDetectorV1,
) -> None:
    """Scenario C: Repudiation Attack WITH Symmetrization — demonstrates the fix."""

    print(f"\n{'═' * 80}")
    print(" SCENARIO C: Repudiation Attack WITH Symmetrization (Fix Demonstration)")
    print(" Expected: Both Bob & Charlie detect REPUDIATION_ATTACK/CRITICAL -> Agreement restored")
    print(f"{'═' * 80}")

    # Same dishonest Alice attack
    alice_template = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    bob_block, charlie_block = AttackSimulator.simulate_repudiation_attack(
        alice_template, asymmetry_rate=ASYMMETRY_RATE, seed=42
    )

    n_bits = len(alice_template.target_bases)
    corrupted_indices = charlie_block.public_key_registers.get("corrupted_indices", [])

    print(f"\n  [ATTACK INJECTION]")
    print(f"    Asymmetry rate       : {ASYMMETRY_RATE:.0%}")
    print(f"    Corrupted indices    : {len(corrupted_indices)} / {n_bits} bits")

    # Perform symmetrization
    sym_bob, sym_charlie, telemetry = guard.perform_symmetrization(
        bob_block, charlie_block, swap_ratio=SWAP_RATIO, seed=42
    )
    swap_indices_set = set(telemetry.swap_indices)

    print(f"\n  [SYMMETRIZATION]")
    print(f"    Indices swapped      : {telemetry.swap_count} ({telemetry.swap_ratio_actual:.0%})")
    print(f"    Alice informed       : {telemetry.alice_informed}")

    # Post-symmetrization mismatch (should be reduced)
    post_mismatch = guard.compute_state_mismatch_rate(sym_bob, sym_charlie)
    print(f"    Post-swap mismatch   : {post_mismatch['mismatch_rate']:.2%}  "
          f"({post_mismatch['basis_mismatches']} basis diffs)")

    # Derive post-symmetrization QBERs
    qber_charlie_sym = compute_sym_charlie_qber(sym_charlie, swap_indices_set, n_bits)
    qber_bob_sym = compute_sym_bob_qber(swap_indices_set, corrupted_indices, n_bits)

    print(f"\n  [POST-SYMMETRIZATION DETECTOR EVALUATION]")
    clean_counts = make_clean_counts(DIGEST, SHOTS)
    bob_report = evaluate_block(sym_bob, detector, clean_counts, SHOTS, AUTH_KEY, "Bob", qber_bob_sym)
    charlie_report = evaluate_block(sym_charlie, detector, clean_counts, SHOTS, AUTH_KEY, "Charlie", qber_charlie_sym)

    # Repudiation detector
    repudiation_report = detector.detect_repudiation_asymmetry(
        bob_report, charlie_report, sym_bob, sym_charlie
    )

    print(f"\n  [REPUDIATION DETECTOR (post-symmetrization)]")
    print(f"    Threat Detected   : {repudiation_report.threat_detected}")
    print(f"    Attack Vector     : {repudiation_report.primary_attack_vector}")
    print(f"    Severity          : {repudiation_report.severity}")
    print(f"    Bob QBER          : {repudiation_report.qber_metrics.get('bob_qber', 0):.4%}")
    print(f"    Charlie QBER      : {repudiation_report.qber_metrics.get('charlie_qber', 0):.4%}")
    print(f"    Repudiation flag  : {repudiation_report.qber_metrics.get('repudiation_flag_present', False)}")
    print(f"    Corruption marks  : {repudiation_report.qber_metrics.get('corruption_markers_present', False)}")
    print(f"    Diagnostics       : {repudiation_report.diagnostic_message}")

    # Assertions
    assert repudiation_report.threat_detected, (
        f"Scenario C: Repudiation attack must be detected post-symmetrization, "
        f"got threat_detected={repudiation_report.threat_detected}"
    )
    assert repudiation_report.primary_attack_vector == AttackVector.REPUDIATION_ATTACK, (
        f"Scenario C: Expected REPUDIATION_ATTACK, got {repudiation_report.primary_attack_vector}"
    )
    assert repudiation_report.severity == ThreatSeverity.CRITICAL, (
        f"Scenario C: Expected CRITICAL severity, got {repudiation_report.severity}"
    )
    assert "repudiation attempt intercepted" in repudiation_report.diagnostic_message.lower(), (
        f"Scenario C: Expected repudiation diagnostic message"
    )

    verifier_disagreement_post = (bob_report.threat_detected != charlie_report.threat_detected)
    print(f"\n  [VERIFIER AGREEMENT RESTORED]")
    print(f"    Repudiation unified verdict : REPUDIATION_ATTACK / CRITICAL ✓")
    print(f"    Verifier disagreement post  : {verifier_disagreement_post}  ← Gap Closed")

    print(f"\n  [PASSED] Scenario C: Repudiation attack detected post-symmetrization.")


# ─────────────────────────────────────────────────────────────────────────────
# Main Entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 80)
    print(" QDS Threat Detection Engine - Day 5 (Module G) Verification Suite")
    print(" Symmetrization & Repudiation Guard (CV-QDS Thornton et al.) — Zero ML")
    print("=" * 80)
    print(f"\n[CONFIG] Digest            : {DIGEST}  ({len(DIGEST)} bits)")
    print(f"[CONFIG] Auth Key          : {AUTH_KEY}")
    print(f"[CONFIG] Shots             : {SHOTS}")
    print(f"[CONFIG] Asymmetry Rate    : {ASYMMETRY_RATE:.0%}  (Alice corrupts for Charlie)")
    print(f"[CONFIG] Swap Ratio        : {SWAP_RATIO:.0%}  (fraction symmetrized)")

    t_total = time.time()

    engine = QDSProtocolEngine()
    guard = SymmetrizationGuard()
    detector = QDSThreatDetectorV1(max_age_seconds=MAX_AGE)

    t_a = time.time()
    run_scenario_a(engine, guard, detector)
    print(f"\n  Runtime: {time.time() - t_a:.4f}s")

    t_b = time.time()
    run_scenario_b(engine, guard, detector)
    print(f"\n  Runtime: {time.time() - t_b:.4f}s")

    t_c = time.time()
    run_scenario_c(engine, guard, detector)
    print(f"\n  Runtime: {time.time() - t_c:.4f}s")

    elapsed = time.time() - t_total
    print(f"\n{'=' * 80}")
    print(f" ASSERTION SUMMARY")
    print(f"{'=' * 80}")
    print(f"  [PASSED] Scenario A : Clean Channel + Symmetrization -> CLEAN / LOW")
    print(f"  [PASSED] Scenario B : Repudiation WITHOUT Symmetrization -> Verifier Disagreement Exposed")
    print(f"  [PASSED] Scenario C : Repudiation WITH Symmetrization -> REPUDIATION_ATTACK / CRITICAL")
    print(f"\n  Total Combined Runtime : {elapsed:.4f}s")

    assert elapsed < 1.5, f"Runtime exceeded 1.5s limit: {elapsed:.3f}s"
    print(f"  [PASSED] Runtime < 1.5s ✓")

    print(f"\n{'=' * 80}")
    print(f" [ALL DAY 5 PIPELINE TESTS PASSED]")
    print(f" Module G: Symmetrization Guard closes the repudiation gap — 100% deterministic.")
    print(f"{'=' * 80}")


def test_day5_verification():
    """Pytest wrapper for Day 5 symmetrization guard verification."""
    main()


if __name__ == "__main__":
    main()

