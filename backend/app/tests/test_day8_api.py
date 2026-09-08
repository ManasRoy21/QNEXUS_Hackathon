"""Module E: Day 8 FastAPI REST API & WebSocket Telemetry Verification Suite.

Tests 4 end-to-end integration workflows using FastAPI TestClient:
  - Workflow 1: Clean Keygen -> Sign -> Verify (Status 200, Threat=False, QBER <= e_rob)
  - Workflow 2: Attack Injection (INTERCEPT_RESEND & FORGERY) -> Verify (Threat=True, Reason codes)
  - Workflow 3: Repudiation Attack -> Symmetrize (Module G) -> Verify (Unified REPUDIATION_ATTACK / CRITICAL)
  - Workflow 4: WebSocket Telemetry Streaming -> Connects to /ws/stream, receives frames (Valid JSON & schema)

Asserts execution completes in under 2.0s with structured ASCII output.
"""

import sys
import time
from pathlib import Path
from typing import Any, Dict

# Ensure backend root is always in sys.path
backend_root = Path(__file__).resolve().parent.parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient

from main import app

DIVIDER = "═" * 80
THIN_DIVIDER = "─" * 80


def test_workflow_1_clean_lifecycle(client: TestClient) -> None:
    """Workflow 1: Clean Keygen -> Sign -> Verify."""
    print(f"\n{DIVIDER}")
    print(" WORKFLOW 1: Clean Lifecycle (Keygen -> Sign -> Verify)")
    print(" Expected: 200 OK, threat_detected=False, verdict='SECURE', QBER <= e_rob")
    print(f"{DIVIDER}")

    # 1. Keygen
    t0 = time.perf_counter()
    r_kg = client.post("/api/v1/simulate/keygen", json={"num_bits": 16})
    print(f"  [POST /api/v1/simulate/keygen]")
    print(f"    Status Code             : {r_kg.status_code}")
    kg_data = r_kg.json()
    sid = kg_data["session_id"]
    print(f"    Session ID              : {sid}")
    print(f"    Bell Pairs Created      : {kg_data['bell_pairs_generated']}")
    assert r_kg.status_code == 200
    assert kg_data["status"] == "success"

    # 2. Sign
    r_sign = client.post(
        "/api/v1/simulate/sign",
        json={"session_id": sid, "message": "PAYMENT_TX_AUTH_8888", "signer_public_key": "alice-authorized-master-key-001"},
    )
    print(f"\n  [POST /api/v1/simulate/sign]")
    print(f"    Status Code             : {r_sign.status_code}")
    sign_data = r_sign.json()
    print(f"    Digest Encoded          : {sign_data['digest']}")
    print(f"    Target Bases (first 4)  : {sign_data['target_bases'][:4]}")
    print(f"    Pauli States (first 4)  : {sign_data['pauli_states'][:4]}")
    print(f"    Nonce                   : {sign_data['nonce']}")
    assert r_sign.status_code == 200
    assert sign_data["status"] == "success"

    # 3. Verify
    r_ver = client.post(
        "/api/v1/simulate/verify",
        json={"session_id": sid, "verifier_id": "bob", "shots": 4096, "apply_postselection": True},
    )
    print(f"\n  [POST /api/v1/simulate/verify (Bob)]")
    print(f"    Status Code             : {r_ver.status_code}")
    ver_data = r_ver.json()
    print(f"    Threat Detected         : {ver_data['threat_detected']}")
    print(f"    Verdict                 : {ver_data['verdict']}")
    print(f"    Primary Vector          : {ver_data['primary_attack_vector']}")
    print(f"    Severity                : {ver_data['severity']}")
    print(f"    Measured QBER           : {ver_data['qber']:.4%}")
    print(f"    e_rob Bound             : {ver_data['e_rob']:.4%}")
    print(f"    Postselected Shots      : {ver_data['postselected_shots']} / 4096")
    print(f"    Diagnostic              : {ver_data['diagnostic_message']}")

    assert r_ver.status_code == 200
    assert not ver_data["threat_detected"]
    assert ver_data["verdict"] == "SECURE"
    assert ver_data["qber"] <= ver_data["e_rob"]

    dur = time.perf_counter() - t0
    print(f"\n  [PASSED] Workflow 1: Clean Lifecycle Verified in {dur*1000:.2f}ms.")


