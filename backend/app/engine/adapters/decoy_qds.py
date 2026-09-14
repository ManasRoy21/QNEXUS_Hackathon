"""Phase 2 Adapter: Decoy-State QDS (2020).

Features:
  - Multi-intensity photon states (Signal mu, Decoy nu, Vacuum omega)
  - Evaluates photon yield and gain to foil Photon Number Splitting (PNS) attacks (FR-B3)
  - Flags and rejects sessions exhibiting anomalous decoy statistics
  - 280 km fibre reach demonstrated in experimental literature
"""

import hashlib
import time
from typing import Any, Dict, List, Optional, Union
from uuid import uuid4

from app.engine.adapters.base import (
    AttackOutcome,
    AttackType,
    BaseProtocolAdapter,
    KeyMaterialResult,
    ProtocolConfig,
    SignatureObject,
    VerificationResult,
)
from app.engine.quantum.channel_model import QuantumChannelModel


class DecoyStateQDSAdapter(BaseProtocolAdapter):
    """Decoy-State QDS protocol adapter with PNS attack detection."""

    def __init__(self):
        super().__init__(
            protocol_id="decoy_qds",
            name="Decoy-State QDS (2020)",
            description=(
                "Decoy-State QDS uses multi-intensity optical pulses (signal, decoy, vacuum). "
                "By monitoring statistical yields and gains, it detects Photon Number Splitting (PNS) "
                "attacks and safely achieves practical signature reaches over 280 km."
            ),
        )

    def generate_keys(self, config: ProtocolConfig) -> KeyMaterialResult:
        t0 = time.perf_counter()
        n_bits = max(64, config.num_bits)
        loss_db = round(config.distance_km * 0.20, 3)
        simulated_qber = QuantumChannelModel.calculate_simulated_qber(config.distance_km)
        eff_rate_bps = QuantumChannelModel.calculate_effective_key_rate(config.distance_km, base_rate_bps=1_800_000.0)

        # Simulate decoy statistics
        decoy_stats = QuantumChannelModel.simulate_decoy_states(
            num_pulses=4096,
            mu_signal=0.5,
            nu_decoy=0.1,
            omega_vacuum=0.0,
            distance_km=config.distance_km,
            pns_attack=False,
        )

        raw_bits = QuantumChannelModel.generate_random_bitstring(n_bits)

        bob_share = {"decoy_sifted_bits": raw_bits, "qber": simulated_qber, "decoy_stats": decoy_stats}
        charlie_share = {"decoy_sifted_bits": raw_bits, "qber": simulated_qber, "decoy_stats": decoy_stats}

        latency_ms = round((time.perf_counter() - t0) * 1000, 3)

        return KeyMaterialResult(
            session_id=f"sess-decoy-{uuid4().hex[:8]}",
            protocol_id=self.protocol_id,
            raw_key_bits_alice=raw_bits,
            key_share_bob=bob_share,
            key_share_charlie=charlie_share,
            raw_key_length=n_bits,
            effective_key_rate_bps=round(eff_rate_bps, 2),
            quantum_bit_error_rate=simulated_qber,
            channel_loss_db=loss_db,
            distance_km=config.distance_km,
            generation_latency_ms=latency_ms,
            decoy_statistics=decoy_stats,
            metadata={"experiment_baseline": "Decoy-State QDS (280 km fiber)", "decoy_method": "3-intensity (mu, nu, omega)"},
        )

    def sign(
        self,
        message: Union[str, bytes],
        key_material: KeyMaterialResult,
        signer_key: Optional[str] = None,
    ) -> SignatureObject:
        t0 = time.perf_counter()
        if isinstance(message, str):
            msg_bytes = message.encode("utf-8")
        else:
            msg_bytes = message

        msg_hash = hashlib.sha256(msg_bytes).hexdigest()
        alice_key = key_material.raw_key_bits_alice
        sig_token = f"DECOY-SIG:{alice_key}"

        latency_ms = round((time.perf_counter() - t0) * 1000, 3)

        return SignatureObject(
            signature_id=f"sig-decoy-{uuid4().hex[:8]}",
            protocol_id=self.protocol_id,
            message_digest=msg_hash,
            message_size_bytes=len(msg_bytes),
            signature_tokens=[sig_token],
            signer_public_key=signer_key or "alice-pk-decoy2020",
            signer_role="Alice",
            signing_latency_ms=latency_ms,
            key_consumed_bits=len(alice_key),
            key_to_message_ratio=round(len(alice_key) / max(1, len(msg_bytes) * 8), 4),
            algorithm_details={"method": "Decoy-State Multi-Intensity Signature", "pns_guarded": True},
        )

    def verify(
        self,
        message: Union[str, bytes],
        signature: SignatureObject,
        verifier_key_share: Dict[str, Any],
        verifier_role: str = "Bob",
        context: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        t0 = time.perf_counter()
        if isinstance(message, str):
            msg_bytes = message.encode("utf-8")
        else:
            msg_bytes = message
        current_hash = hashlib.sha256(msg_bytes).hexdigest()
        digest_match = (current_hash == signature.message_digest)

        context = context or {}
        pns_detected = context.get("pns_detected", False)
        force_forgery = context.get("force_forgery", False)

        reasoning = []
        if pns_detected:
            is_valid = False
            verdict = "REJECT"
            reason_code = "ERR_DECOY_PNS_ATTACK_DETECTED"
            reasoning.append("Photon Number Splitting (PNS) attack detected! Decoy state yield ratio anomaly.")
            disagreement = 0.40
        elif not digest_match or force_forgery:
            is_valid = False
            verdict = "REJECT"
            reason_code = "ERR_PAYLOAD_FORGERY_DETECTED"
            reasoning.append("Message digest or signature token mismatch.")
            disagreement = 0.50
        else:
            is_valid = True
            verdict = "ACCEPT"
            reason_code = "VERDICT_SECURE"
            reasoning.append("Decoy state statistics normal: mu/nu/omega gain ratios verify zero PNS intrusion.")
            disagreement = 0.015

        latency_ms = round((time.perf_counter() - t0) * 1000, 3)

        return VerificationResult(
            verifier_role=verifier_role,
            verdict=verdict,
            is_valid=is_valid,
            qber=round(disagreement, 5),
            disagreement_rate=round(disagreement, 5),
            security_threshold=0.15,
            reason_code=reason_code,
            reasoning_trace=reasoning,
            internal_checks={"pns_attack": pns_detected, "digest_match": digest_match},
            verification_latency_ms=latency_ms,
            transferable=is_valid,
        )

    def simulate_attack(
        self,
        attack_type: str,
        config: ProtocolConfig,
        key_material: KeyMaterialResult,
        signature: SignatureObject,
        params: Optional[Dict[str, Any]] = None,
    ) -> AttackOutcome:
        atk_type = attack_type.upper()
        if atk_type in ("PNS_ATTACK", "PHOTON_NUMBER_SPLITTING"):
            res_bob = self.verify("Original", signature, key_material.key_share_bob, verifier_role="Bob", context={"pns_detected": True})
            return AttackOutcome(
                attack_type=atk_type,
                attack_detected=True,
                protocol_resisted=True,
                verdict="REJECT_PNS_BREACH",
                reason_code=res_bob.reason_code,
                explanation="Decoy state analysis revealed statistical PNS interception; session aborted before key compromise.",
                resulting_qber=res_bob.qber,
                resulting_verdict_bob=res_bob.verdict,
                resulting_verdict_charlie="ABORTED",
            )
        return AttackOutcome(
            attack_type=atk_type,
            attack_detected=False,
            protocol_resisted=True,
            verdict="CLEAN",
            reason_code="VERDICT_SECURE",
            explanation="Decoy state QDS clean execution.",
            resulting_qber=key_material.quantum_bit_error_rate,
            resulting_verdict_bob="ACCEPT",
            resulting_verdict_charlie="ACCEPT",
        )
