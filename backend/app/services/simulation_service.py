"""Module E: Simulation Service & Session Orchestration Layer.

Coordinates end-to-end multi-party QDS workflows across Days 1–7 modules:
  - Quantum State Key Generation & Entangled Bell Pairs (Module A & B)
  - Signature Stream Generation (Module B)
  - Pluggable Attack Injection across all 6 threat vectors (Module D)
  - Classical Symmetrization Guard (Module G)
  - Postselection & Formal Hoeffding Bound Verification (Module C & Day 7)
  - Real-Time Async WebSocket Streaming Telemetry
"""

import asyncio
import hashlib
import time
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Dict, List, Optional
from uuid import uuid4

from app.engine.protocol.qds_protocol import QDSProtocolEngine, QDSSignatureBlock
from app.engine.protocol.symmetrization import SymmetrizationGuard
from app.engine.threats.attack_simulator import AttackConfig, AttackSimulator, AttackType
from app.engine.threats.threat_detector import (
    AttackVector,
    ComprehensiveThreatReport,
    QDSThreatDetector,
    QDSThreatDetectorV1,
    ThreatSeverity,
)
from app.schemas.qds_schemas import (
    AttackInjectRequest,
    AttackInjectResponse,
    KeygenRequest,
    KeygenResponse,
    LiveTelemetryMessage,
    MetricsResponse,
    SignRequest,
    SignResponse,
    SymmetrizeRequest,
    SymmetrizeResponse,
    VerifyRequest,
    VerifyResponse,
)


@dataclass
class SimulationSession:
    """In-memory state container representing an active multi-party QDS session."""

    session_id: str
    num_bits: int = 16
    digest: str = "1011010011001010"
    parties: List[str] = field(default_factory=lambda: ["alice", "bob", "charlie"])
    alice_block: Optional[QDSSignatureBlock] = None
    bob_block: Optional[QDSSignatureBlock] = None
    charlie_block: Optional[QDSSignatureBlock] = None
    raw_counts_bob: Optional[Dict[str, int]] = None
    raw_counts_charlie: Optional[Dict[str, int]] = None
    null_channel_counts: Optional[Dict[str, int]] = None
    precomputed_qber_bob: Optional[float] = None
    precomputed_qber_charlie: Optional[float] = None
    active_attacks: List[Dict[str, Any]] = field(default_factory=list)
    is_symmetrized: bool = False
    symmetrization_telemetry: Optional[Dict[str, Any]] = None
    last_verify_reports: Dict[str, ComprehensiveThreatReport] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)


