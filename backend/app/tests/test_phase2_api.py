"""Phase 2: Comprehensive API Endpoints Integration Test Suite.

Validates:
  - Protocol catalogue & theoretical references (FR-A1, FR-A3)
  - Session creation & parameter validation (FR-A2, NFR-5)
  - Key generation, Alice signing, Bob verification, and Charlie transfer (FR-B, FR-C, FR-D)
  - Attack simulation endpoint (FR-E1 - FR-E3)
  - Benchmark sweep endpoint and SLA < 60s (FR-F2, NFR-2)
  - CSV and printable HTML audit export (FR-F3)
"""

import time
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_api_protocols_catalogue():
    """Verify GET /api/v1/protocols returns both experimental and theoretical protocols."""
    resp = client.get("/api/v1/protocols")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 8
    
    protos = {p["id"]: p for p in data["protocols"]}
    assert "practical_qds" in protos
    assert "mdi_qds" in protos
    assert "otuh_qds" in protos
    assert "gottesman_chuang" in protos

    # Check detail endpoint
    resp_detail = client.get("/api/v1/protocols/practical_qds")
    assert resp_detail.status_code == 200
    assert resp_detail.json()["name"] == "Practical QDS (Yin, Fu & Chen)"


def test_api_session_lifecycle_sign_verify_transfer():
    """Verify full sign -> verify -> transfer cycle (UC-1, FR-D2)."""
    # 1. Create session
    create_resp = client.post("/api/v1/sessions", json={
        "protocol_id": "practical_qds",
        "distance_km": 35.0,
        "message_size_bytes": 512,
        "decoy_state_count": 3,
        "failure_probability": 1e-9,
    })
    assert create_resp.status_code == 200
    session_data = create_resp.json()
    session_id = session_data["session_id"]
    assert session_data["status"] == "INITIALIZED"
    assert session_data["is_simulated"] is True

    # 2. Keygen
    keygen_resp = client.post(f"/api/v1/sessions/{session_id}/keygen", json={"session_id": session_id, "num_bits": 256})
    assert keygen_resp.status_code == 200
    assert keygen_resp.json()["status"] == "KEYS_DISTRIBUTED"
    assert keygen_resp.json()["key_material"]["quantum_bit_error_rate"] < 0.05

    # 3. Alice Signs
    sign_resp = client.post(f"/api/v1/sessions/{session_id}/sign", json={
        "session_id": session_id,
        "message": "Approved Nuclear Fuel Shipment Manifest #4092",
    })
    assert sign_resp.status_code == 200
    assert sign_resp.json()["status"] == "SIGNED"
    assert sign_resp.json()["signature"]["signer_role"] == "Alice"

    # 4. Bob Verifies
    verify_resp = client.post(f"/api/v1/sessions/{session_id}/verify", json={
        "session_id": session_id,
        "verifier_role": "Bob",
    })
    assert verify_resp.status_code == 200
    bob_data = verify_resp.json()["bob_verification"]
    assert bob_data["verdict"] == "ACCEPT"
    assert bob_data["is_valid"] is True

    # 5. Bob forwards to Charlie (Transferability, FR-D2)
    transfer_resp = client.post(f"/api/v1/sessions/{session_id}/transfer", json={"session_id": session_id})
    assert transfer_resp.status_code == 200
    charlie_data = transfer_resp.json()["charlie_verification"]
    assert charlie_data["verdict"] == "ACCEPT"
    assert transfer_resp.json()["transfer_status"] == "TRANSFER_ACCEPTED"


def test_api_session_attack_simulation():
    """Verify attack simulation endpoint against active session (Module E, UC-2)."""
    # Create MDI-QDS session
    create_resp = client.post("/api/v1/sessions", json={"protocol_id": "mdi_qds", "distance_km": 50.0})
    sid = create_resp.json()["session_id"]

    # Ingest Laser Blinding detector attack
    atk_resp = client.post(f"/api/v1/sessions/{sid}/attack", json={
        "session_id": sid,
        "attack_type": "DETECTOR_COMPROMISE",
        "intensity": 1.5,
    })
    assert atk_resp.status_code == 200
    atk_res = atk_resp.json()["last_attack"]
    assert atk_res["protocol_resisted"] is True
    assert atk_res["verdict"] == "SECURE_IMMUNE"


def test_api_benchmark_sweep_and_sla():
    """Verify benchmark sweep across 3 protocols x 5 distance points completes in < 60s (NFR-2)."""
    t0 = time.perf_counter()
    sweep_resp = client.post("/api/v1/benchmarks/sweep", json={
        "protocol_ids": ["practical_qds", "mdi_qds", "otuh_qds"],
        "distance_points_km": [10.0, 30.0, 60.0, 90.0, 120.0],
        "message_size_bytes": 1024,
    })
    elapsed = time.perf_counter() - t0

    assert sweep_resp.status_code == 200
    data = sweep_resp.json()
    assert len(data["series"]) == 3
    for s in data["series"]:
        assert len(s["points"]) == 5

    # NFR-2 SLA check: Must finish under 60 seconds
    assert elapsed < 60.0


def test_api_export_reports():
    """Verify CSV and HTML audit exports (FR-F3)."""
    create_resp = client.post("/api/v1/sessions", json={"protocol_id": "otuh_qds", "distance_km": 20.0})
    sid = create_resp.json()["session_id"]
    client.post(f"/api/v1/sessions/{sid}/sign", json={"session_id": sid, "message": "Audit test payload"})

    # Export CSV
    csv_resp = client.get(f"/api/v1/benchmarks/export/csv?session_id={sid}")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert sid in csv_resp.text
    assert "SIMULATED" in csv_resp.text

    # Export HTML Report
    html_resp = client.get(f"/api/v1/benchmarks/export/report/{sid}")
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers["content-type"]
    assert "SIMULATED QUANTUM RUN" in html_resp.text
    assert sid in html_resp.text
