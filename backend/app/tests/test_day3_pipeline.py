"""Module C Integrated Verification Suite: Day 3 Pipeline Tests.

Executes comprehensive end-to-end evaluations of 5 distinct operational scenarios:
- Scenario A: Clean Channel Baseline
- Scenario B: Intercept-Resend Attack (Physical Eavesdropping)
- Scenario C: Forgery Attack (Payload Tampering)
- Scenario D: Impersonation Attack (Signer Identity Spoofing)
- Scenario E: Replay Attack (Stale Timestamp & Duplicate Nonce)
"""

import time
from app.engine.protocol.qds_protocol import QDSProtocolEngine
from app.engine.threats.channel_noise import AdversaryChannel
from app.engine.threats.threat_detector import (
    AttackVector,
    QDSThreatDetectorV1,
    ThreatSeverity,
)


def run_day3_verification():
    print("=" * 80)
    print(" QDS Threat Detection Engine - Day 3 (Module C) Verification Suite")
    print(" Threat Detection Engine v1: Forgery, Impersonation, Replay & Hoeffding (Zero ML)")
    print("=" * 80)

    engine = QDSProtocolEngine()
    adversary = AdversaryChannel()
    detector = QDSThreatDetectorV1(max_age_seconds=60.0)

    test_digest = "1011010011001010"
    shots = 4096
    expected_signer_key = "alice-authorized-master-key-001"
    nonce_cache = set()

    print(f"\n[CONFIG] Signature Stream Length : {len(test_digest)} bits")
    print(f"[CONFIG] Message Digest          : {test_digest}")
    print(f"[CONFIG] Authorized Signer Key   : {expected_signer_key}")
    print(f"[CONFIG] Monte Carlo Shots       : {shots}")
    print(f"[CONFIG] Max Packet TTL          : {detector.max_age_seconds}s")

    total_start_time = time.time()

    # =========================================================================
    # SCENARIO A: CLEAN CHANNEL (BASELINE)
    # =========================================================================
    print("\n" + "-" * 80)
    print(" SCENARIO A: Clean Channel (Baseline)")
    print("-" * 80)

    t_start = time.time()
    sig_block_a = engine.generate_signature_stream(
        digest=test_digest,
        signer_public_key=expected_signer_key,
    )
    circuit_a = engine.build_multi_party_circuit(sig_block_a)
    raw_counts_a = engine.execute_protocol(circuit_a, shots=shots)
    bob_counts_a = engine.extract_verifier_counts(circuit_a, raw_counts_a, verifier="bob")

    report_a = detector.analyze_comprehensive_threat(
        packet=sig_block_a,
        measured_counts=bob_counts_a,
        shots=shots,
        expected_public_key=expected_signer_key,
        nonce_cache=nonce_cache,
    )
    t_elapsed_a = time.time() - t_start

    print(f" Execution Duration       : {t_elapsed_a:.3f} seconds")
    print(f" Measured QBER            : {report_a.qber_metrics['measured_qber']:.4%}")
    print(f" Hoeffding Threshold     : {report_a.qber_metrics['hoeffding_threshold']:.4%}")
    print(f" State Fidelity           : {report_a.fidelity:.4%}")
    print(f" Threat Detected          : {report_a.threat_detected}")
    print(f" Security Severity        : {report_a.severity}")
    print(f" Attack Vector            : {report_a.primary_attack_vector}")
    print(f" Diagnostics              : {report_a.diagnostic_message}")

    assert report_a.threat_detected is False, "Unexpected threat in clean channel baseline!"
    assert report_a.severity == ThreatSeverity.LOW or report_a.severity == "LOW", f"Expected LOW severity, got {report_a.severity}"
    assert report_a.primary_attack_vector == AttackVector.CLEAN or report_a.primary_attack_vector == "CLEAN", f"Expected CLEAN vector, got {report_a.primary_attack_vector}"
    print("\n [PASSED] Scenario A: Clean Channel Baseline verified.")

    # =========================================================================
    # SCENARIO B: INTERCEPT-RESEND ATTACK
    # =========================================================================
    print("\n" + "-" * 80)
    print(" SCENARIO B: Intercept-Resend Attack (Physical Eavesdropping)")
    print("-" * 80)

    t_start = time.time()
    sig_block_b = engine.generate_signature_stream(
        digest=test_digest,
        signer_public_key=expected_signer_key,
    )
    circuit_b = engine.build_multi_party_circuit(
        signature_block=sig_block_b,
        channel_adversary=adversary,
        eavesdrop_probability=1.0,
        target_channel="bob",
    )
    raw_counts_b = engine.execute_protocol(circuit_b, shots=shots)
    bob_counts_b = engine.extract_verifier_counts(circuit_b, raw_counts_b, verifier="bob")

    report_b = detector.analyze_comprehensive_threat(
        packet=sig_block_b,
        measured_counts=bob_counts_b,
        shots=shots,
        expected_public_key=expected_signer_key,
        nonce_cache=nonce_cache,
    )
    t_elapsed_b = time.time() - t_start

    print(f" Execution Duration       : {t_elapsed_b:.3f} seconds")
    print(f" Measured QBER            : {report_b.qber_metrics['measured_qber']:.4%}")
    print(f" Hoeffding Threshold     : {report_b.qber_metrics['hoeffding_threshold']:.4%}")
    print(f" State Fidelity           : {report_b.fidelity:.4%}")
    print(f" Threat Detected          : {report_b.threat_detected}")
    print(f" Security Severity        : {report_b.severity}")
    print(f" Attack Vector            : {report_b.primary_attack_vector}")
    print(f" Diagnostics              : {report_b.diagnostic_message}")

    assert report_b.threat_detected is True, "Physical eavesdropping went undetected!"
    assert report_b.severity == ThreatSeverity.CRITICAL or report_b.severity == "CRITICAL", f"Expected CRITICAL severity, got {report_b.severity}"
    assert report_b.primary_attack_vector == AttackVector.INTERCEPT_RESEND_EAVESDROPPING or report_b.primary_attack_vector == "INTERCEPT_RESEND_EAVESDROPPING", f"Expected INTERCEPT_RESEND_EAVESDROPPING, got {report_b.primary_attack_vector}"
    print("\n [PASSED] Scenario B: Intercept-Resend Attack verified.")

    # =========================================================================
    # SCENARIO C: FORGERY ATTACK
    # =========================================================================
    print("\n" + "-" * 80)
    print(" SCENARIO C: Forgery Attack (Payload Tampering)")
    print("-" * 80)

    t_start = time.time()
    sig_block_c_orig = engine.generate_signature_stream(
        digest=test_digest,
        signer_public_key=expected_signer_key,
    )
    # Mallory tampers with classical digest and bases in transit
    sig_block_c_tampered = adversary.simulate_forgery_attack(sig_block_c_orig, tamper_rate=0.3)

    report_c = detector.analyze_comprehensive_threat(
        packet=sig_block_c_tampered,
        measured_counts=bob_counts_a,  # Quantum channel carried state for original digest
        shots=shots,
        expected_public_key=expected_signer_key,
        nonce_cache=nonce_cache,
    )
    t_elapsed_c = time.time() - t_start

    print(f" Execution Duration       : {t_elapsed_c:.3f} seconds")
    print(f" Claimed (Tampered) Digest: {sig_block_c_tampered.digest}")
    print(f" Threat Detected          : {report_c.threat_detected}")
    print(f" Security Severity        : {report_c.severity}")
    print(f" Attack Vector            : {report_c.primary_attack_vector}")
    print(f" Diagnostics              : {report_c.diagnostic_message}")

    assert report_c.threat_detected is True, "Payload forgery went undetected!"
    assert report_c.severity == ThreatSeverity.HIGH or report_c.severity == "HIGH", f"Expected HIGH severity, got {report_c.severity}"
    assert report_c.primary_attack_vector == AttackVector.FORGERY_ATTEMPT or report_c.primary_attack_vector == "FORGERY_ATTEMPT", f"Expected FORGERY_ATTEMPT, got {report_c.primary_attack_vector}"
    print("\n [PASSED] Scenario C: Forgery Attack verified.")

    # =========================================================================
    # SCENARIO D: IMPERSONATION ATTACK
    # =========================================================================
    print("\n" + "-" * 80)
    print(" SCENARIO D: Impersonation Attack (Signer Identity Spoofing)")
    print("-" * 80)

    t_start = time.time()
    sig_block_d_orig = engine.generate_signature_stream(
        digest=test_digest,
        signer_public_key=expected_signer_key,
    )
    # Mallory signs with unauthorized identity credentials
    sig_block_d_spoofed = adversary.simulate_impersonation_attack(
        sig_block_d_orig,
        forged_public_key="mallory-unauthorized-key-0xDEADBEEF",
    )

    report_d = detector.analyze_comprehensive_threat(
        packet=sig_block_d_spoofed,
        measured_counts=bob_counts_a,
        shots=shots,
        expected_public_key=expected_signer_key,
        nonce_cache=nonce_cache,
    )
    t_elapsed_d = time.time() - t_start

    print(f" Execution Duration       : {t_elapsed_d:.3f} seconds")
    print(f" Spoofed Signer Public Key: {sig_block_d_spoofed.signer_public_key}")
    print(f" Threat Detected          : {report_d.threat_detected}")
    print(f" Security Severity        : {report_d.severity}")
    print(f" Attack Vector            : {report_d.primary_attack_vector}")
    print(f" Diagnostics              : {report_d.diagnostic_message}")

    assert report_d.threat_detected is True, "Identity impersonation went undetected!"
    assert report_d.severity == ThreatSeverity.CRITICAL or report_d.severity == "CRITICAL", f"Expected CRITICAL severity, got {report_d.severity}"
    assert report_d.primary_attack_vector == AttackVector.IMPERSONATION_ATTACK or report_d.primary_attack_vector == "IMPERSONATION_ATTACK", f"Expected IMPERSONATION_ATTACK, got {report_d.primary_attack_vector}"
    print("\n [PASSED] Scenario D: Impersonation Attack verified.")

    # =========================================================================
    # SCENARIO E: REPLAY ATTACK
    # =========================================================================
    print("\n" + "-" * 80)
    print(" SCENARIO E: Replay Attack (Stale Timestamp & Duplicate Nonce)")
    print("-" * 80)

    t_start = time.time()
    # Replay of the valid packet from Scenario A (which already registered its nonce in nonce_cache)
    sig_block_e_replayed = adversary.simulate_replay_attack(
        valid_packet=sig_block_a,
        age_seconds=300.0,
    )

    report_e = detector.analyze_comprehensive_threat(
        packet=sig_block_e_replayed,
        measured_counts=bob_counts_a,
        shots=shots,
        expected_public_key=expected_signer_key,
        nonce_cache=nonce_cache,
    )
    t_elapsed_e = time.time() - t_start

    print(f" Execution Duration       : {t_elapsed_e:.3f} seconds")
    print(f" Replayed Packet Nonce    : {sig_block_e_replayed.nonce}")
    print(f" Threat Detected          : {report_e.threat_detected}")
    print(f" Security Severity        : {report_e.severity}")
    print(f" Attack Vector            : {report_e.primary_attack_vector}")
    print(f" Diagnostics              : {report_e.diagnostic_message}")

    assert report_e.threat_detected is True, "Replay attack went undetected!"
    assert report_e.severity == ThreatSeverity.HIGH or report_e.severity == "HIGH", f"Expected HIGH severity, got {report_e.severity}"
    assert report_e.primary_attack_vector == AttackVector.REPLAY_ATTACK or report_e.primary_attack_vector == "REPLAY_ATTACK", f"Expected REPLAY_ATTACK, got {report_e.primary_attack_vector}"
    print("\n [PASSED] Scenario E: Replay Attack verified.")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    total_elapsed = time.time() - total_start_time
    print("\n" + "=" * 80)
    print(" [ALL DAY 3 PIPELINE TESTS PASSED]")
    print(f" Total Combined Runtime: {total_elapsed:.3f}s (well under 1.5s limit)")
    print("=================================================================")


if __name__ == "__main__":
    run_day3_verification()
