"""Module C & D: Day 6 Verification Suite.

Validates:
  1. MDI-style Detector Cross-Check:
     Compares Path A vs Path B measurement distributions using Total Variation Distance.
  2. Counterfactual Zero-Transmission Integrity Check:
     Monitors interaction-free null channel for unexpected photon leakage.
  3. 6th Attack Class (Detector Side-Channel / Blinding Attack):
     Injected silent measurement bias detected with CRITICAL severity.
  4. Full-Suite 6-Threat Vector Sanity Check:
     Sequentially evaluates all 6 QDS threat classes:
       - Intercept-Resend Eavesdropping (Physical Quantum Channel)
       - Signature Payload Forgery (Classical/Quantum Bit Manipulation)
       - Signer Identity Impersonation (Spoofed Credentials)
       - Signature Replay Attack (Stale Timestamp & Duplicate Nonce)
       - Dishonest-Alice Repudiation (Symmetrization Guard Module G)
       - Detector Side-Channel Attack (Blinded Path B / MDI Divergence)
     Asserts 100% detection rate across all vectors.
"""

import time
from typing import Any, Dict, List, Tuple

from app.engine.protocol.qds_protocol import QDSProtocolEngine, QDSSignatureBlock
from app.engine.protocol.symmetrization import SymmetrizationGuard
from app.engine.threats.attack_simulator import AttackConfig, AttackSimulator, AttackType
from app.engine.threats.channel_noise import AdversaryChannel
from app.engine.threats.threat_detector import (
    AttackVector,
    ComprehensiveThreatReport,
    QDSThreatDetector,
    QDSThreatDetectorV1,
    ThreatSeverity,
)

# ─────────────────────────────────────────────────────────────────────────────
# Constants & Configuration
# ─────────────────────────────────────────────────────────────────────────────

