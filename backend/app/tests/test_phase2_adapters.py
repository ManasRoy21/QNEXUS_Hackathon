"""Phase 2: Comprehensive Protocol Adapters Test Suite.

Validates:
  - Common 4-method interface for all adapters (Section 5.1)
  - Practical QDS: end-to-end sign, verify, transfer, and attacks (M1)
  - MDI-QDS: detector immunity and untrusted relay toggle (M2, FR-D3)
  - OTUH-QDS: large-document signing with 384-bit key and 10^8x efficiency (M2, FR-C2)
  - Twin-Field QDS: long distance scaling and repeaterless bound traversal (M2)
  - Decoy-State QDS: multi-intensity PNS attack detection (FR-B3)
  - Performance SLA: < 2.0 seconds per operation (NFR-1)
"""

import time
import pytest
from app.engine.adapters.base import AttackType, ProtocolConfig
from app.engine.adapters.registry import protocol_registry
from app.engine.adapters.practical_qds import PracticalQDSAdapter
from app.engine.adapters.mdi_qds import MDIQDSAdapter
from app.engine.adapters.otuh_qds import OTUHQDSAdapter
from app.engine.adapters.tf_qds import TFQDSAdapter
from app.engine.adapters.decoy_qds import DecoyStateQDSAdapter


def test_registry_contains_all_adapters_and_theoretical_references():
    """Verify registry lists both interactive adapters and read-only references (FR-A1, FR-A3)."""
    protocols = protocol_registry.list_all_protocols()
    proto_ids = [p["id"] for p in protocols]

    # Required baseline interactive adapters
    assert "practical_qds" in proto_ids
    assert "mdi_qds" in proto_ids
    assert "otuh_qds" in proto_ids
    assert "tf_qds" in proto_ids
    assert "decoy_qds" in proto_ids

    # Required theoretical reference protocols
    assert "gottesman_chuang" in proto_ids
    assert "acj_coherent_state" in proto_ids
    assert "aqs_arbitrated" in proto_ids
    assert "ibqs_identity" in proto_ids
    assert "counterfactual_qds" in proto_ids

    # Theoretical entries must have is_interactive == False
    for p in protocols:
        if p["category"] == "theoretical":
            assert p["is_interactive"] is False
            assert "citation" in p


def test_practical_qds_lifecycle_and_attacks():
    """Test Practical QDS end-to-end lifecycle, transferability, and attack resistance."""
    adapter = PracticalQDSAdapter()
    config = ProtocolConfig(protocol_id="practical_qds", distance_km=25.0, num_bits=128)

    t0 = time.perf_counter()
    km = adapter.generate_keys(config)
    keygen_time = time.perf_counter() - t0
    assert keygen_time < 2.0  # NFR-1
    assert km.raw_key_length == 256
    assert km.quantum_bit_error_rate < 0.05
    assert km.is_simulated is True

    # Alice signs
    msg = "Financial Transfer Authorization: 10,000,000 EUR"
    t0 = time.perf_counter()
    sig = adapter.sign(msg, km)
    sign_time = time.perf_counter() - t0
    assert sign_time < 2.0
    assert len(sig.signature_tokens) == 2
    assert sig.signer_role == "Alice"

    # Bob verifies (FR-D1)
    t0 = time.perf_counter()
    res_bob = adapter.verify(msg, sig, km.key_share_bob, verifier_role="Bob")
    verify_time = time.perf_counter() - t0
    assert verify_time < 2.0
    assert res_bob.is_valid is True
    assert res_bob.verdict == "ACCEPT"
    assert len(res_bob.reasoning_trace) > 0

    # Charlie independent verification (Transferability, FR-D2)
    res_charlie = adapter.verify(msg, sig, km.key_share_charlie, verifier_role="Charlie")
    assert res_charlie.is_valid is True
    assert res_charlie.verdict == "ACCEPT"

    # Attack: Forgery (FR-E1)
    atk_forg = adapter.simulate_attack(AttackType.FORGERY.value, config, km, sig)
    assert atk_forg.attack_detected is True
    assert atk_forg.protocol_resisted is True
    assert atk_forg.verdict == "REJECT_FORGERY"
    assert atk_forg.resulting_verdict_bob == "REJECT"

    # Attack: Repudiation (FR-E2)
    atk_rep = adapter.simulate_attack(AttackType.REPUDIATION.value, config, km, sig)
    assert atk_rep.protocol_resisted is True
    assert atk_rep.verdict == "REPUDIATION_BLOCKED"

    # Attack: Eavesdropping (FR-E3)
    atk_eav = adapter.simulate_attack(AttackType.EAVESDROPPING.value, config, km, sig)
    assert atk_eav.attack_detected is True
    assert atk_eav.resulting_qber > 0.15