def test_workflow_2_attack_injections(client: TestClient) -> None:
    """Workflow 2: Attack Injection (INTERCEPT_RESEND & FORGERY) -> Verify."""
    print(f"\n{DIVIDER}")
    print(" WORKFLOW 2: Attack Injection & Threat Classification")
    print(" Testing: INTERCEPT_RESEND (Critical QBER) & FORGERY (Tampered Bits)")
    print(f"{DIVIDER}")

    # --- Part A: Intercept-Resend Eavesdropping ---
    print("  --- Part A: Intercept-Resend Eavesdropping ---")
    r_kg = client.post("/api/v1/simulate/keygen", json={"num_bits": 16})
    sid_ir = r_kg.json()["session_id"]
    client.post("/api/v1/simulate/sign", json={"session_id": sid_ir})

    r_atk_ir = client.post(
        "/api/v1/attack/inject",
        json={"session_id": sid_ir, "attack_type": "INTERCEPT_RESEND", "intensity": 0.45, "target_verifier": "bob"},
    )
    print(f"  [POST /api/v1/attack/inject (INTERCEPT_RESEND)]")
    print(f"    Status Code             : {r_atk_ir.status_code}")
    print(f"    Description             : {r_atk_ir.json()['description']}")
    assert r_atk_ir.status_code == 200

    r_ver_ir = client.post("/api/v1/simulate/verify", json={"session_id": sid_ir, "verifier_id": "bob"})
    ver_ir = r_ver_ir.json()
    print(f"  [POST /api/v1/simulate/verify (Bob - Eavesdropped)]")
    print(f"    Threat Detected         : {ver_ir['threat_detected']}")
    print(f"    Verdict                 : {ver_ir['verdict']}")
    print(f"    Primary Vector          : {ver_ir['primary_attack_vector']}")
    print(f"    Severity                : {ver_ir['severity']}")
    print(f"    Measured QBER           : {ver_ir['qber']:.2%}")
    print(f"    Reason Codes            : {ver_ir['reason_codes']}")
    print(f"    Diagnostic              : {ver_ir['diagnostic_message']}")

    assert r_ver_ir.status_code == 200
    assert ver_ir["threat_detected"]
    assert "INTERCEPT_RESEND_EAVESDROPPING" in ver_ir["primary_attack_vector"]
    assert ver_ir["severity"] in ("CRITICAL", "HIGH")
    assert "ERR_HOEFFDING_QBER_ANOMALY" in ver_ir["reason_codes"]

    # --- Part B: Signature Payload Forgery ---
    print("\n  --- Part B: Signature Payload Forgery ---")
    r_kg_f = client.post("/api/v1/simulate/keygen", json={"num_bits": 16})
    sid_f = r_kg_f.json()["session_id"]
    client.post("/api/v1/simulate/sign", json={"session_id": sid_f})

    r_atk_f = client.post(
        "/api/v1/attack/inject",
        json={"session_id": sid_f, "attack_type": "FORGERY", "intensity": 0.5, "target_verifier": "bob"},
    )
    print(f"  [POST /api/v1/attack/inject (FORGERY)]")
    print(f"    Status Code             : {r_atk_f.status_code}")
    print(f"    Description             : {r_atk_f.json()['description']}")
    assert r_atk_f.status_code == 200

    r_ver_f = client.post("/api/v1/simulate/verify", json={"session_id": sid_f, "verifier_id": "bob"})
    ver_f = r_ver_f.json()
    print(f"  [POST /api/v1/simulate/verify (Bob - Forged)]")
    print(f"    Threat Detected         : {ver_f['threat_detected']}")
    print(f"    Verdict                 : {ver_f['verdict']}")
    print(f"    Primary Vector          : {ver_f['primary_attack_vector']}")
    print(f"    Severity                : {ver_f['severity']}")
    print(f"    Reason Codes            : {ver_f['reason_codes']}")
    print(f"    Diagnostic              : {ver_f['diagnostic_message']}")

    assert r_ver_f.status_code == 200
    assert ver_f["threat_detected"]
    assert "FORGERY_ATTEMPT" in ver_f["primary_attack_vector"]
    assert "ERR_PAYLOAD_FORGERY_DETECTED" in ver_f["reason_codes"]

    print(f"\n  [PASSED] Workflow 2: Attack Injection & Threat Classification Verified.")


