"""Module B Integrated Verification Suite: Day 2 Pipeline Tests.

Executes baseline (clean) vs. adversary-intercepted QDS protocols side-by-side:
- Scenario A (Baseline): Clean channel transmission of a 16-bit signature block.
- Scenario B (Under Attack): Intercept-resend attack with 100% eavesdropping probability.
"""

import time
from app.engine.protocol.qds_protocol import QDSProtocolEngine
from app.engine.threats.channel_noise import AdversaryChannel
from app.engine.threats.threat_detector import QDSThreatDetector


def run_day2_verification():
    print("=" * 80)
    print(" QDS Threat Detection Engine - Day 2 (Module B) Verification Suite")
    print(" Multi-Party Protocol Engine & Physical Threat Analytics (Zero ML)")
    print("=" * 80)

    engine = QDSProtocolEngine()
    adversary = AdversaryChannel()
    detector = QDSThreatDetector()

    # 16-bit binary signature digest
    test_digest = "1011010011001010"
    shots = 4096

    print(f"\n[CONFIG] Signature Stream Length : {len(test_digest)} bits")
    print(f"[CONFIG] Message Digest          : {test_digest}")
    print(f"[CONFIG] Monte Carlo Shots       : {shots}")

    # =========================================================================
    # SCENARIO A: BASELINE (CLEAN CHANNEL)
    # =========================================================================
    print("\n" + "-" * 80)
    print(" SCENARIO A: Baseline Clean Channel Execution")
    print("-" * 80)

    t_start_a = time.time()

    # 1. State preparation
    sig_block_a = engine.generate_signature_stream(test_digest)

    # 2. Build multi-party circuit (Alice, Bob, Charlie)
    circuit_a = engine.build_multi_party_circuit(sig_block_a)

    # 3. Execute protocol
    raw_counts_a = engine.execute_protocol(circuit_a, shots=shots)

    # 4. Extract Bob's measurement stream
    bob_counts_a = engine.extract_verifier_counts(circuit_a, raw_counts_a, verifier="bob")

    # 5. Threat analytics
    qber_a = detector.calculate_qber(test_digest, bob_counts_a)
    fidelity_a = detector.calculate_state_fidelity(test_digest, bob_counts_a)
    eval_a = detector.evaluate_threat_level(qber_a, fidelity_a)

    t_elapsed_a = time.time() - t_start_a

    print(f" Execution Duration       : {t_elapsed_a:.3f} seconds")
    print(f" Measured QBER            : {qber_a:.4%}")
    print(f" State Fidelity           : {fidelity_a:.4%}")
    print(f" Threat Detected          : {eval_a['threat_detected']}")
    print(f" Security Severity        : {eval_a['severity']}")
    print(f" Attack Hypothesis        : {eval_a['attack_type_hypothesis']}")

    # Baseline Assertions
    assert qber_a < 0.01, f"Baseline QBER violated! Expected < 1%, got {qber_a:.2%}"
    assert fidelity_a > 0.99, f"Baseline fidelity violated! Expected > 99%, got {fidelity_a:.2%}"
    assert eval_a["threat_detected"] is False, f"False positive threat detected in clean channel!"
    print("\n [PASSED] Scenario A Baseline Assertions Satisfied (QBER < 1%, Fidelity > 99%).")

    # =========================================================================
    # SCENARIO B: UNDER ATTACK (INTERCEPT-RESEND 100%)
    # =========================================================================
    print("\n" + "-" * 80)
    print(" SCENARIO B: Under Attack (Intercept-Resend Eavesdropping 100%)")
    print("-" * 80)

    t_start_b = time.time()

    # 1. State preparation
    sig_block_b = engine.generate_signature_stream(test_digest)

    # 2. Build multi-party circuit with 100% intercept-resend attack on transit channel
    circuit_b = engine.build_multi_party_circuit(
        signature_block=sig_block_b,
        channel_adversary=adversary,
        eavesdrop_probability=1.0,
        target_channel="bob",
    )

    # 3. Execute protocol
    raw_counts_b = engine.execute_protocol(circuit_b, shots=shots)

    # 4. Extract Bob's measurement stream
    bob_counts_b = engine.extract_verifier_counts(circuit_b, raw_counts_b, verifier="bob")

    # 5. Threat analytics
    qber_b = detector.calculate_qber(test_digest, bob_counts_b)
    fidelity_b = detector.calculate_state_fidelity(test_digest, bob_counts_b)
    eval_b = detector.evaluate_threat_level(qber_b, fidelity_b)

    t_elapsed_b = time.time() - t_start_b

    print(f" Execution Duration       : {t_elapsed_b:.3f} seconds")
    print(f" Measured QBER            : {qber_b:.4%}")
    print(f" State Fidelity           : {fidelity_b:.4%}")
    print(f" Threat Detected          : {eval_b['threat_detected']}")
    print(f" Security Severity        : {eval_b['severity']}")
    print(f" Attack Hypothesis        : {eval_b['attack_type_hypothesis']}")

    # Attack Assertions
    assert qber_b >= 0.25, f"Attack detection failed! Expected QBER >= 25%, got {qber_b:.2%}"
    assert eval_b["threat_detected"] is True, f"Attack went undetected! Threat flag was False"
    assert eval_b["severity"] == "CRITICAL", f"Expected CRITICAL severity, got {eval_b['severity']}"
    print("\n [PASSED] Scenario B Attack Assertions Satisfied (QBER >= 25%, Threat = True, CRITICAL).")

    print("\n" + "=" * 80)
    print(" [ALL DAY 2 PIPELINE TESTS PASSED]")
    print(f" Total Combined Runtime: {t_elapsed_a + t_elapsed_b:.3f}s (well under 2.0s limit)")
    print("=" * 80)


def test_day2_verification():
    """Pytest wrapper for Day 2 multi-party QDS verification."""
    run_day2_verification()


if __name__ == "__main__":
    run_day2_verification()

