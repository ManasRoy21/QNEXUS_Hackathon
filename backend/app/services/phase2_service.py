"""Phase 2 Simulation Service & Session Manager.

Coordinates end-to-end multi-party QDS lifecycles across all Phase 2 protocol adapters:
  - Protocol selection & session initialization (FR-A1, FR-A2)
  - Simulated key/state generation (FR-B1, FR-B2, FR-B3)
  - Alice signing & large-document processing (FR-C1, FR-C2)
  - Bob verification & reasoning traces (FR-D1)
  - Independent Charlie verification & Transferability (FR-D2)
  - MDI untrusted node toggle (FR-D3)
  - Attack simulations: Forgery, Repudiation, Eavesdropping, Blinding (FR-E1 - FR-E3)
  - Cross-protocol benchmark sweeps (FR-F2)
  - CSV / PDF export reporting (FR-F3)
"""

import csv
import io
import time
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.engine.adapters.base import (
    AttackOutcome,
    BaseProtocolAdapter,
    KeyMaterialResult,
    ProtocolConfig,
    SignatureObject,
    VerificationResult,
)
from app.engine.adapters.registry import protocol_registry
from app.schemas.phase2_schemas import (
    BenchmarkPoint,
    BenchmarkSweepRequest,
    BenchmarkSweepResponse,
    CreateSessionRequest,
    ProtocolBenchmarkSeries,
    SessionStateResponse,
)


class Phase2Session:
    """Encapsulates the state and audit trace of a Phase 2 protocol run."""

    def __init__(self, session_id: str, config: ProtocolConfig, adapter: BaseProtocolAdapter):
        self.session_id = session_id
        self.config = config
        self.adapter = adapter
        self.created_at = time.time()
        self.status = "INITIALIZED"

        self.key_material: Optional[KeyMaterialResult] = None
        self.signature: Optional[SignatureObject] = None
        self.last_message: Optional[str] = None
        self.bob_verification: Optional[VerificationResult] = None
        self.charlie_verification: Optional[VerificationResult] = None
        self.transfer_status: Optional[str] = None
        self.last_attack: Optional[AttackOutcome] = None
        self.trace: List[Dict[str, Any]] = []

        self._record_trace("SESSION_CREATED", "Session initialized with protocol", {
            "protocol_id": adapter.protocol_id,
            "protocol_name": adapter.name,
            "distance_km": config.distance_km,
            "channel_loss_db": config.channel_loss_db,
        })

    def _record_trace(self, step: str, description: str, data: Dict[str, Any]):
        self.trace.append({
            "step": step,
            "description": description,
            "timestamp": round(time.time(), 3),
            "data": data,
        })