class SimulationService:
    """Production service managing simulation lifecycles, states, and telemetry."""

    def __init__(self):
        self._sessions: Dict[str, SimulationSession] = {}
        self._protocol_engine = QDSProtocolEngine()
        self._threat_detector = QDSThreatDetectorV1(max_age_seconds=60.0)
        self._symmetrization_guard = SymmetrizationGuard()

        # Cumulative system metrics counters
        self._total_simulations: int = 0
        self._total_verifications: int = 0
        self._threats_detected: int = 0
        self._clean_runs: int = 0
        self._qber_history: List[float] = []

    # ─────────────────────────────────────────────────────────────────────────
    # Session Management
    # ─────────────────────────────────────────────────────────────────────────

    def get_or_create_session(self, session_id: Optional[str] = None, num_bits: int = 16) -> SimulationSession:
        """Retrieves an existing session or initializes a new one."""
        sid = session_id or f"qds-{uuid4().hex[:8]}"
        if sid not in self._sessions:
            self._sessions[sid] = SimulationSession(session_id=sid, num_bits=num_bits)
            self._total_simulations += 1
        return self._sessions[sid]

    def get_session(self, session_id: str) -> SimulationSession:
        """Retrieves session or raises KeyError if missing."""
        if session_id not in self._sessions:
            raise KeyError(f"Session '{session_id}' not found. Please initialize with /simulate/keygen first.")
        return self._sessions[session_id]

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Key Generation Endpoint Handler
    # ─────────────────────────────────────────────────────────────────────────

    def keygen(self, request: KeygenRequest) -> KeygenResponse:
        """Executes key generation step: initiates Bell state distribution."""
        session = self.get_or_create_session(request.session_id, request.num_bits)
        session.parties = request.parties

        # Default initial digest matching requested bit length
        default_pattern = ("1011010011001010" * ((request.num_bits // 16) + 1))[: request.num_bits]
        session.digest = default_pattern

        return KeygenResponse(
            status="success",
            session_id=session.session_id,
            num_bits=session.num_bits,
            bell_pairs_generated=session.num_bits,
            parties=session.parties,
            timestamp=time.time(),
            message=f"Generated {session.num_bits} entangled Bell pairs across {', '.join(session.parties)}.",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Signing Endpoint Handler
    # ─────────────────────────────────────────────────────────────────────────

    def sign(self, request: SignRequest) -> SignResponse:
        """Prepares quantum signature blocks for Bob and Charlie."""
        session = self.get_session(request.session_id)

        # Derive binary digest
        if request.message_digest:
            digest = request.message_digest
        elif request.message:
            # Hash classical message to bitstring matching num_bits
            h = hashlib.sha256(request.message.encode("utf-8")).hexdigest()
            b = bin(int(h, 16))[2:].zfill(256)
            digest = b[: session.num_bits]
        else:
            digest = session.digest

        session.digest = digest

        # Generate signature stream using Module B protocol engine
        alice_block = self._protocol_engine.generate_signature_stream(
            digest=digest,
            signer_public_key=request.signer_public_key,
        )
        session.alice_block = alice_block
        session.bob_block = deepcopy(alice_block)
        session.charlie_block = deepcopy(alice_block)

        # Initialize clean measurement counts for both verifiers
        shots = 4096
        session.raw_counts_bob = {digest: shots}
        session.raw_counts_charlie = {digest: shots}
        session.precomputed_qber_bob = 0.0
        session.precomputed_qber_charlie = 0.0

        return SignResponse(
            status="success",
            session_id=session.session_id,
            digest=session.digest,
            target_bases=alice_block.target_bases,
            pauli_states=alice_block.pauli_states,
            signer_public_key=alice_block.signer_public_key,
            timestamp=alice_block.timestamp,
            nonce=alice_block.nonce,
            message="Quantum signature block generated and distributed to verifiers.",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Attack Injection Endpoint Handler
    # ─────────────────────────────────────────────────────────────────────────

    def inject_attack(self, request: AttackInjectRequest) -> AttackInjectResponse:
        """Applies configured attack transformation to active verifier blocks."""
        session = self.get_session(request.session_id)

        try:
            attack_type = AttackType(request.attack_type.upper())
        except ValueError:
            valid_types = [a.value for a in AttackType]
            raise ValueError(f"Invalid attack_type '{request.attack_type}'. Must be one of {valid_types}.")

        config = AttackConfig(
            attack_type=attack_type,
            intensity=request.intensity,
            spoofed_public_key=request.spoofed_public_key or "mallory-unauthorized-key-0xDEADBEEF",
            replay_age_seconds=request.replay_age_seconds or 300.0,
            asymmetry_rate=request.asymmetry_rate or 0.4,
            path_bias_intensity=request.path_bias_intensity or 0.45,
        )

        metadata: Dict[str, Any] = {}
        description = ""

        # Special handling for Repudiation (returns two blocks: clean Bob, corrupted Charlie)
        if attack_type == AttackType.REPUDIATION:
            if not session.alice_block:
                raise ValueError("Cannot inject repudiation before signing. Run /simulate/sign first.")
            bob_blk, charlie_blk = AttackSimulator.simulate_repudiation_attack(
                session.alice_block, asymmetry_rate=config.asymmetry_rate
            )
            session.bob_block = bob_blk
            session.charlie_block = charlie_blk
            session.precomputed_qber_bob = 0.0
            session.precomputed_qber_charlie = 0.1875
            description = (
                f"Dishonest Alice distributed clean block to Bob and corrupted block to Charlie "
                f"at asymmetry_rate={config.asymmetry_rate:.0%}."
            )
            metadata = {
                "attack_type": attack_type.value,
                "asymmetry_rate": config.asymmetry_rate,
                "corrupted_indices": charlie_blk.public_key_registers.get("corrupted_indices", []),
            }

        # Special handling for Detector Side-Channel
        elif attack_type == AttackType.DETECTOR_SIDE_CHANNEL:
            target_block = session.charlie_block if request.target_verifier == "charlie" else session.bob_block
            if not target_block:
                raise ValueError("Cannot inject attack before signing. Run /simulate/sign first.")
            biased_pkt, meta = AttackSimulator.simulate_detector_side_channel_attack(
                target_block, path_bias_intensity=config.path_bias_intensity
            )
            if request.target_verifier == "charlie":
                session.charlie_block = biased_pkt
            else:
                session.bob_block = biased_pkt
            description = meta["description"]
            metadata = meta

        # Standard attacks: Intercept-Resend, Forgery, Impersonation, Replay
        else:
            target_block = session.charlie_block if request.target_verifier == "charlie" else session.bob_block
            if not target_block:
                raise ValueError("Cannot inject attack before signing. Run /simulate/sign first.")

            transformed_block, meta = AttackSimulator.inject_attack(target_block, config)
            if request.target_verifier == "charlie":
                session.charlie_block = transformed_block
            else:
                session.bob_block = transformed_block

            # Update measurement/QBER telemetry
            if attack_type == AttackType.INTERCEPT_RESEND:
                qber_elevated = 0.415
                if request.target_verifier == "charlie":
                    session.precomputed_qber_charlie = qber_elevated
                else:
                    session.precomputed_qber_bob = qber_elevated
            elif attack_type == AttackType.FORGERY:
                # Update measurement counts to reflect tampered bitstring
                tampered_digest = transformed_block.digest
                new_counts = {tampered_digest: 4096}
                if request.target_verifier == "charlie":
                    session.raw_counts_charlie = new_counts
                else:
                    session.raw_counts_bob = new_counts

            description = meta.get("description", f"{attack_type.value} injected.")
            metadata = meta

        session.active_attacks.append({
            "attack_type": attack_type.value,
            "target": request.target_verifier,
            "intensity": request.intensity,
            "timestamp": time.time(),
        })

        return AttackInjectResponse(
            status="attack_injected",
            session_id=session.session_id,
            attack_type=attack_type.value,
            intensity=request.intensity,
            description=description,
            metadata=metadata,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Symmetrization Endpoint Handler (Module G)
    # ─────────────────────────────────────────────────────────────────────────

    def symmetrize(self, request: SymmetrizeRequest) -> SymmetrizeResponse:
        """Performs classical authenticated swap between Bob & Charlie."""
        session = self.get_session(request.session_id)
        if not session.bob_block or not session.charlie_block:
            raise ValueError("Both Bob and Charlie blocks must exist before symmetrization. Run /simulate/sign first.")

        sym_bob, sym_charlie, telemetry = self._symmetrization_guard.perform_symmetrization(
            session.bob_block,
            session.charlie_block,
            swap_ratio=request.swap_ratio,
            seed=request.seed,
        )

        session.bob_block = sym_bob
        session.charlie_block = sym_charlie
        session.is_symmetrized = True
        session.symmetrization_telemetry = {
            "swap_count": telemetry.swap_count,
            "total_bits": telemetry.total_bits,
            "swap_indices": telemetry.swap_indices,
            "swap_ratio_actual": telemetry.swap_ratio_actual,
            "alice_informed": telemetry.alice_informed,
        }

        # If repudiation was active, Bob now inherits half the errors
        if session.precomputed_qber_charlie and session.precomputed_qber_charlie > 0.15:
            session.precomputed_qber_bob = 0.1875
            session.precomputed_qber_charlie = 0.0

        return SymmetrizeResponse(
            status="symmetrized",
            session_id=session.session_id,
            swap_count=telemetry.swap_count,
            total_bits=telemetry.total_bits,
            swap_ratio_actual=telemetry.swap_ratio_actual,
            alice_informed=telemetry.alice_informed,
            swap_indices=telemetry.swap_indices,
            message="Module G classical symmetrization swap completed between Bob and Charlie.",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Verification Endpoint Handler
    # ─────────────────────────────────────────────────────────────────────────

    def verify(self, request: VerifyRequest) -> VerifyResponse:
        """Executes comprehensive threat verification with Hoeffding bounds and postselection."""
        session = self.get_session(request.session_id)
        auth_key = request.expected_public_key or "alice-authorized-master-key-001"

        def _evaluate_single(verifier: str) -> ComprehensiveThreatReport:
            block = session.bob_block if verifier == "bob" else session.charlie_block
            counts = session.raw_counts_bob if verifier == "bob" else session.raw_counts_charlie
            precomputed_q = session.precomputed_qber_bob if verifier == "bob" else session.precomputed_qber_charlie

            if not block:
                raise ValueError(f"Block for verifier '{verifier}' not prepared. Run /simulate/sign first.")

            # Attach boundary noise if clean counts to demonstrate postselection filtering
            effective_counts = counts or {session.digest: request.shots}
            if request.apply_postselection and len(effective_counts) == 1:
                effective_counts = AttackSimulator.attach_boundary_noise(
                    effective_counts, noise_fraction=request.ambiguity_margin
                )

            return self._threat_detector.analyze_comprehensive_threat(
                packet=block,
                measured_counts=effective_counts,
                shots=request.shots,
                expected_public_key=auth_key,
                precomputed_qber=precomputed_q,
                apply_postselection_filter=request.apply_postselection,
                ambiguity_margin=request.ambiguity_margin,
            )

        # Verifier routing
        if request.verifier_id.lower() == "both":
            rep_bob = _evaluate_single("bob")
            rep_charlie = _evaluate_single("charlie")
            session.last_verify_reports["bob"] = rep_bob
            session.last_verify_reports["charlie"] = rep_charlie

            # Check for unified repudiation if symmetrized
            if session.is_symmetrized and session.bob_block and session.charlie_block:
                final_rep = self._threat_detector.detect_repudiation_asymmetry(
                    rep_bob, rep_charlie, session.bob_block, session.charlie_block
                )
            else:
                final_rep = rep_bob if rep_bob.threat_detected else rep_charlie

            both_reports = {
                "bob": {
                    "threat_detected": rep_bob.threat_detected,
                    "primary_vector": (
                        rep_bob.primary_attack_vector.value
                        if hasattr(rep_bob.primary_attack_vector, "value")
                        else str(rep_bob.primary_attack_vector)
                    ),
                    "qber": rep_bob.qber_metrics.get("measured_qber", 0.0),
                    "diagnostic": rep_bob.diagnostic_message,
                },
                "charlie": {
                    "threat_detected": rep_charlie.threat_detected,
                    "primary_vector": (
                        rep_charlie.primary_attack_vector.value
                        if hasattr(rep_charlie.primary_attack_vector, "value")
                        else str(rep_charlie.primary_attack_vector)
                    ),
                    "qber": rep_charlie.qber_metrics.get("measured_qber", 0.0),
                    "diagnostic": rep_charlie.diagnostic_message,
                },
            }
        else:
            v_id = "bob" if request.verifier_id.lower() == "bob" else "charlie"
            final_rep = _evaluate_single(v_id)
            session.last_verify_reports[v_id] = final_rep
            both_reports = None

        # Metrics aggregation
        self._total_verifications += 1
        qm = final_rep.qber_metrics
        self._qber_history.append(qm.get("measured_qber", 0.0))
        if final_rep.threat_detected:
            self._threats_detected += 1
        else:
            self._clean_runs += 1

        verdict_str = "THREAT DETECTED" if final_rep.threat_detected else "SECURE"
        reason_codes = [final_rep.reason_code] if final_rep.reason_code else []

        vector_str = (
            final_rep.primary_attack_vector.value
            if hasattr(final_rep.primary_attack_vector, "value")
            else str(final_rep.primary_attack_vector)
        )
        severity_str = (
            final_rep.severity.value
            if hasattr(final_rep.severity, "value")
            else str(final_rep.severity)
        )

        return VerifyResponse(
            status="verified",
            session_id=session.session_id,
            verifier_id=request.verifier_id,
            threat_detected=final_rep.threat_detected,
            verdict=verdict_str,
            primary_attack_vector=vector_str,
            severity=severity_str,
            qber=float(qm.get("measured_qber", 0.0)),
            fidelity=float(final_rep.fidelity),
            e_rob=float(qm.get("e_rob", 0.0654)),
            e_rep=float(qm.get("e_rep", 0.1354)),
            e_forg=float(qm.get("e_forg", 0.2054)),
            hoeffding_threshold=float(qm.get("hoeffding_threshold", 0.1354)),
            reason_codes=reason_codes,
            diagnostic_message=final_rep.diagnostic_message,
            postselected_shots=int(qm.get("postselected_shots", request.shots)),
            discarded_shots=int(qm.get("discarded_shots", 0)),
            both_reports=both_reports,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Global System Metrics Handler
    # ─────────────────────────────────────────────────────────────────────────

    def get_metrics(self) -> MetricsResponse:
        """Returns cumulative backend metrics and attack detection efficiency."""
        total_v = self._total_verifications
        # Detection rate = threats blocked / total verifications performed.
        # Using total_verifications (not threats+clean_runs) avoids the
        # accounting gap where simulations > verifications (some sessions are
        # keygen-only and never reach the verify step).
        det_rate = (self._threats_detected / max(1, total_v)) * 100.0
        avg_qber = sum(self._qber_history) / max(1, len(self._qber_history))

        return MetricsResponse(
            total_simulations=self._total_simulations,
            total_verifications=total_v,
            threats_detected=self._threats_detected,
            clean_runs=self._clean_runs,
            detection_rate=float(round(det_rate, 2)),
            average_qber=float(round(avg_qber, 4)),
            active_sessions=len(self._sessions),
            supported_attack_classes=[a.value for a in AttackType if a != AttackType.CLEAN],
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Asynchronous WebSocket Telemetry Stream Generator
    # ─────────────────────────────────────────────────────────────────────────

    async def stream_simulation_telemetry(self, session_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Asynchronously streams simulation lifecycle events at 20-40ms intervals."""
        session = self.get_or_create_session(session_id)

        events = [
            ("CONNECTED", "WebSocket client connected to QDS real-time telemetry stream.", 0.0, "CLEAN", "LOW"),
            ("KEYGEN", f"Entangled Bell-state key generation active ({session.num_bits} qubits).", 0.0, "CLEAN", "LOW"),
            ("STATE_PREPARATION", "Alice encoded message digest into Pauli eigenstates (+, -, 0, 1).", 0.0, "CLEAN", "LOW"),
            ("CHANNEL_TRANSIT", "Multi-party quantum state distribution over simulated optical links.", 0.01, "CLEAN", "LOW"),
            ("POSTSELECTION", "Postselection layer active: marginal boundary zone shots filtered.", 0.0, "CLEAN", "LOW"),
            ("THREAT_EVALUATION", "Hoeffding bounds evaluated (e_rob, e_rep, e_forg).", 0.0, "CLEAN", "LOW"),
            ("COMPLETE", "QDS verification complete. Telemetry stream ready.", 0.0, "CLEAN", "LOW"),
        ]

        for ev_type, desc, q, threat, sev in events:
            # Update values if session has active attacks
            if session.active_attacks and ev_type in ("CHANNEL_TRANSIT", "THREAT_EVALUATION", "COMPLETE"):
                latest_attack = session.active_attacks[-1]["attack_type"]
                threat = latest_attack
                sev = "CRITICAL" if latest_attack in ("INTERCEPT_RESEND", "REPUDIATION", "DETECTOR_SIDE_CHANNEL") else "HIGH"
                q = session.precomputed_qber_bob or session.precomputed_qber_charlie or 0.25

            frame = LiveTelemetryMessage(
                timestamp=time.time(),
                event_type=ev_type,
                session_id=session.session_id,
                qber=q,
                hoeffding_threshold=0.1354,
                active_threat=threat,
                severity=sev,
                channel_telemetry={
                    "description": desc,
                    "parties": session.parties,
                    "num_bits": session.num_bits,
                    "is_symmetrized": session.is_symmetrized,
                    "active_attacks_count": len(session.active_attacks),
                },
            )
            yield frame.model_dump()
            await asyncio.sleep(0.025)


# Global singleton instance
simulation_service = SimulationService()
