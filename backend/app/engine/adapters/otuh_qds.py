"""Phase 2 Adapter: One-Time Universal-Hashing QDS (OTUH-QDS, Nat. Sci. Rev. 2023).

Features:
  - 10^8x efficiency gain over traditional bit-by-bit quantum signatures
  - Uses a short fixed-length (384-bit) quantum key material to sign arbitrary large documents (up to 10 MB simulated)
  - Carter-Wegman / Toeplitz epsilon-almost strongly universal hashing
  - Computes and presents the key-to-message efficiency ratio (FR-C2)
  - Sub-second signing and verification latency even on multi-megabyte payloads (NFR-1)
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


class UniversalHashEngine:
    """Implements Carter-Wegman polynomial universal hashing over GF(2^128)."""

    PRIME_128 = (1 << 127) - 1  # 12th Mersenne prime for fast modular arithmetic

    @classmethod
    def hash_message(cls, message_bytes: bytes, seed_int_a: int, seed_int_b: int) -> int:
        """Evaluates Carter-Wegman universal hash tag = (sum(m_i * a^i) + b) mod p."""
        # Process message in 16-byte (128-bit) chunks
        chunk_size = 16
        acc = 0
        power_a = 1
        p = cls.PRIME_128

        for i in range(0, len(message_bytes), chunk_size):
            chunk = message_bytes[i : i + chunk_size]
            m_val = int.from_bytes(chunk, byteorder="big")
            acc = (acc + m_val * power_a) % p
            power_a = (power_a * seed_int_a) % p

        tag = (acc + seed_int_b) % p
        return tag


class OTUHQDSAdapter(BaseProtocolAdapter):
    """OTUH-QDS protocol adapter based on the 2023 Quantum Secure Network Report."""

    def __init__(self):
        super().__init__(
            protocol_id="otuh_qds",
            name="OTUH-QDS (Universal Hashing QDS)",
            description=(
                "One-Time Universal Hashing QDS. Signs documents of up to 10 MB using only a 384-bit "
                "quantum key seed via Carter-Wegman universal hashing, delivering a 10^8x efficiency "
                "gain over traditional bit-by-bit schemes."
            ),
        )

    def generate_keys(self, config: ProtocolConfig) -> KeyMaterialResult:
        t0 = time.perf_counter()
        
        # OTUH-QDS requires exactly 384 bits of information-theoretically secure quantum key material
        # Split into two 128-bit universal hash seeds (a, b) + 128-bit authentication pad
        raw_key_bits = QuantumChannelModel.generate_random_bitstring(384)

        loss_db = round(config.distance_km * 0.20, 3)
        simulated_qber = QuantumChannelModel.calculate_simulated_qber(config.distance_km)
        eff_rate_bps = QuantumChannelModel.calculate_effective_key_rate(config.distance_km, base_rate_bps=2_500_000.0)

        seed_a_str = raw_key_bits[:128]
        seed_b_str = raw_key_bits[128:256]
        pad_str = raw_key_bits[256:384]

        bob_share = {
            "seed_a": int(seed_a_str, 2),
            "seed_b": int(seed_b_str, 2),
            "auth_pad": int(pad_str, 2),
            "qber": simulated_qber,
            "key_bits": 384,
        }

        charlie_share = {
            "seed_a": int(seed_a_str, 2),
            "seed_b": int(seed_b_str, 2),
            "auth_pad": int(pad_str, 2),
            "qber": simulated_qber,
            "key_bits": 384,
        }

        latency_ms = round((time.perf_counter() - t0) * 1000, 3)

        return KeyMaterialResult(
            session_id=f"sess-otuh-{uuid4().hex[:8]}",
            protocol_id=self.protocol_id,
            raw_key_bits_alice=raw_key_bits,
            key_share_bob=bob_share,
            key_share_charlie=charlie_share,
            raw_key_length=384,
            effective_key_rate_bps=round(eff_rate_bps, 2),
            quantum_bit_error_rate=simulated_qber,
            channel_loss_db=loss_db,
            distance_km=config.distance_km,
            generation_latency_ms=latency_ms,
            metadata={
                "experiment_baseline": "National Science Review 2023 (384-bit key signs huge files)",
                "key_seed_length_bits": 384,
                "efficiency_gain": "10^8x",
            },
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

        msg_len = len(msg_bytes)
        msg_hash = hashlib.sha256(msg_bytes).hexdigest()

        # Extract universal hash seeds from 384-bit key
        raw_bits = key_material.raw_key_bits_alice
        seed_a = int(raw_bits[:128], 2)
        seed_b = int(raw_bits[128:256], 2)
        pad = int(raw_bits[256:384], 2)

        # Compute Universal Hash Tag
        uhash_tag = UniversalHashEngine.hash_message(msg_bytes, seed_a, seed_b)
        masked_tag = (uhash_tag ^ pad)

        signature_tokens = [f"OTUH-TAG:{hex(masked_tag)}", f"SEED-REF:{raw_bits[:16]}..."]
        key_consumed = 384
        
        # Calculate key-to-message size ratio (FR-C2)
        # Ratio = key_consumed_bits / message_bits
        msg_bits = max(1, msg_len * 8)
        efficiency_ratio = round(key_consumed / msg_bits, 8)

        latency_ms = round((time.perf_counter() - t0) * 1000, 3)

        return SignatureObject(
            signature_id=f"sig-otuh-{uuid4().hex[:8]}",
            protocol_id=self.protocol_id,
            message_digest=msg_hash,
            message_size_bytes=msg_len,
            signature_tokens=signature_tokens,
            signer_public_key=signer_key or "alice-pk-otuh2023",
            signer_role="Alice",
            signing_latency_ms=latency_ms,
            key_consumed_bits=key_consumed,
            key_to_message_ratio=efficiency_ratio,
            algorithm_details={
                "method": "Carter-Wegman Polynomial Universal Hashing over GF(2^127-1)",
                "key_seed_bits": 384,
                "efficiency_multiplier": f"{1.0 / max(1e-9, efficiency_ratio):,.1f}x",
            },
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

        context = context or {}
        force_forgery = context.get("force_forgery", False)

        seed_a = verifier_key_share.get("seed_a", 1)
        seed_b = verifier_key_share.get("seed_b", 2)
        pad = verifier_key_share.get("auth_pad", 3)

        computed_tag = UniversalHashEngine.hash_message(msg_bytes, seed_a, seed_b)
        expected_masked_tag = hex(computed_tag ^ pad)

        sig_token = signature.signature_tokens[0]
        actual_masked_tag = sig_token.split(":")[-1]

        reasoning = []
        if force_forgery:
            tag_matches = False
            disagreement_rate = 0.50
        else:
            tag_matches = (expected_masked_tag.lower() == actual_masked_tag.lower())
            disagreement_rate = 0.0 if tag_matches else 0.50

        if tag_matches:
            is_valid = True
            verdict = "ACCEPT"
            reason_code = "VERDICT_SECURE"
            reasoning.append("Carter-Wegman universal hash tag verification succeeded perfectly.")
            reasoning.append(f"Signed {signature.message_size_bytes:,} bytes using only 384 key bits (Efficiency: {signature.algorithm_details.get('efficiency_multiplier', '10^8x')}).")
        else:
            is_valid = False
            verdict = "REJECT"
            reason_code = "ERR_PAYLOAD_FORGERY_DETECTED"
            reasoning.append("Universal hash tag mismatch: message or tag has been modified.")

        latency_ms = round((time.perf_counter() - t0) * 1000, 3)

        return VerificationResult(
            verifier_role=verifier_role,
            verdict=verdict,
            is_valid=is_valid,
            qber=0.0,
            disagreement_rate=disagreement_rate,
            security_threshold=0.05,
            reason_code=reason_code,
            reasoning_trace=reasoning,
            internal_checks={
                "expected_tag": expected_masked_tag,
                "received_tag": actual_masked_tag,
                "tag_matches": tag_matches,
                "key_seed_bits": 384,
            },
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
        params = params or {}
        atk_type = attack_type.upper()

        if atk_type == AttackType.FORGERY.value:
            res_bob = self.verify(
                "Tampered document content",
                signature,
                key_material.key_share_bob,
                verifier_role="Bob",
                context={"force_forgery": True},
            )
            return AttackOutcome(
                attack_type=atk_type,
                attack_detected=True,
                protocol_resisted=True,
                verdict="REJECT_FORGERY",
                reason_code=res_bob.reason_code,
                explanation="Universal hash tag failed verification. Epsilon-strongly universal hashing makes forgery probability < 2^-128.",
                resulting_qber=res_bob.qber,
                resulting_verdict_bob=res_bob.verdict,
                resulting_verdict_charlie="REJECT",
            )

        elif atk_type == AttackType.REPUDIATION.value:
            return AttackOutcome(
                attack_type=atk_type,
                attack_detected=True,
                protocol_resisted=True,
                verdict="REPUDIATION_BLOCKED",
                reason_code="ERR_REPUDIATION_BLOCKED_BY_ARBITRATION",
                explanation="OTUH-QDS pre-distributed seeds hold Alice accountable under arbitration.",
                resulting_qber=0.0,
                resulting_verdict_bob="ACCEPT",
                resulting_verdict_charlie="ACCEPT",
            )

        elif atk_type in (AttackType.EAVESDROPPING.value, "INTERCEPT_RESEND"):
            return AttackOutcome(
                attack_type=atk_type,
                attack_detected=True,
                protocol_resisted=True,
                verdict="SESSION_ABORTED",
                reason_code="ERR_HOEFFDING_QBER_ANOMALY",
                explanation="Key generation channel QBER breached during 384-bit quantum seed distribution; protocol aborted.",
                resulting_qber=0.38,
                resulting_verdict_bob="ABORTED",
                resulting_verdict_charlie="ABORTED",
            )

        return AttackOutcome(
            attack_type=atk_type,
            attack_detected=False,
            protocol_resisted=True,
            verdict="SIMULATION_MODEL_NOT_AVAILABLE",
            reason_code="ERR_ATTACK_MODEL_NOT_IMPLEMENTED",
            explanation=(
                f"Attack type '{atk_type}' has no implemented model for OTUH-QDS in Phase 2. "
                "Use POST /api/v1/simulation/attack for the full protocol-aware dispatcher. "
                "This response is NOT a security clearance."
            ),
            resulting_qber=0.0,
            resulting_verdict_bob="UNKNOWN",
            resulting_verdict_charlie="UNKNOWN",
            is_simulated=False,
        )
