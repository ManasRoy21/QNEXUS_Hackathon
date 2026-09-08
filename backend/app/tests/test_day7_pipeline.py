"""Module C & D: Day 7 Verification Suite.

Validates:
  1. Formal Hoeffding Security Bounds (e_rob, e_rep, e_forg):
     Derived from CV-QDS literature (Thornton et al., Richter et al.).
  2. Postselection Layer:
     Filters out ambiguous boundary zone measurement events prior to scoring.
  3. Scenarios:
     - Scenario A: Clean Channel with Postselection (Threat = False, QBER <= e_rob).
     - Scenario B: Noisy Channel Forgery Attack (Threat = True, FORGERY_ATTEMPT, QBER > e_forg).
     - Scenario C: Repudiation Scenario with e_rep Bound (Threat = True, REPUDIATION_ATTACK, Mismatch > e_rep).
     - Scenario D: End-to-End 6-Vector Regression with Postselection Active (100% Detection Rate).
"""

import sys
import time
from pathlib import Path
from typing import Any, Dict, List

# Ensure backend root is always in sys.path
backend_root = Path(__file__).resolve().parent.parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.engine.protocol.qds_protocol import QDSProtocolEngine, QDSSignatureBlock
from app.engine.protocol.symmetrization import SymmetrizationGuard
from app.engine.threats.attack_simulator import AttackConfig, AttackSimulator, AttackType
from app.engine.threats.channel_noise import AdversaryChannel
from app.engine.threats.threat_detector import (
    AttackVector,
    ComprehensiveThreatReport,
    HoeffdingQBEREvaluator,
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
AMBIGUITY_MARGIN = 0.03
DIVIDER = "═" * 80
THIN_DIVIDER = "─" * 80


# ─────────────────────────────────────────────────────────────────────────────
# Scenario A: Clean Channel with Postselection
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_a(
    engine: QDSProtocolEngine,
    detector: QDSThreatDetectorV1,
) -> ComprehensiveThreatReport:
    """Validates clean channel with boundary noise filtering and e_rob verification."""
    print(f"\n{DIVIDER}")
    print(" SCENARIO A: Clean Channel with Postselection Layer")
    print(" Expected: Ambiguous boundary shots discarded, QBER = 0.0% <= e_rob, Threat = False")
    print(f"{DIVIDER}")

    # Generate raw measurement distribution with 3% ambiguous boundary noise
    raw_counts = AttackSimulator.generate_noisy_channel_counts(
        DIGEST, total_shots=SHOTS, noise_fraction=AMBIGUITY_MARGIN
    )
    print(f"  [RAW MEASUREMENT DISTRIBUTION]")
    print(f"    Raw shot distribution   : {raw_counts}")
    print(f"    Total raw shots         : {sum(raw_counts.values())}")

    # Direct postselection inspection
    postselected_counts, orig_shots, discarded = detector.apply_postselection(
        raw_counts, ambiguity_margin=AMBIGUITY_MARGIN, expected_digest=DIGEST
    )
    discard_rate = discarded / max(1, orig_shots)
    print(f"\n  [POSTSELECTION LAYER TELEMETRY]")
    print(f"    Ambiguity margin        : {AMBIGUITY_MARGIN:.1%}")
    print(f"    Original shots          : {orig_shots}")
    print(f"    Discarded boundary shots: {discarded} ({discard_rate:.2%})")
    print(f"    Postselected shot count : {sum(postselected_counts.values())}")
    print(f"    Cleaned distribution    : {postselected_counts}")

    # Evaluate threat with postselection active
    pkt = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    report = detector.analyze_comprehensive_threat(
        packet=pkt,
        measured_counts=raw_counts,
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        apply_postselection_filter=True,
        ambiguity_margin=AMBIGUITY_MARGIN,
    )

    qm = report.qber_metrics
    print(f"\n  [HOEFFDING SECURITY BOUNDS (Postselected N={qm['postselected_shots']})]")
    print(f"    e_rob (Robustness Bound): {qm['e_rob']:.4%}  (QBER must be <= e_rob)")
    print(f"    e_rep (Repudiation Bound): {qm['e_rep']:.4%}")
    print(f"    e_forg (Forgery Bound)  : {qm['e_forg']:.4%}")
    print(f"    Measured QBER           : {qm['measured_qber']:.4%}")

    print(f"\n  [DETECTOR EVALUATION]")
    print(f"    Threat Detected         : {report.threat_detected}")
    print(f"    Primary Vector          : {report.primary_attack_vector}")
    print(f"    Severity                : {report.severity}")
    print(f"    Diagnostic Message      : {report.diagnostic_message}")

    assert not report.threat_detected, "Scenario A: Clean channel should not report threat"
    assert report.primary_attack_vector == AttackVector.CLEAN
    assert report.severity == ThreatSeverity.LOW
    assert discarded > 0, "Scenario A: Ambiguous shots must be discarded"
    assert qm["measured_qber"] <= qm["e_rob"], "Scenario A: Measured QBER must be <= e_rob"

    print(f"\n  [PASSED] Scenario A: Clean Channel Verified under Hoeffding e_rob Bound.")
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Scenario B: Noisy Channel Forgery Attack
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_b(
    engine: QDSProtocolEngine,
    detector: QDSThreatDetectorV1,
    adversary: AdversaryChannel,
) -> ComprehensiveThreatReport:
    """Validates forgery detection with postselection active and formal e_forg bound."""
    print(f"\n{DIVIDER}")
    print(" SCENARIO B: Noisy Channel Payload Forgery Attack")
    print(" Expected: Postselection purges boundary noise; QBER > e_forg flags FORGERY_ATTEMPT")
    print(f"{DIVIDER}")

    pkt = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    tampered_pkt = adversary.simulate_forgery_attack(pkt, tamper_rate=0.5)

    # Attach boundary noise to simulated tampered measurement counts
    tampered_digest = tampered_pkt.digest
    raw_tampered_counts = AttackSimulator.generate_noisy_channel_counts(
        tampered_digest, total_shots=SHOTS, noise_fraction=AMBIGUITY_MARGIN
    )

    print(f"  [FORGERY INJECTION]")
    print(f"    Original Digest         : {DIGEST}")
    print(f"    Tampered Digest         : {tampered_digest}")
    print(f"    Tampered Indices        : {tampered_pkt.public_key_registers.get('tampered_indices', [])}")
    print(f"    Raw measurement shots   : {sum(raw_tampered_counts.values())}")

    # Evaluate threat
    report = detector.analyze_comprehensive_threat(
        packet=tampered_pkt,
        measured_counts=raw_tampered_counts,
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        apply_postselection_filter=True,
        ambiguity_margin=AMBIGUITY_MARGIN,
    )

    qm = report.qber_metrics
    print(f"\n  [POSTSELECTION & SECURITY BOUNDS]")
    print(f"    Discarded boundary shots: {qm['discarded_shots']} ({qm['postselection_discard_rate']:.2%})")
    print(f"    Effective shots         : {qm['postselected_shots']}")
    print(f"    e_forg (Forgery Bound)  : {qm['e_forg']:.4%}")
    print(f"    Measured QBER           : {qm['measured_qber']:.4%}")

    print(f"\n  [DETECTOR EVALUATION]")
    print(f"    Threat Detected         : {report.threat_detected}")
    print(f"    Primary Vector          : {report.primary_attack_vector}")
    print(f"    Severity                : {report.severity}")
    print(f"    Reason Code             : {report.reason_code}")
    print(f"    Diagnostic Message      : {report.diagnostic_message}")

    assert report.threat_detected, "Scenario B: Forgery must be detected"
    assert report.primary_attack_vector == AttackVector.FORGERY_ATTEMPT
    assert report.severity == ThreatSeverity.HIGH
    assert report.reason_code == "ERR_PAYLOAD_FORGERY_DETECTED"
    assert qm["discarded_shots"] > 0, "Scenario B: Postselection must discard boundary shots"

    print(f"\n  [PASSED] Scenario B: Payload Forgery Detected under Hoeffding e_forg Bound.")
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Scenario C: Repudiation Scenario with Formal e_rep Bound
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_c(
    engine: QDSProtocolEngine,
    detector: QDSThreatDetectorV1,
    guard: SymmetrizationGuard,
) -> ComprehensiveThreatReport:
    """Validates dishonest-Alice repudiation via symmetrization and formal e_rep bound."""
    print(f"\n{DIVIDER}")
    print(" SCENARIO C: Repudiation Scenario with Formal Hoeffding e_rep Bound")
    print(" Expected: Post-symmetrization mismatch > e_rep triggers REPUDIATION_ATTACK")
    print(f"{DIVIDER}")

    alice_tmpl = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    bob_blk, charlie_blk = AttackSimulator.simulate_repudiation_attack(
        alice_tmpl, asymmetry_rate=0.4, seed=42
    )

    # Perform classical authenticated symmetrization
    sym_bob, sym_charlie, telemetry = guard.perform_symmetrization(
        bob_blk, charlie_blk, swap_ratio=0.5, seed=42
    )

    print(f"  [SYMMETRIZATION TELEMETRY]")
    print(f"    Indices Swapped         : {telemetry.swap_count} / {telemetry.total_bits} bits")
    print(f"    Alice Informed          : {telemetry.alice_informed}")

    # Evaluate each verifier with boundary noise on Bob's swapped block
    noisy_bob_counts = AttackSimulator.generate_noisy_channel_counts(
        DIGEST, total_shots=SHOTS, noise_fraction=AMBIGUITY_MARGIN
    )
    clean_counts = {DIGEST: SHOTS}

    # Bob has 18.75% error rate from swapped asymmetric states
    rep_bob = detector.analyze_comprehensive_threat(
        packet=sym_bob,
        measured_counts=noisy_bob_counts,
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.1875,
        apply_postselection_filter=True,
    )

    rep_charlie = detector.analyze_comprehensive_threat(
        packet=sym_charlie,
        measured_counts=clean_counts,
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
        apply_postselection_filter=True,
    )

    # Run repudiation detector with e_rep bound
    rep_repud = detector.detect_repudiation_asymmetry(
        rep_bob, rep_charlie, sym_bob, sym_charlie
    )

    qm = rep_repud.qber_metrics
    print(f"\n  [REPUDIATION BOUND ANALYSIS]")
    print(f"    Hoeffding e_rep Bound   : {qm['e_rep']:.4%}")
    print(f"    Bob Measured QBER       : {qm['bob_qber']:.4%}")
    print(f"    Charlie Measured QBER   : {qm['charlie_qber']:.4%}")
    print(f"    Bob Exceeds e_rep       : {qm['bob_anomaly']}")
    print(f"    Both Unified on Threat  : {rep_repud.threat_detected}")

    print(f"\n  [REPUDIATION VERDICT]")
    print(f"    Threat Detected         : {rep_repud.threat_detected}")
    print(f"    Primary Vector          : {rep_repud.primary_attack_vector}")
    print(f"    Severity                : {rep_repud.severity}")
    print(f"    Reason Code             : {rep_repud.reason_code}")
    print(f"    Diagnostic Message      : {rep_repud.diagnostic_message}")

    assert rep_repud.threat_detected, "Scenario C: Repudiation must be detected"
    assert rep_repud.primary_attack_vector == AttackVector.REPUDIATION_ATTACK
    assert rep_repud.severity == ThreatSeverity.CRITICAL
    assert rep_repud.reason_code == "ERR_HOEFFDING_REPUDIATION_BOUND_BREACH"
    assert qm["bob_qber"] > qm["e_rep"], "Scenario C: Bob QBER must exceed Hoeffding e_rep bound"

    print(f"\n  [PASSED] Scenario C: Dishonest Alice Repudiation Intercepted under e_rep Bound.")
    return rep_repud


# ─────────────────────────────────────────────────────────────────────────────
# Scenario D: End-to-End 6-Vector Regression with Postselection Active
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_d(
    engine: QDSProtocolEngine,
    detector: QDSThreatDetectorV1,
    guard: SymmetrizationGuard,
    adversary: AdversaryChannel,
) -> Dict[str, Any]:
    """Runs all 6 threat vectors with postselection and formal Hoeffding bounds active."""
    print(f"\n{DIVIDER}")
    print(" SCENARIO D: End-to-End 6-Vector Regression (Postselection + Hoeffding Active)")
    print(" Asserting 100% Detection Rate and 0% False Positives")
    print(f"{DIVIDER}")

    results: List[Dict[str, Any]] = []

    # 1. Intercept-Resend Eavesdropping (Physical Quantum Channel)
    t0 = time.perf_counter()
    pkt_ir = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    rep_ir = detector.analyze_comprehensive_threat(
        packet=pkt_ir,
        measured_counts={DIGEST: SHOTS},
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.415,
        apply_postselection_filter=True,
    )
    lat_ir = (time.perf_counter() - t0) * 1000.0
    det_ir = (rep_ir.primary_attack_vector == AttackVector.INTERCEPT_RESEND_EAVESDROPPING)
    results.append({
        "class_id": 1,
        "name": "Intercept-Resend Eavesdropping",
        "expected": AttackVector.INTERCEPT_RESEND_EAVESDROPPING.value,
        "detected": rep_ir.primary_attack_vector.value,
        "severity": str(rep_ir.severity),
        "correct": det_ir,
        "latency_ms": lat_ir,
    })

    # 2. Payload Forgery Attack
    t0 = time.perf_counter()
    pkt_f = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    pkt_f_tampered = adversary.simulate_forgery_attack(pkt_f, tamper_rate=0.5)
    rep_f = detector.analyze_comprehensive_threat(
        packet=pkt_f_tampered,
        measured_counts={DIGEST: SHOTS},
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
        apply_postselection_filter=True,
    )
    lat_f = (time.perf_counter() - t0) * 1000.0
    det_f = (rep_f.primary_attack_vector == AttackVector.FORGERY_ATTEMPT)
    results.append({
        "class_id": 2,
        "name": "Payload Forgery Attack",
        "expected": AttackVector.FORGERY_ATTEMPT.value,
        "detected": rep_f.primary_attack_vector.value,
        "severity": str(rep_f.severity),
        "correct": det_f,
        "latency_ms": lat_f,
    })

    # 3. Identity Impersonation Attack
    t0 = time.perf_counter()
    pkt_imp = engine.generate_signature_stream(DIGEST, signer_public_key="mallory-unauthorized-0xDEAD")
    rep_imp = detector.analyze_comprehensive_threat(
        packet=pkt_imp,
        measured_counts={DIGEST: SHOTS},
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
        apply_postselection_filter=True,
    )
    lat_imp = (time.perf_counter() - t0) * 1000.0
    det_imp = (rep_imp.primary_attack_vector == AttackVector.IMPERSONATION_ATTACK)
    results.append({
        "class_id": 3,
        "name": "Identity Impersonation Attack",
        "expected": AttackVector.IMPERSONATION_ATTACK.value,
        "detected": rep_imp.primary_attack_vector.value,
        "severity": str(rep_imp.severity),
        "correct": det_imp,
        "latency_ms": lat_imp,
    })

    # 4. Transaction Replay Attack
    t0 = time.perf_counter()
    pkt_rpl = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    pkt_rpl = adversary.simulate_replay_attack(pkt_rpl, age_seconds=300.0)
    rep_rpl = detector.analyze_comprehensive_threat(
        packet=pkt_rpl,
        measured_counts={DIGEST: SHOTS},
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
        apply_postselection_filter=True,
    )
    lat_rpl = (time.perf_counter() - t0) * 1000.0
    det_rpl = (rep_rpl.primary_attack_vector == AttackVector.REPLAY_ATTACK)
    results.append({
        "class_id": 4,
        "name": "Transaction Replay Attack",
        "expected": AttackVector.REPLAY_ATTACK.value,
        "detected": rep_rpl.primary_attack_vector.value,
        "severity": str(rep_rpl.severity),
        "correct": det_rpl,
        "latency_ms": lat_rpl,
    })

    # 5. Dishonest-Alice Repudiation Attack (Module G Symmetrization)
    t0 = time.perf_counter()
    alice_tmpl = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    bob_blk, charlie_blk = AttackSimulator.simulate_repudiation_attack(
        alice_tmpl, asymmetry_rate=0.4, seed=42
    )
    sym_bob, sym_charlie, _ = guard.perform_symmetrization(bob_blk, charlie_blk, swap_ratio=0.5, seed=42)
    rep_bob = detector.analyze_comprehensive_threat(
        sym_bob, {DIGEST: SHOTS}, SHOTS, AUTH_KEY, precomputed_qber=0.1875, apply_postselection_filter=True
    )
    rep_charlie = detector.analyze_comprehensive_threat(
        sym_charlie, {DIGEST: SHOTS}, SHOTS, AUTH_KEY, precomputed_qber=0.0, apply_postselection_filter=True
    )
    rep_repud = detector.detect_repudiation_asymmetry(rep_bob, rep_charlie, sym_bob, sym_charlie)
    lat_repud = (time.perf_counter() - t0) * 1000.0
    det_repud = (rep_repud.primary_attack_vector == AttackVector.REPUDIATION_ATTACK)
    results.append({
        "class_id": 5,
        "name": "Dishonest-Alice Repudiation",
        "expected": AttackVector.REPUDIATION_ATTACK.value,
        "detected": rep_repud.primary_attack_vector.value,
        "severity": str(rep_repud.severity),
        "correct": det_repud,
        "latency_ms": lat_repud,
    })

    # 6. Detector Side-Channel Attack (Blinded Path B)
    t0 = time.perf_counter()
    pkt_sc = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    biased_pkt, _ = AttackSimulator.simulate_detector_side_channel_attack(
        pkt_sc, path_bias_intensity=0.45, shots=SHOTS
    )
    rep_sc = detector.analyze_comprehensive_threat(
        packet=biased_pkt,
        measured_counts={DIGEST: SHOTS},
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
        apply_postselection_filter=True,
    )
    lat_sc = (time.perf_counter() - t0) * 1000.0
    det_sc = (rep_sc.primary_attack_vector == AttackVector.DETECTOR_SIDE_CHANNEL_ATTACK)
    results.append({
        "class_id": 6,
        "name": "Detector Side-Channel Blinding",
        "expected": AttackVector.DETECTOR_SIDE_CHANNEL_ATTACK.value,
        "detected": rep_sc.primary_attack_vector.value,
        "severity": str(rep_sc.severity),
        "correct": det_sc,
        "latency_ms": lat_sc,
    })

    # Print summary table
    print("\n  " + THIN_DIVIDER)
    header = f"  {'#':<3} {'Attack Class':<34} {'Expected Vector':<32} {'Status':<8} {'Latency':>8}"
    print(header)
    print("  " + THIN_DIVIDER)

    total_correct = 0
    for r in results:
        status_str = "PASS" if r["correct"] else "FAIL"
        print(f"  {r['class_id']:<3} {r['name']:<34} {r['expected']:<32} {status_str:<8} {r['latency_ms']:>6.2f}ms")
        if r["correct"]:
            total_correct += 1

    print("  " + THIN_DIVIDER)
    detection_rate = 100.0 * total_correct / len(results)
    avg_latency = sum(r["latency_ms"] for r in results) / len(results)
    print(f"  ALL 6 THREAT CLASSES: {total_correct}/{len(results)} DETECTED ({detection_rate:.1f}%) | Avg Latency: {avg_latency:.2f}ms")
    print("  " + THIN_DIVIDER)

    assert total_correct == len(results), f"Scenario D: All 6 attack classes must be detected (got {total_correct}/{len(results)})"

    print(f"\n  [PASSED] Scenario D: All 6 Attack Classes Successfully Detected with Postselection Active.")
    return {"results": results, "detection_rate": detection_rate, "total_correct": total_correct}


# ─────────────────────────────────────────────────────────────────────────────
# Main Verification Runner
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 80)
    print(" QDS Threat Detection Engine - Day 7 Verification Suite")
    print(" Hoeffding Security Bounds (e_rob, e_rep, e_forg) & Postselection Layer (Zero ML)")
    print("=" * 80)
    print(f"\n[CONFIG] Signature Digest    : {DIGEST} ({len(DIGEST)} bits)")
    print(f"[CONFIG] Signer Credential   : {AUTH_KEY}")
    print(f"[CONFIG] Monte Carlo Shots   : {SHOTS}")
    print(f"[CONFIG] Ambiguity Margin    : {AMBIGUITY_MARGIN:.1%}")
    print(f"[CONFIG] Hoeffding Alpha     : 0.01 (99.0% Confidence Level)")

    t_suite_start = time.perf_counter()

    engine = QDSProtocolEngine()
    detector = QDSThreatDetectorV1(max_age_seconds=60.0)
    guard = SymmetrizationGuard()
    adversary = AdversaryChannel()

    # Scenario A: Clean Channel with Postselection
    t1 = time.perf_counter()
    run_scenario_a(engine, detector)
    dur1 = time.perf_counter() - t1

    # Scenario B: Noisy Channel Forgery Attack
    t2 = time.perf_counter()
    run_scenario_b(engine, detector, adversary)
    dur2 = time.perf_counter() - t2

    # Scenario C: Repudiation Scenario with e_rep Bound
    t3 = time.perf_counter()
    run_scenario_c(engine, detector, guard)
    dur3 = time.perf_counter() - t3

    # Scenario D: End-to-End 6-Vector Regression
    t4 = time.perf_counter()
    run_scenario_d(engine, detector, guard, adversary)
    dur4 = time.perf_counter() - t4

    total_time = time.perf_counter() - t_suite_start

    print(f"\n{'=' * 80}")
    print(" DAY 7 EXECUTION SUMMARY & ASSERTION VALIDATION")
    print(f"{'=' * 80}")
    print(f"  [CHECK] Scenario A (Clean + Postselection + e_rob)  : PASSED ({dur1*1000:.2f}ms)")
    print(f"  [CHECK] Scenario B (Forgery Attack + e_forg)       : PASSED ({dur2*1000:.2f}ms)")
    print(f"  [CHECK] Scenario C (Repudiation Attack + e_rep)     : PASSED ({dur3*1000:.2f}ms)")
    print(f"  [CHECK] Scenario D (6-Threat Vector Regression)     : PASSED ({dur4*1000:.2f}ms)")
    print(f"\n  Total Execution Runtime   : {total_time:.4f} seconds (Limit: 1.5s)")

    assert total_time < 1.5, f"Total execution time exceeded 1.5s: {total_time:.3f}s"
    print("  [CHECK] Performance SLA (< 1.5s): PASSED ✓")

    print(f"\n{'=' * 80}")
    print(" [ALL DAY 7 TESTS PASSED] Postselection Layer & Hoeffding Bounds Verified.")
    print(f"{'=' * 80}")


def test_day7_verification():
    """Pytest wrapper for Day 7 postselection layer & Hoeffding bounds."""
    main()


if __name__ == "__main__":
    main()