def test_mdi_qds_relay_compromise_immunity():
    """Test MDI-QDS immunity against detector side channels and untrusted node compromise (FR-D3, FR-E3)."""
    adapter = MDIQDSAdapter()
    
    # Run with untrusted node flagged as COMPROMISED
    config_compromised = ProtocolConfig(
        protocol_id="mdi_qds",
        distance_km=40.0,
        untrusted_node_compromised=True,
    )
    km = adapter.generate_keys(config_compromised)
    sig = adapter.sign("Classified Government Instruction", km)

    # Verification must SUCCEED even with node compromised!
    res_bob = adapter.verify(
        "Classified Government Instruction",
        sig,
        km.key_share_bob,
        context={"untrusted_node_compromised": True},
    )
    assert res_bob.is_valid is True
    assert res_bob.verdict == "ACCEPT"
    assert "COMPROMISED" in res_bob.untrusted_node_status

    # Attack: Laser Blinding / Detector Side Channel against MDI-QDS
    atk_res = adapter.simulate_attack("LASER_BLINDING", config_compromised, km, sig)
    assert atk_res.protocol_resisted is True
    assert atk_res.verdict == "SECURE_IMMUNE"
    assert "VERDICT_MDI_DETECTOR_IMMUNITY_CONFIRMED" in atk_res.reason_code


def test_otuh_qds_large_document_efficiency():
    """Test OTUH-QDS signing 1 MB document with short 384-bit key and 10^8x efficiency (FR-C2)."""
    adapter = OTUHQDSAdapter()
    config = ProtocolConfig(protocol_id="otuh_qds", distance_km=30.0)

    km = adapter.generate_keys(config)
    assert km.raw_key_length == 384

    # Sign a large document (1 Megabyte = 1,048,576 bytes)
    large_doc = b"CONFIDENTIAL QUANTUM DEFENSE DIRECTIVE " * 26215  # ~1 MB
    assert len(large_doc) >= 1_000_000

    t0 = time.perf_counter()
    sig = adapter.sign(large_doc, km)
    sign_time = time.perf_counter() - t0

    assert sign_time < 2.0  # Must sign 1MB in < 2 seconds (NFR-1)
    assert sig.key_consumed_bits == 384
    # Efficiency ratio: key bits / msg bits = 384 / (1000000 * 8) ~ 4.8e-5 (huge gain)
    assert sig.key_to_message_ratio < 0.0001

    # Verify large document
    t0 = time.perf_counter()
    res = adapter.verify(large_doc, sig, km.key_share_bob)
    verify_time = time.perf_counter() - t0
    assert verify_time < 2.0
    assert res.is_valid is True
    assert res.verdict == "ACCEPT"

    # Forgery against large document rejected
    res_tampered = adapter.verify(large_doc + b"TAMPER", sig, km.key_share_bob)
    assert res_tampered.is_valid is False
    assert res_tampered.verdict == "REJECT"


def test_twin_field_qds_scaling():
    """Test Twin-Field QDS adapter and sqrt(eta) scaling law over 150 km."""
    adapter = TFQDSAdapter()
    config = ProtocolConfig(protocol_id="tf_qds", distance_km=150.0)
    km = adapter.generate_keys(config)
    assert km.distance_km == 150.0
    assert km.metadata["plob_bound_surmounted"] is True

    sig = adapter.sign("Long distance packet", km)
    res = adapter.verify("Long distance packet", sig, km.key_share_bob)
    assert res.is_valid is True


def test_decoy_state_pns_attack_detection():
    """Test Decoy-State QDS adapter detects Photon Number Splitting (FR-B3)."""
    adapter = DecoyStateQDSAdapter()
    config = ProtocolConfig(protocol_id="decoy_qds", distance_km=50.0)
    km = adapter.generate_keys(config)
    assert km.decoy_statistics is not None

    sig = adapter.sign("Decoy test payload", km)
    res_clean = adapter.verify("Decoy test payload", sig, km.key_share_bob)
    assert res_clean.is_valid is True

    # Inject PNS attack
    atk_pns = adapter.simulate_attack("PNS_ATTACK", config, km, sig)
    assert atk_pns.attack_detected is True
    assert atk_pns.verdict == "REJECT_PNS_BREACH"
    assert "ERR_DECOY_PNS_ATTACK_DETECTED" in atk_pns.reason_code