class Phase2Service:
    """Service orchestrating Phase 2 protocol executions, sessions, and benchmarks."""

    def __init__(self):
        self._sessions: Dict[str, Phase2Session] = {}

    def create_session(self, request: CreateSessionRequest) -> SessionStateResponse:
        """Initializes a new session configured for a chosen protocol."""
        adapter = protocol_registry.get_adapter(request.protocol_id)
        if not adapter:
            raise ValueError(f"Protocol '{request.protocol_id}' is not an interactive protocol or is unknown.")

        sid = f"qds2-{uuid4().hex[:8]}"
        config = ProtocolConfig(
            protocol_id=request.protocol_id,
            distance_km=request.distance_km,
            channel_loss_db=request.channel_loss_db,
            message_size_bytes=request.message_size_bytes,
            decoy_state_count=request.decoy_state_count,
            failure_probability=request.failure_probability,
            untrusted_node_compromised=request.untrusted_node_compromised,
        )
        session = Phase2Session(session_id=sid, config=config, adapter=adapter)
        self._sessions[sid] = session

        return self._to_response(session)

    def get_session(self, session_id: str) -> Phase2Session:
        if session_id not in self._sessions:
            raise KeyError(f"Phase 2 Session '{session_id}' not found.")
        return self._sessions[session_id]

    def keygen(self, session_id: str, num_bits: int = 384) -> SessionStateResponse:
        """Generates simulated quantum key material (Module B)."""
        session = self.get_session(session_id)
        session.config.num_bits = num_bits

        session._record_trace("KEY_REQUEST", "Alice requests quantum key material from distribution engine", {
            "requested_bits": num_bits,
            "distance_km": session.config.distance_km,
        })

        key_material = session.adapter.generate_keys(session.config)
        session.key_material = key_material
        session.status = "KEYS_DISTRIBUTED"

        session._record_trace("KEY_DISTRIBUTED", "Simulated quantum keys distributed to Alice, Bob, and Charlie", {
            "raw_key_length": key_material.raw_key_length,
            "effective_key_rate_bps": key_material.effective_key_rate_bps,
            "qber": key_material.quantum_bit_error_rate,
            "latency_ms": key_material.generation_latency_ms,
        })

        return self._to_response(session)

    def sign(self, session_id: str, message: str, large_doc_simulated_kb: Optional[int] = None) -> SessionStateResponse:
        """Alice signs message or large document (Module C)."""
        session = self.get_session(session_id)
        if not session.key_material:
            # Auto-generate keys if not explicitly called
            session.key_material = session.adapter.generate_keys(session.config)

        if large_doc_simulated_kb:
            # Generate dummy bytes of requested size to demonstrate OTUH-QDS efficiency
            msg_bytes = ("QDS-DOC-BLOCK-" * 64).encode("utf-8") * (large_doc_simulated_kb * 1024 // 1024)
            msg_str = f"[SIMULATED {large_doc_simulated_kb} KB DOCUMENT]"
        else:
            msg_bytes = message.encode("utf-8")
            msg_str = message

        session.last_message = msg_str
        session._record_trace("ALICE_SIGN", f"Alice applies {session.adapter.name} signing algorithm", {
            "message_length_bytes": len(msg_bytes),
            "key_available_bits": session.key_material.raw_key_length,
        })

        sig_obj = session.adapter.sign(msg_bytes, session.key_material)
        session.signature = sig_obj
        session.status = "SIGNED"

        session._record_trace("SIGNATURE_PRODUCED", "Signature object generated and ready for transmission", {
            "signature_id": sig_obj.signature_id,
            "key_consumed_bits": sig_obj.key_consumed_bits,
            "key_to_message_ratio": sig_obj.key_to_message_ratio,
            "latency_ms": sig_obj.signing_latency_ms,
        })

        return self._to_response(session)

    def verify(
        self,
        session_id: str,
        verifier_role: str = "Bob",
        force_forgery: bool = False,
        untrusted_node_compromised: Optional[bool] = None,
    ) -> SessionStateResponse:
        """Bob or Charlie executes verification check (Module D)."""
        session = self.get_session(session_id)
        if not session.signature or not session.key_material:
            raise ValueError("Cannot verify without an existing key generation and signature.")

        msg = session.last_message or "Default message"
        if verifier_role.lower() == "charlie":
            key_share = session.key_material.key_share_charlie
        else:
            key_share = session.key_material.key_share_bob

        ctx = {"force_forgery": force_forgery}
        if untrusted_node_compromised is not None:
            ctx["untrusted_node_compromised"] = untrusted_node_compromised

        session._record_trace("VERIFICATION_STARTED", f"{verifier_role} begins verification of received signature", {
            "verifier_role": verifier_role,
            "force_forgery": force_forgery,
        })

        res = session.adapter.verify(msg, session.signature, key_share, verifier_role=verifier_role, context=ctx)

        if verifier_role.lower() == "charlie":
            session.charlie_verification = res
        else:
            session.bob_verification = res

        session._record_trace("VERIFICATION_RESULT", f"{verifier_role} returned verdict: {res.verdict}", {
            "verdict": res.verdict,
            "reason_code": res.reason_code,
            "qber": res.qber,
            "security_threshold": res.security_threshold,
            "latency_ms": res.verification_latency_ms,
        })

        return self._to_response(session)

    def transfer(self, session_id: str) -> SessionStateResponse:
        """Bob forwards accepted signature to Charlie to prove Transferability (FR-D2)."""
        session = self.get_session(session_id)
        if not session.bob_verification or not session.bob_verification.is_valid:
            raise ValueError("Transfer requires an accepted signature by Bob first.")

        session._record_trace("BOB_FORWARD_CHARLIE", "Bob forwards (message, signature) pair to Charlie for independent arbitration", {
            "forwarded_by": "Bob",
            "received_by": "Charlie",
        })

        # Charlie independently verifies using his independently held share
        charlie_res = session.adapter.verify(
            session.last_message or "",
            session.signature,
            session.key_material.key_share_charlie,
            verifier_role="Charlie",
        )
        session.charlie_verification = charlie_res

        if charlie_res.is_valid:
            session.transfer_status = "TRANSFER_ACCEPTED"
            session._record_trace("TRANSFER_VERIFIED", "Charlie independently accepted signature: Transferability confirmed!", {
                "transferable": True,
                "charlie_verdict": charlie_res.verdict,
            })
        else:
            session.transfer_status = "TRANSFER_REJECTED"
            session._record_trace("TRANSFER_FAILED", "Charlie rejected transferred signature: Transferability broken!", {
                "transferable": False,
                "reason": charlie_res.reason_code,
            })

        return self._to_response(session)

    def simulate_attack(
        self,
        session_id: str,
        attack_type: str,
        intensity: float = 1.0,
        target_role: str = "Bob",
    ) -> SessionStateResponse:
        """Injects attack against session (Module E)."""
        session = self.get_session(session_id)
        if not session.signature or not session.key_material:
            # Auto-run keygen & sign if not yet done
            if not session.key_material:
                session.key_material = session.adapter.generate_keys(session.config)
            session.signature = session.adapter.sign("Attack target document", session.key_material)
            session.last_message = "Attack target document"

        session._record_trace("ATTACK_INJECTED", f"Injecting {attack_type} attack (intensity={intensity})", {
            "attack_type": attack_type,
            "target": target_role,
        })

        outcome = session.adapter.simulate_attack(
            attack_type=attack_type,
            config=session.config,
            key_material=session.key_material,
            signature=session.signature,
            params={"intensity": intensity, "target_role": target_role},
        )
        session.last_attack = outcome

        session._record_trace("ATTACK_RESOLVED", f"Attack outcome evaluated: {outcome.verdict}", {
            "protocol_resisted": outcome.protocol_resisted,
            "verdict": outcome.verdict,
            "reason_code": outcome.reason_code,
            "explanation": outcome.explanation,
        })

        return self._to_response(session)

    def run_benchmark_sweep(self, request: BenchmarkSweepRequest) -> BenchmarkSweepResponse:
        """Runs a configurable multi-protocol sweep across distances (FR-F2)."""
        t0 = time.perf_counter()
        sweep_id = f"sweep-{uuid4().hex[:8]}"
        all_series: List[ProtocolBenchmarkSeries] = []

        for pid in request.protocol_ids:
            adapter = protocol_registry.get_adapter(pid)
            if not adapter:
                continue

            points: List[BenchmarkPoint] = []
            for dist in request.distance_points_km:
                cfg = ProtocolConfig(
                    protocol_id=pid,
                    distance_km=dist,
                    message_size_bytes=request.message_size_bytes,
                )
                km = adapter.generate_keys(cfg)
                sig = adapter.sign(b"Benchmark test payload", km)
                ver = adapter.verify(b"Benchmark test payload", sig, km.key_share_bob)

                points.append(
                    BenchmarkPoint(
                        distance_km=dist,
                        channel_loss_db=km.channel_loss_db,
                        effective_key_rate_bps=km.effective_key_rate_bps,
                        simulated_qber=km.quantum_bit_error_rate,
                        signing_latency_ms=sig.signing_latency_ms,
                        verification_latency_ms=ver.verification_latency_ms,
                        key_consumed_bits=sig.key_consumed_bits,
                        key_to_message_ratio=sig.key_to_message_ratio,
                        verdict=ver.verdict,
                    )
                )

            all_series.append(
                ProtocolBenchmarkSeries(
                    protocol_id=pid,
                    protocol_name=adapter.name,
                    points=points,
                )
            )

        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        return BenchmarkSweepResponse(
            sweep_id=sweep_id,
            parameters=request,
            series=all_series,
            total_execution_time_ms=elapsed_ms,
        )

    def export_csv(self, session_id: Optional[str] = None) -> str:
        """Exports session trace and metrics as CSV (FR-F3)."""
        output = io.StringIO()
        writer = csv.writer(output)

        if session_id and session_id in self._sessions:
            sess = self._sessions[session_id]
            writer.writerow(["QDS PLATFORM PHASE 2 - SESSION REPORT (SIMULATED)"])
            writer.writerow(["Session ID", sess.session_id])
            writer.writerow(["Protocol", sess.adapter.name])
            writer.writerow(["Simulated Distance (km)", sess.config.distance_km])
            writer.writerow(["Channel Loss (dB)", sess.config.channel_loss_db])
            writer.writerow(["Status", sess.status])
            writer.writerow([])
            writer.writerow(["STEP", "TIMESTAMP", "DESCRIPTION", "KEY DATA"])
            for event in sess.trace:
                writer.writerow([event["step"], event["timestamp"], event["description"], str(event["data"])])
        else:
            # Export all sessions summary
            writer.writerow(["SESSION_ID", "PROTOCOL", "DISTANCE_KM", "STATUS", "BOB_VERDICT", "CHARLIE_VERDICT", "SIMULATED"])
            for s in self._sessions.values():
                bob_v = s.bob_verification.verdict if s.bob_verification else "N/A"
                charlie_v = s.charlie_verification.verdict if s.charlie_verification else "N/A"
                writer.writerow([s.session_id, s.adapter.name, s.config.distance_km, s.status, bob_v, charlie_v, "YES"])

        return output.getvalue()

    def export_html_report(self, session_id: str) -> str:
        """Generates an executive HTML report formatted for browser print-to-PDF (FR-F3)."""
        sess = self.get_session(session_id)
        km = sess.key_material
        sig = sess.signature
        bob = sess.bob_verification
        charlie = sess.charlie_verification
        atk = sess.last_attack

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>QDS Platform Phase 2 Session Report - {sess.session_id}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #071842; background: #fff; line-height: 1.5; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: bold; }}
        .badge-sim {{ background: #E6FBF7; color: #071842; border: 1px solid #20C8A7; }}
        .badge-pass {{ background: #DCFCE7; color: #166534; }}
        .badge-fail {{ background: #FEE2E2; color: #991B1B; }}
        h1, h2, h3 {{ color: #071842; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 30px; font-size: 13px; }}
        th, td {{ border: 1px solid #CBD5E1; padding: 10px 14px; text-align: left; }}
        th {{ background: #F8FAF9; font-weight: 600; }}
        .mono {{ font-family: monospace; }}
        .footer {{ margin-top: 50px; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 15px; }}
        @media print {{ body {{ padding: 0; }} }}
    </style>
</head>
<body>
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
            <h1>Quantum Digital Signature (QDS) Platform</h1>
            <h3>Phase 2 Protocol Execution Audit Report</h3>
        </div>
        <div style="text-align: right;">
            <span class="badge badge-sim">SIMULATED QUANTUM RUN</span><br>
            <span class="mono" style="font-size: 12px; color: #64748B;">Generated: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}</span>
        </div>
    </div>

    <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;">

    <h2>1. Session Parameters & Environment</h2>
    <table>
        <tr><th>Session Identifier</th><td class="mono">{sess.session_id}</td></tr>
        <tr><th>Protocol Selected</th><td><strong>{sess.adapter.name}</strong> ({sess.adapter.protocol_id})</td></tr>
        <tr><th>Simulated Fiber Distance</th><td>{sess.config.distance_km} km (Channel Loss: {sess.config.channel_loss_db} dB)</td></tr>
        <tr><th>Untrusted Relay Status</th><td>{'COMPROMISED' if sess.config.untrusted_node_compromised else 'HONEST / UNCOMPROMISED'}</td></tr>
        <tr><th>Current Session Status</th><td><strong>{sess.status}</strong></td></tr>
    </table>

    <h2>2. Cryptographic & Physical Key Telemetry</h2>
    <table>
        <tr><th>Raw Key Length</th><td class="mono">{km.raw_key_length if km else 'N/A'} bits</td></tr>
        <tr><th>Effective Key Generation Rate</th><td class="mono">{km.effective_key_rate_bps if km else 'N/A'} bps</td></tr>
        <tr><th>Observed Channel QBER</th><td class="mono">{f"{km.quantum_bit_error_rate*100:.2f}%" if km else 'N/A'}</td></tr>
        <tr><th>Key-to-Message Efficiency Ratio</th><td class="mono">{sig.key_to_message_ratio if sig else 'N/A'}</td></tr>
        <tr><th>Signing Latency</th><td class="mono">{sig.signing_latency_ms if sig else 'N/A'} ms</td></tr>
    </table>

    <h2>3. Independent Verification Outcomes (Transferability)</h2>
    <table>
        <tr>
            <th>Role</th>
            <th>Verdict</th>
            <th>Disagreement Rate</th>
            <th>Security Threshold</th>
            <th>Reason Code</th>
        </tr>
        <tr>
            <td><strong>Bob (Verifier 1)</strong></td>
            <td><span class="badge { 'badge-pass' if bob and bob.is_valid else 'badge-fail' }">{bob.verdict if bob else 'PENDING'}</span></td>
            <td class="mono">{f"{bob.disagreement_rate*100:.2f}%" if bob else 'N/A'}</td>
            <td class="mono">{f"{bob.security_threshold*100:.2f}%" if bob else 'N/A'}</td>
            <td class="mono">{bob.reason_code if bob else 'N/A'}</td>
        </tr>
        <tr>
            <td><strong>Charlie (Arbitrator / Verifier 2)</strong></td>
            <td><span class="badge { 'badge-pass' if charlie and charlie.is_valid else 'badge-fail' }">{charlie.verdict if charlie else 'PENDING'}</span></td>
            <td class="mono">{f"{charlie.disagreement_rate*100:.2f}%" if charlie else 'N/A'}</td>
            <td class="mono">{f"{charlie.security_threshold*100:.2f}%" if charlie else 'N/A'}</td>
            <td class="mono">{charlie.reason_code if charlie else 'N/A'}</td>
        </tr>
    </table>

    <h2>4. Attack Resistance Log</h2>
    <table>
        <tr><th>Last Attack Tested</th><td>{atk.attack_type if atk else 'None'}</td></tr>
        <tr><th>Attack Detected</th><td>{str(atk.attack_detected) if atk else 'N/A'}</td></tr>
        <tr><th>Protocol Resisted</th><td><strong>{str(atk.protocol_resisted) if atk else 'N/A'}</strong></td></tr>
        <tr><th>Explanation</th><td>{atk.explanation if atk else 'N/A'}</td></tr>
    </table>

    <h2>5. Event Audit Sequence Trace</h2>
    <table>
        <tr><th>Timestamp</th><th>Step</th><th>Description</th></tr>
        {''.join(f"<tr><td class='mono'>{e['timestamp']}</td><td><strong>{e['step']}</strong></td><td>{e['description']}</td></tr>" for e in sess.trace)}
    </table>

    <div class="footer">
        <p><strong>Notice:</strong> This report was generated by the Quantum Digital Signature (QDS) Platform Phase 2 Simulation Engine. All quantum optical effects are statistically simulated and strictly labeled SIMULATED per SRS Section 4.1.</p>
    </div>
</body>
</html>"""
        return html

    def _to_response(self, session: Phase2Session) -> SessionStateResponse:
        km_dict = None
        if session.key_material:
            km = session.key_material
            km_dict = {
                "raw_key_length": km.raw_key_length,
                "effective_key_rate_bps": km.effective_key_rate_bps,
                "quantum_bit_error_rate": km.quantum_bit_error_rate,
                "channel_loss_db": km.channel_loss_db,
                "distance_km": km.distance_km,
                "generation_latency_ms": km.generation_latency_ms,
                "decoy_statistics": km.decoy_statistics,
                "metadata": km.metadata,
                "is_simulated": True,
            }

        sig_dict = None
        if session.signature:
            sig = session.signature
            sig_dict = {
                "signature_id": sig.signature_id,
                "message_digest": sig.message_digest,
                "message_size_bytes": sig.message_size_bytes,
                "signature_tokens": sig.signature_tokens[:4],
                "signer_public_key": sig.signer_public_key,
                "signer_role": sig.signer_role,
                "signing_latency_ms": sig.signing_latency_ms,
                "key_consumed_bits": sig.key_consumed_bits,
                "key_to_message_ratio": sig.key_to_message_ratio,
                "algorithm_details": sig.algorithm_details,
                "is_simulated": True,
            }

        bob_dict = None
        if session.bob_verification:
            b = session.bob_verification
            bob_dict = {
                "verifier_role": b.verifier_role,
                "verdict": b.verdict,
                "is_valid": b.is_valid,
                "qber": b.qber,
                "disagreement_rate": b.disagreement_rate,
                "security_threshold": b.security_threshold,
                "reason_code": b.reason_code,
                "reasoning_trace": b.reasoning_trace,
                "internal_checks": b.internal_checks,
                "verification_latency_ms": b.verification_latency_ms,
                "untrusted_node_status": b.untrusted_node_status,
                "is_simulated": True,
            }

        charlie_dict = None
        if session.charlie_verification:
            c = session.charlie_verification
            charlie_dict = {
                "verifier_role": c.verifier_role,
                "verdict": c.verdict,
                "is_valid": c.is_valid,
                "qber": c.qber,
                "disagreement_rate": c.disagreement_rate,
                "security_threshold": c.security_threshold,
                "reason_code": c.reason_code,
                "reasoning_trace": c.reasoning_trace,
                "internal_checks": c.internal_checks,
                "verification_latency_ms": c.verification_latency_ms,
                "is_simulated": True,
            }

        atk_dict = None
        if session.last_attack:
            a = session.last_attack
            atk_dict = {
                "attack_type": a.attack_type,
                "attack_detected": a.attack_detected,
                "protocol_resisted": a.protocol_resisted,
                "verdict": a.verdict,
                "reason_code": a.reason_code,
                "explanation": a.explanation,
                "resulting_qber": a.resulting_qber,
                "resulting_verdict_bob": a.resulting_verdict_bob,
                "resulting_verdict_charlie": a.resulting_verdict_charlie,
                "is_simulated": True,
            }

        return SessionStateResponse(
            session_id=session.session_id,
            protocol_id=session.adapter.protocol_id,
            protocol_name=session.adapter.name,
            distance_km=session.config.distance_km,
            channel_loss_db=session.config.channel_loss_db or 0.0,
            message_size_bytes=session.config.message_size_bytes,
            untrusted_node_compromised=session.config.untrusted_node_compromised,
            status=session.status,
            key_material=km_dict,
            signature=sig_dict,
            bob_verification=bob_dict,
            charlie_verification=charlie_dict,
            transfer_status=session.transfer_status,
            last_attack=atk_dict,
            protocol_trace=session.trace,
            is_simulated=True,
            created_at=session.created_at,
        )


# Global singleton instance of Phase2Service
phase2_service = Phase2Service()