DIGEST = "1011010011001010"
AUTH_KEY = "alice-authorized-master-key-001"
SHOTS = 4096
MAX_AGE = 60.0
DIVIDER = "═" * 80
THIN_DIVIDER = "─" * 80


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def make_clean_counts(digest: str, shots: int = SHOTS) -> Dict[str, int]:
    """Generates a clean measurement distribution (100% fidelity, 0% QBER)."""
    return {digest: shots}


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 1: Clean Dual-Path Baseline
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_1(
    engine: QDSProtocolEngine,
    detector: QDSThreatDetectorV1,
) -> ComprehensiveThreatReport:
    """Validates aligned dual-path measurement telemetry (Path A == Path B)."""
    print(f"\n{DIVIDER}")
    print(" SCENARIO 1: Clean Dual-Path Baseline (MDI Cross-Check)")
    print(" Expected: Path A == Path B (Delta ≈ 0.0%), Threat = False, Severity = LOW")
    print(f"{DIVIDER}")

    pkt = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    clean_pkt, meta = AttackSimulator.generate_clean_dual_path(pkt, shots=SHOTS)

    path_a = clean_pkt.public_key_registers["measurement_path_a"]
    path_b = clean_pkt.public_key_registers["measurement_path_b"]

    has_disagreement, tvd_score, diag = detector.check_detector_cross_validation(path_a, path_b)

    print(f"  [DUAL-PATH TELEMETRY]")
    print(f"    Path A sample counts    : {list(path_a.items())[:2]}")
    print(f"    Path B sample counts    : {list(path_b.items())[:2]}")
    print(f"    TVD Divergence (Delta)  : {tvd_score:.4%}")
    print(f"    Disagreement Flag       : {has_disagreement}")
    print(f"    Diagnostic              : {diag}")

    report = detector.analyze_comprehensive_threat(
        packet=clean_pkt,
        measured_counts=path_a,
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
        precomputed_fidelity=1.0,
    )

    print(f"\n  [DETECTOR EVALUATION]")
    print(f"    Threat Detected         : {report.threat_detected}")
    print(f"    Primary Vector          : {report.primary_attack_vector}")
    print(f"    Severity                : {report.severity}")
    print(f"    Reason Code             : {report.reason_code}")
    print(f"    Diagnostic Message      : {report.diagnostic_message}")

    assert not report.threat_detected, f"Scenario 1: Clean baseline should not trigger threat"
    assert report.primary_attack_vector == AttackVector.CLEAN
    assert report.severity == ThreatSeverity.LOW
    assert tvd_score <= 0.15, f"Scenario 1: Clean TVD should be <= 0.15, got {tvd_score}"

    print(f"\n  [PASSED] Scenario 1: Clean Dual-Path Baseline Verified.")
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 2: Detector Side-Channel Attack
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_2(
    engine: QDSProtocolEngine,
    detector: QDSThreatDetectorV1,
) -> ComprehensiveThreatReport:
    """Validates detection of silent measurement blinding on Path B."""
    print(f"\n{DIVIDER}")
    print(" SCENARIO 2: Detector Side-Channel Attack (Biased / Blinded Path B)")
    print(" Expected: Delta > 0.15, DETECTOR_SIDE_CHANNEL_ATTACK / CRITICAL")
    print(f"{DIVIDER}")

    pkt = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    bias_intensity = 0.45
    biased_pkt, meta = AttackSimulator.simulate_detector_side_channel_attack(
        pkt, path_bias_intensity=bias_intensity, shots=SHOTS
    )

    path_a = biased_pkt.public_key_registers["measurement_path_a"]
    path_b = biased_pkt.public_key_registers["measurement_path_b"]

    has_disagreement, tvd_score, diag = detector.check_detector_cross_validation(path_a, path_b)

    print(f"  [SIDE-CHANNEL INJECTION]")
    print(f"    Target Measurement Path : Path B (Path A remains uncorrupted)")
    print(f"    Path Bias Intensity     : {bias_intensity:.1%}")
    print(f"    Path A counts           : {list(path_a.items())[:2]}")
    print(f"    Path B counts           : {list(path_b.items())[:2]}")
    print(f"    TVD Divergence (Delta)  : {tvd_score:.4%}  (Threshold = 15.00%)")
    print(f"    Disagreement Flag       : {has_disagreement}")
    print(f"    Diagnostic              : {diag}")

    report = detector.analyze_comprehensive_threat(
        packet=biased_pkt,
        measured_counts=path_a,
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
        precomputed_fidelity=1.0,
    )

    print(f"\n  [DETECTOR EVALUATION]")
    print(f"    Threat Detected         : {report.threat_detected}")
    print(f"    Primary Vector          : {report.primary_attack_vector}")
    print(f"    Severity                : {report.severity}")
    print(f"    Reason Code             : {report.reason_code}")
    print(f"    Diagnostic Message      : {report.diagnostic_message}")

    assert report.threat_detected, "Scenario 2: Detector side-channel attack must be detected"
    assert report.primary_attack_vector == AttackVector.DETECTOR_SIDE_CHANNEL_ATTACK
    assert report.severity == ThreatSeverity.CRITICAL
    assert report.reason_code == "ERR_DETECTOR_SIDE_CHANNEL_BIAS"
    assert tvd_score > 0.15, f"Scenario 2: TVD must exceed 0.15, got {tvd_score}"

    print(f"\n  [PASSED] Scenario 2: Detector Side-Channel Attack Detected with CRITICAL Severity.")
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 3: Zero-Transmission Channel Tampering (Counterfactual Mode)
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_3(
    engine: QDSProtocolEngine,
    detector: QDSThreatDetectorV1,
) -> ComprehensiveThreatReport:
    """Validates interaction-free null-transmission integrity checking."""
    print(f"\n{DIVIDER}")
    print(" SCENARIO 3: Zero-Transmission Channel Tampering (Counterfactual Mode)")
    print(" Expected: Anomalous photon leakage > 5%, CHANNEL_MANIPULATION / CRITICAL")
    print(f"{DIVIDER}")

    pkt = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)

    # In clean counterfactual operation: null port has ~0 leakage clicks
    clean_null = {"null_vacuum": 4096, "leakage_clicks": 0}
    clean_tamper, clean_leakage, clean_msg = detector.check_zero_transmission_integrity(clean_null)
    print(f"  [BASELINE NULL-CHANNEL CHECK]")
    print(f"    Null port counts        : {clean_null}")
    print(f"    Leakage rate            : {clean_leakage:.2%}")
    print(f"    Tamper detected         : {clean_tamper}")
    assert not clean_tamper, "Clean null channel must not report tampering"

    # Counterfactual channel tampering: adversary probing causes unexpected clicks
    tampered_null = {"null_vacuum": 3200, "leakage_clicks": 896}
    tamper_detected, leakage_rate, diag = detector.check_zero_transmission_integrity(tampered_null)

    print(f"\n  [TAMPERED NULL-CHANNEL CHECK]")
    print(f"    Null port counts        : {tampered_null}")
    print(f"    Anomalous leakage rate  : {leakage_rate:.2%}  (Threshold = 5.00%)")
    print(f"    Tamper detected         : {tamper_detected}")
    print(f"    Diagnostic              : {diag}")

    # Evaluate via analyze_comprehensive_threat with zero-transmission telemetry
    report = detector.analyze_comprehensive_threat(
        packet=pkt,
        measured_counts=make_clean_counts(DIGEST, SHOTS),
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        null_channel_counts=tampered_null,
        precomputed_qber=0.0,
        precomputed_fidelity=1.0,
    )

    print(f"\n  [DETECTOR EVALUATION]")
    print(f"    Threat Detected         : {report.threat_detected}")
    print(f"    Primary Vector          : {report.primary_attack_vector}")
    print(f"    Severity                : {report.severity}")
    print(f"    Reason Code             : {report.reason_code}")
    print(f"    Diagnostic Message      : {report.diagnostic_message}")

    assert report.threat_detected, "Scenario 3: Zero-transmission tampering must be detected"
    assert report.primary_attack_vector == AttackVector.CHANNEL_MANIPULATION
    assert report.severity == ThreatSeverity.CRITICAL
    assert report.reason_code == "ERR_COUNTERFACTUAL_CHANNEL_TAMPER"
    assert leakage_rate > 0.05, f"Scenario 3: Leakage must exceed 0.05, got {leakage_rate}"

    print(f"\n  [PASSED] Scenario 3: Counterfactual Channel Tampering Detected with CRITICAL Severity.")
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 4: Full-Suite 6-Threat Vector Sanity Check
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_4(
    engine: QDSProtocolEngine,
    detector: QDSThreatDetectorV1,
    guard: SymmetrizationGuard,
    adversary: AdversaryChannel,
) -> Dict[str, Any]:
    """Sequentially validates all 6 QDS threat classes and asserts 100% detection efficiency."""
    print(f"\n{DIVIDER}")
    print(" SCENARIO 4: Full-Suite 6-Threat Vector Sanity Check")
    print(" Testing: Eavesdropping, Forgery, Impersonation, Replay, Repudiation, Side-Channel")
    print(f"{DIVIDER}")

    results: List[Dict[str, Any]] = []

    # 1. Intercept-Resend Eavesdropping (Physical Quantum Channel)
    t0 = time.perf_counter()
    pkt_ir = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    rep_ir = detector.analyze_comprehensive_threat(
        packet=pkt_ir,
        measured_counts=make_clean_counts(DIGEST, SHOTS),
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.415,
        precomputed_fidelity=0.585,
    )
    lat_ir = (time.perf_counter() - t0) * 1000.0
    det_ir = (rep_ir.primary_attack_vector == AttackVector.INTERCEPT_RESEND_EAVESDROPPING)
    results.append({
        "class_id": 1,
        "name": "Intercept-Resend Eavesdropping",
        "expected": AttackVector.INTERCEPT_RESEND_EAVESDROPPING.value,
        "detected": rep_ir.primary_attack_vector.value,
        "severity": str(rep_ir.severity),
        "threat_detected": rep_ir.threat_detected,
        "correct": det_ir,
        "latency_ms": lat_ir,
    })

    # 2. Forgery Attack (Payload Tampering)
    t0 = time.perf_counter()
    pkt_f = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    pkt_f_tampered = adversary.simulate_forgery_attack(pkt_f, tamper_rate=0.5)
    rep_f = detector.analyze_comprehensive_threat(
        packet=pkt_f_tampered,
        measured_counts=make_clean_counts(DIGEST, SHOTS),
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
    )
    lat_f = (time.perf_counter() - t0) * 1000.0
    det_f = (rep_f.primary_attack_vector == AttackVector.FORGERY_ATTEMPT)
    results.append({
        "class_id": 2,
        "name": "Payload Forgery Attack",
        "expected": AttackVector.FORGERY_ATTEMPT.value,
        "detected": rep_f.primary_attack_vector.value,
        "severity": str(rep_f.severity),
        "threat_detected": rep_f.threat_detected,
        "correct": det_f,
        "latency_ms": lat_f,
    })

    # 3. Impersonation Attack (Signer Identity Spoofing)
    t0 = time.perf_counter()
    pkt_imp = engine.generate_signature_stream(DIGEST, signer_public_key="mallory-unauthorized-0xDEAD")
    rep_imp = detector.analyze_comprehensive_threat(
        packet=pkt_imp,
        measured_counts=make_clean_counts(DIGEST, SHOTS),
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
    )
    lat_imp = (time.perf_counter() - t0) * 1000.0
    det_imp = (rep_imp.primary_attack_vector == AttackVector.IMPERSONATION_ATTACK)
    results.append({
        "class_id": 3,
        "name": "Identity Impersonation Attack",
        "expected": AttackVector.IMPERSONATION_ATTACK.value,
        "detected": rep_imp.primary_attack_vector.value,
        "severity": str(rep_imp.severity),
        "threat_detected": rep_imp.threat_detected,
        "correct": det_imp,
        "latency_ms": lat_imp,
    })

    # 4. Replay Attack (Stale Timestamp)
    t0 = time.perf_counter()
    pkt_rpl = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    pkt_rpl = adversary.simulate_replay_attack(pkt_rpl, age_seconds=300.0)
    rep_rpl = detector.analyze_comprehensive_threat(
        packet=pkt_rpl,
        measured_counts=make_clean_counts(DIGEST, SHOTS),
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
    )
    lat_rpl = (time.perf_counter() - t0) * 1000.0
    det_rpl = (rep_rpl.primary_attack_vector == AttackVector.REPLAY_ATTACK)
    results.append({
        "class_id": 4,
        "name": "Transaction Replay Attack",
        "expected": AttackVector.REPLAY_ATTACK.value,
        "detected": rep_rpl.primary_attack_vector.value,
        "severity": str(rep_rpl.severity),
        "threat_detected": rep_rpl.threat_detected,
        "correct": det_rpl,
        "latency_ms": lat_rpl,
    })

    # 5. Dishonest-Alice Repudiation Attack (Module G Symmetrization Guard)
    t0 = time.perf_counter()
    alice_tmpl = engine.generate_signature_stream(DIGEST, signer_public_key=AUTH_KEY)
    bob_blk, charlie_blk = AttackSimulator.simulate_repudiation_attack(
        alice_tmpl, asymmetry_rate=0.4, seed=42
    )
    sym_bob, sym_charlie, _ = guard.perform_symmetrization(bob_blk, charlie_blk, swap_ratio=0.5, seed=42)
    rep_bob = detector.analyze_comprehensive_threat(
        sym_bob, make_clean_counts(DIGEST, SHOTS), SHOTS, AUTH_KEY, precomputed_qber=0.1875
    )
    rep_charlie = detector.analyze_comprehensive_threat(
        sym_charlie, make_clean_counts(DIGEST, SHOTS), SHOTS, AUTH_KEY, precomputed_qber=0.0
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
        "threat_detected": rep_repud.threat_detected,
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
        measured_counts=make_clean_counts(DIGEST, SHOTS),
        shots=SHOTS,
        expected_public_key=AUTH_KEY,
        precomputed_qber=0.0,
    )
    lat_sc = (time.perf_counter() - t0) * 1000.0
    det_sc = (rep_sc.primary_attack_vector == AttackVector.DETECTOR_SIDE_CHANNEL_ATTACK)
    results.append({
        "class_id": 6,
        "name": "Detector Side-Channel Blinding",
        "expected": AttackVector.DETECTOR_SIDE_CHANNEL_ATTACK.value,
        "detected": rep_sc.primary_attack_vector.value,
        "severity": str(rep_sc.severity),
        "threat_detected": rep_sc.threat_detected,
        "correct": det_sc,
        "latency_ms": lat_sc,
    })

    # Print summary table
    print("\n  " + THIN_DIVIDER)
    header = f"  {'#':<3} {'Attack Class':<34} {'Expected Vector':<32} {'Detected':<8} {'Latency':>8}"
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

    assert total_correct == len(results), f"Scenario 4: All 6 attack classes must be detected (got {total_correct}/{len(results)})"

    print(f"\n  [PASSED] Scenario 4: Full Suite 6-Threat Vector Sanity Check (100% Detection Rate).")
    return {"results": results, "detection_rate": detection_rate, "total_correct": total_correct}