def test_workflow_3_repudiation_and_symmetrization(client: TestClient) -> None:
    """Workflow 3: Repudiation Attack -> Symmetrize (Module G) -> Verify (Unified Agreement)."""
    print(f"\n{DIVIDER}")
    print(" WORKFLOW 3: Dishonest-Alice Repudiation & Symmetrization Guard (Module G)")
    print(" Expected: Symmetrization swaps 50% bits; eliminates verifier disagreement")
    print(f"{DIVIDER}")

    # 1. Keygen & Sign
    r_kg = client.post("/api/v1/simulate/keygen", json={"num_bits": 16})
    sid = r_kg.json()["session_id"]
    client.post("/api/v1/simulate/sign", json={"session_id": sid})

    # 2. Inject Repudiation Attack (Alice gives Bob clean, Charlie corrupted)
    r_atk = client.post(
        "/api/v1/attack/inject",
        json={"session_id": sid, "attack_type": "REPUDIATION", "asymmetry_rate": 0.4},
    )
    print(f"  [POST /api/v1/attack/inject (REPUDIATION)]")
    print(f"    Status Code             : {r_atk.status_code}")
    print(f"    Description             : {r_atk.json()['description']}")
    assert r_atk.status_code == 200

    # 3. Symmetrize (Classical authenticated exchange between Bob & Charlie)
    r_sym = client.post("/api/v1/symmetrize", json={"session_id": sid, "swap_ratio": 0.5, "seed": 42})
    print(f"\n  [POST /api/v1/symmetrize]")
    print(f"    Status Code             : {r_sym.status_code}")
    sym_data = r_sym.json()
    print(f"    Swap Count              : {sym_data['swap_count']} / {sym_data['total_bits']} bits")
    print(f"    Alice Informed          : {sym_data['alice_informed']} (Zero Alice visibility)")
    print(f"    Swap Indices            : {sym_data['swap_indices']}")
    assert r_sym.status_code == 200
    assert sym_data["status"] == "symmetrized"
    assert not sym_data["alice_informed"]

    # 4. Verify on 'both' verifiers
    r_ver = client.post("/api/v1/simulate/verify", json={"session_id": sid, "verifier_id": "both"})
    print(f"\n  [POST /api/v1/simulate/verify (both verifiers)]")
    print(f"    Status Code             : {r_ver.status_code}")
    ver_data = r_ver.json()
    print(f"    Threat Detected         : {ver_data['threat_detected']}")
    print(f"    Verdict                 : {ver_data['verdict']}")
    print(f"    Primary Vector          : {ver_data['primary_attack_vector']}")
    print(f"    Severity                : {ver_data['severity']}")
    print(f"    Reason Codes            : {ver_data['reason_codes']}")
    print(f"    Diagnostic              : {ver_data['diagnostic_message']}")

    assert r_ver.status_code == 200
    assert ver_data["threat_detected"]
    assert "REPUDIATION_ATTACK" in ver_data["primary_attack_vector"]
    assert ver_data["severity"] == "CRITICAL"
    assert "ERR_HOEFFDING_REPUDIATION_BOUND_BREACH" in ver_data["reason_codes"]

    print(f"\n  [PASSED] Workflow 3: Repudiation Intercepted via Symmetrization Guard.")


def test_workflow_4_websocket_stream(client: TestClient) -> None:
    """Workflow 4: Connect to WebSocket /ws/stream and validate real-time frame streaming."""
    print(f"\n{DIVIDER}")
    print(" WORKFLOW 4: WebSocket Real-Time Telemetry Stream (/ws/stream)")
    print(" Expected: Progressive lifecycle frames received as valid JSON")
    print(f"{DIVIDER}")

    r_kg = client.post("/api/v1/simulate/keygen", json={"num_bits": 16})
    sid = r_kg.json()["session_id"]
    client.post("/api/v1/simulate/sign", json={"session_id": sid})

    frames_received = []
    t0 = time.perf_counter()

    with client.websocket_connect(f"/ws/stream?session_id={sid}") as ws:
        # Receive at least 4 progressive telemetry frames
        for i in range(5):
            frame = ws.receive_json()
            frames_received.append(frame)
            print(f"    Frame {i+1}: event={frame['event_type']:<18} threat={frame['active_threat']:<10} sev={frame['severity']:<8} qber={frame['qber']:.2%}")

    dur = time.perf_counter() - t0
    print(f"\n  [WEBSOCKET TELEMETRY STREAM SUMMARY]")
    print(f"    Total Frames Streamed   : {len(frames_received)}")
    print(f"    Initial Event Code      : {frames_received[0]['event_type']}")
    print(f"    Stream Latency          : {dur*1000:.2f}ms")

    assert len(frames_received) >= 4, "Must receive multiple progressive telemetry frames"
    assert frames_received[0]["event_type"] == "CONNECTED"
    assert "channel_telemetry" in frames_received[0]
    assert frames_received[0]["session_id"] == sid

    print(f"\n  [PASSED] Workflow 4: WebSocket Telemetry Stream Verified.")