# ─────────────────────────────────────────────────────────────────────────────
# Main Verification Runner
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 80)
    print(" QDS Threat Detection Engine - Day 6 Verification Suite")
    print(" Detector Cross-Check, Zero-Transmission Check & 6-Vector Attack Suite (Zero ML)")
    print("=" * 80)
    print(f"\n[CONFIG] Digest Length       : {len(DIGEST)} bits ({DIGEST})")
    print(f"[CONFIG] Authorized Signer   : {AUTH_KEY}")
    print(f"[CONFIG] Monte Carlo Shots   : {SHOTS}")
    print(f"[CONFIG] TVD Divergence Limit: 15.00%")
    print(f"[CONFIG] Null Leakage Limit  : 5.00%")

    t_suite_start = time.perf_counter()

    engine = QDSProtocolEngine()
    detector = QDSThreatDetectorV1(max_age_seconds=MAX_AGE)
    guard = SymmetrizationGuard()
    adversary = AdversaryChannel()

    # Scenario 1: Clean Dual-Path Baseline
    t1 = time.perf_counter()
    run_scenario_1(engine, detector)
    dur1 = time.perf_counter() - t1

    # Scenario 2: Detector Side-Channel Attack
    t2 = time.perf_counter()
    run_scenario_2(engine, detector)
    dur2 = time.perf_counter() - t2

    # Scenario 3: Zero-Transmission Channel Tampering
    t3 = time.perf_counter()
    run_scenario_3(engine, detector)
    dur3 = time.perf_counter() - t3

    # Scenario 4: Full Suite 6-Threat Vector Sanity Check
    t4 = time.perf_counter()
    run_scenario_4(engine, detector, guard, adversary)
    dur4 = time.perf_counter() - t4

    total_time = time.perf_counter() - t_suite_start

    print(f"\n{'=' * 80}")
    print(" DAY 6 EXECUTION SUMMARY & ASSERTION VALIDATION")
    print(f"{'=' * 80}")
    print(f"  [CHECK] Scenario 1 (Dual-Path Clean Baseline)       : PASSED ({dur1*1000:.2f}ms)")
    print(f"  [CHECK] Scenario 2 (Detector Side-Channel Attack)   : PASSED ({dur2*1000:.2f}ms)")
    print(f"  [CHECK] Scenario 3 (Zero-Transmission Tampering)    : PASSED ({dur3*1000:.2f}ms)")
    print(f"  [CHECK] Scenario 4 (6-Threat Vector Sanity Check)   : PASSED ({dur4*1000:.2f}ms)")
    print(f"\n  Total Execution Runtime   : {total_time:.4f} seconds (Limit: 1.5s)")

    assert total_time < 1.5, f"Total execution time exceeded 1.5s: {total_time:.3f}s"
    print("  [CHECK] Performance SLA (< 1.5s): PASSED ✓")

    print(f"\n{'=' * 80}")
    print(" [ALL DAY 6 TESTS PASSED] 100% Detection Efficiency Across All 6 Threat Vectors.")
    print(f"{'=' * 80}")


if __name__ == "__main__":
    main()