def main() -> None:
    print("=" * 80)
    print(" QDS Threat Detection Engine - Day 8 Verification Suite")
    print(" FastAPI REST API & WebSocket Real-Time Telemetry Service (Module E)")
    print("=" * 80)

    t_suite_start = time.perf_counter()
    client = TestClient(app)

    # 0. Health check
    r_health = client.get("/health")
    assert r_health.status_code == 200
    h_data = r_health.json()
    print(f"\n[BACKEND HEALTH] Engine: {h_data['engine']} (v{h_data['version']})")
    print(f"[BACKEND HEALTH] Qiskit Core SDK: v{h_data['qiskit_version']}")
    print(f"[BACKEND HEALTH] Zero ML: {h_data['zero_ml']}")
    print(f"[BACKEND HEALTH] Supported Vectors: {', '.join(h_data['registered_attack_classes'])}")

    # Workflow 1: Clean Lifecycle
    t1 = time.perf_counter()
    test_workflow_1_clean_lifecycle(client)
    dur1 = time.perf_counter() - t1

    # Workflow 2: Attack Injections
    t2 = time.perf_counter()
    test_workflow_2_attack_injections(client)
    dur2 = time.perf_counter() - t2

    # Workflow 3: Repudiation & Symmetrization
    t3 = time.perf_counter()
    test_workflow_3_repudiation_and_symmetrization(client)
    dur3 = time.perf_counter() - t3

    # Workflow 4: WebSocket Stream
    t4 = time.perf_counter()
    test_workflow_4_websocket_stream(client)
    dur4 = time.perf_counter() - t4

    # System Metrics Endpoint Check
    r_met = client.get("/api/v1/metrics")
    assert r_met.status_code == 200
    m_data = r_met.json()
    print(f"\n{DIVIDER}")
    print(" AGGREGATE SYSTEM METRICS (GET /api/v1/metrics)")
    print(f"{DIVIDER}")
    print(f"  Total Simulations Created : {m_data['total_simulations']}")
    print(f"  Total Verifications Run   : {m_data['total_verifications']}")
    print(f"  Threats Detected          : {m_data['threats_detected']}")
    print(f"  Clean Verifications       : {m_data['clean_runs']}")
    print(f"  Detection Rate            : {m_data['detection_rate']:.1f}%")
    print(f"  Active Sessions           : {m_data['active_sessions']}")

    total_time = time.perf_counter() - t_suite_start

    print(f"\n{'=' * 80}")
    print(" DAY 8 EXECUTION SUMMARY & ASSERTION VALIDATION")
    print(f"{'=' * 80}")
    print(f"  [CHECK] Workflow 1 (Clean Lifecycle)                : PASSED ({dur1*1000:.2f}ms)")
    print(f"  [CHECK] Workflow 2 (Attack Injections)              : PASSED ({dur2*1000:.2f}ms)")
    print(f"  [CHECK] Workflow 3 (Repudiation + Symmetrize)       : PASSED ({dur3*1000:.2f}ms)")
    print(f"  [CHECK] Workflow 4 (WebSocket /ws/stream)           : PASSED ({dur4*1000:.2f}ms)")
    print(f"\n  Total Execution Runtime   : {total_time:.4f} seconds (Limit: 2.0s)")

    assert total_time < 2.0, f"Total execution time exceeded 2.0s limit: {total_time:.3f}s"
    print("  [CHECK] Performance SLA (< 2.0s): PASSED ✓")

    print(f"\n{'=' * 80}")
    print(" [ALL DAY 8 API TESTS PASSED] Module E: FastAPI & WebSocket Live Telemetry Verified.")
    print(f"{'=' * 80}")


if __name__ == "__main__":
    main()
