"""Practical QDS Simulation Engine (Yin, Fu & Chen, Phys. Rev. A 2016).

Implements the primary quantitative reference model for Phase 1:
  - Optical state distribution over lossy channels: eta_channel = 10^(-alpha * L / 10)
  - Receiver detection & measurement in conjugate bases (Z and X)
  - Conclusive bit determination (K_B, K_C) through detector click and basis-matching
  - True QBER calculation from observed mismatches (errors / conclusive_bits)
  - Test-bit sampling split (beta) into test bits and untested signature bits (M_u)
  - Cryptographic message hashing (SHA-256) binding
  - Bit-for-bit deterministic reproducibility via numpy.random.default_rng(seed)
"""

import hashlib
import time
from typing import Optional, Tuple
from uuid import uuid4
import numpy as np

from app.core.reference_parameters import REFERENCE_BASELINES
from app.engine.quantum.pulse_sampler import sample_pulses
from app.engine.analytics.parameter_estimation import estimate_remaining
from app.schemas.canonical_models import (
    CanonicalSimulationState,
    GenerateMaterialRequest,
    MeasurementStatistics,
    ModelMetadata,
    SignatureMaterialData,
    SigningExecution,
    SimulationConfiguration,
)


class PracticalQDSEngine:
    """Core physics and statistical simulation engine for Practical QDS."""

    @classmethod
    def calculate_transmittance(cls, distance_km: float, fiber_attenuation: float) -> float:
        """Calculates optical channel transmittance: eta_channel = 10^(-alpha * L / 10)."""
        loss_db = distance_km * fiber_attenuation
        return float(10.0 ** (-loss_db / 10.0))

    @classmethod
    def generate_simulation(
        cls,
        request: GenerateMaterialRequest,
    ) -> CanonicalSimulationState:
        """Executes a deterministic Practical QDS state distribution run.

        Args:
            request: Validated simulation configuration request.

        Returns:
            CanonicalSimulationState containing complete material and audit metrics.
        """
        # Determine deterministic seed
        seed = request.seed if request.seed is not None else int(time.time_ns() % (2**31 - 1))
        rng = np.random.default_rng(seed)

        N = request.pulse_count
        L = request.distance_km
        alpha = request.fiber_attenuation
        eta_d = request.detector_efficiency
        p_dark = request.dark_count_rate
        e0 = request.baseline_qber
        beta = request.beta
        interception = request.interception_fraction
        signal_error = e0 + (1 - 2 * e0) * interception / 4
        execution = {"backend": request.measurement_backend, "interception_fraction": interception}
        msg = request.message or REFERENCE_BASELINES.DEFAULT_MESSAGE
        model_version = ("four_state_aer_distribution_v2" if request.measurement_backend == "qiskit_aer"
                         else REFERENCE_BASELINES.MODEL_VERSION)

        # ── 1. Optical Channel Propagation ──
        eta_ch = cls.calculate_transmittance(L, alpha)
        # Probability that a transmitted pulse yields a detector arrival
        p_arrival = float(np.clip(eta_ch * eta_d, 0.0, 1.0))
        # Total detector click probability (signal arrival OR dark count)
        p_click = float(np.clip(p_arrival + p_dark - (p_arrival * p_dark), 0.0, 1.0))

        # ── 2. Alice Quantum State Preparation ──
        # Alice generates random bits {0, 1} and preparation bases {0: Z, 1: X}
        alice_bits = rng.integers(0, 2, size=N, dtype=np.int8)
        alice_bases = rng.integers(0, 2, size=N, dtype=np.int8)

        # ── 3. Bob Channel & Measurement ──
        bob_bases = rng.integers(0, 2, size=N, dtype=np.int8)
        bob_arrival = rng.random(size=N) < p_arrival
        bob_dark = rng.random(size=N) < p_dark
        bob_click = bob_arrival | bob_dark

        # Bob raw measurement bits:
        # If signal arrived, bit is alice_bit with e0 probability of flip.
        # If pure dark count, bit is randomly 0 or 1.
        bob_flip = rng.random(size=N) < signal_error
        bob_signal_bits = np.where(bob_flip, 1 - alice_bits, alice_bits)
        if request.measurement_backend == "qiskit_aer":
            bob_signal_bits, execution["bob"] = sample_pulses(
                alice_bits, alice_bases, bob_bases, e0, interception, (seed + 101) % (2**31 - 1))
        bob_dark_bits = rng.integers(0, 2, size=N, dtype=np.int8)
        bob_measured = np.where(bob_arrival, bob_signal_bits, bob_dark_bits)

        # Conclusive bits for Bob: Click occurred AND Bob's basis matched Alice's
        bob_conclusive_mask = bob_click & (bob_bases == alice_bases)
        bob_conclusive_indices = np.flatnonzero(bob_conclusive_mask)
        bob_conclusive_bits_arr = bob_measured[bob_conclusive_indices]
        alice_bits_for_bob = alice_bits[bob_conclusive_indices]

        # Bob errors & QBER
        bob_errors = int(np.count_nonzero(bob_conclusive_bits_arr != alice_bits_for_bob))
        k_b = int(len(bob_conclusive_indices))
        qber_bob = float(bob_errors / k_b) if k_b > 0 else 0.0

        # ── 4. Charlie Channel & Measurement ──
        charlie_bases = rng.integers(0, 2, size=N, dtype=np.int8)
        charlie_arrival = rng.random(size=N) < p_arrival
        charlie_dark = rng.random(size=N) < p_dark
        charlie_click = charlie_arrival | charlie_dark

        charlie_flip = rng.random(size=N) < signal_error
        charlie_signal_bits = np.where(charlie_flip, 1 - alice_bits, alice_bits)
        if request.measurement_backend == "qiskit_aer":
            charlie_signal_bits, execution["charlie"] = sample_pulses(
                alice_bits, alice_bases, charlie_bases, e0, interception, (seed + 211) % (2**31 - 1))
        charlie_dark_bits = rng.integers(0, 2, size=N, dtype=np.int8)
        charlie_measured = np.where(charlie_arrival, charlie_signal_bits, charlie_dark_bits)

        # Conclusive bits for Charlie: Click occurred AND Charlie's basis matched Alice's
        charlie_conclusive_mask = charlie_click & (charlie_bases == alice_bases)
        charlie_conclusive_indices = np.flatnonzero(charlie_conclusive_mask)
        charlie_conclusive_bits_arr = charlie_measured[charlie_conclusive_indices]
        alice_bits_for_charlie = alice_bits[charlie_conclusive_indices]

        # Charlie errors & QBER
        charlie_errors = int(np.count_nonzero(charlie_conclusive_bits_arr != alice_bits_for_charlie))
        k_c = int(len(charlie_conclusive_indices))
        qber_charlie = float(charlie_errors / k_c) if k_c > 0 else 0.0

        # Total combined detections
        total_detections = int(np.count_nonzero(bob_click) + np.count_nonzero(charlie_click))

        # ── 5. Test-Bit Split (beta) into Test Bits & Untested Bits (M_u) ──
        # Bob test-bit split
        n_test_bob = int(np.floor(beta * k_b))
        m_u_bob = k_b - n_test_bob
        bob_perm = rng.permutation(k_b) if k_b > 0 else np.array([], dtype=int)
        bob_test_idx = bob_perm[:n_test_bob] if n_test_bob > 0 else np.array([], dtype=int)
        bob_untested_idx = bob_perm[n_test_bob:] if m_u_bob > 0 else np.array([], dtype=int)

        # Charlie test-bit split
        n_test_charlie = int(np.floor(beta * k_c))
        m_u_charlie = k_c - n_test_charlie
        charlie_perm = rng.permutation(k_c) if k_c > 0 else np.array([], dtype=int)
        charlie_test_idx = charlie_perm[:n_test_charlie] if n_test_charlie > 0 else np.array([], dtype=int)
        charlie_untested_idx = charlie_perm[n_test_charlie:] if m_u_charlie > 0 else np.array([], dtype=int)

        estimation = {
            "method": "Serfling: uniform test sampling without replacement",
            "scope": "Mismatch-rate estimation only; not a forgery or non-repudiation proof.",
            "joint_failure_probability": request.estimation_failure_probability,
            "bob": estimate_remaining(bob_conclusive_bits_arr != alice_bits_for_bob, bob_test_idx,
                request.authentication_threshold, request.estimation_failure_probability / 2),
            "charlie": estimate_remaining(charlie_conclusive_bits_arr != alice_bits_for_charlie, charlie_test_idx,
                request.verification_threshold, request.estimation_failure_probability / 2),
        }
        # Expected error conditioned on a click. A signal arrival takes priority
        # over a simultaneous dark count, matching the simulation's event model.
        execution["expected_qber_given_click"] = (
            (p_arrival * signal_error + (1 - p_arrival) * p_dark * 0.5) / p_click if p_click else None)
        execution["loss_model"] = "Independent erasure and detector events sampled with NumPy; signal measurements use the selected backend."
        execution["transcript_sha256"] = hashlib.sha256(
            alice_bits.tobytes() + alice_bases.tobytes() + bob_bases.tobytes() + charlie_bases.tobytes()
            + bob_measured.tobytes() + charlie_measured.tobytes() + bob_click.tobytes() + charlie_click.tobytes()
        ).hexdigest()

        # String representations of conclusive bits
        bob_conclusive_str = "".join(str(b) for b in bob_conclusive_bits_arr)
        charlie_conclusive_str = "".join(str(b) for b in charlie_conclusive_bits_arr)

        # ── 6. Alice Signing Execution (SHA-256 Digest) ──
        sha256_hash = hashlib.sha256(msg.encode("utf-8")).hexdigest()

        # ── 7. Build Traceability Dictionary & Metric Origin Expositions ──
        trace_data = {
            "transmittance": {
                "metric_name": "Optical Channel Transmittance (eta_channel)",
                "formula": "eta_channel = 10^(-alpha * L / 10)",
                "inputs": {
                    "distance_km": L,
                    "fiber_attenuation_dB_per_km": alpha,
                    "loss_dB": round(L * alpha, 4),
                },
                "calculation_steps": [
                    f"loss_dB = {L} km * {alpha} dB/km = {L * alpha:.4f} dB",
                    f"eta_channel = 10^(-{L * alpha:.4f} / 10) = {eta_ch:.6f}",
                ],
                "result": round(eta_ch, 6),
                "interpretation": f"{eta_ch * 100:.2f}% of optical photons survive fiber transit to receivers.",
            },
            "detection_probability": {
                "metric_name": "Detector Click Probability (P_click)",
                "formula": "P_arrival = eta_channel * eta_d; P_click = P_arrival + p_dark - (P_arrival * p_dark)",
                "inputs": {
                    "eta_channel": round(eta_ch, 6),
                    "detector_efficiency_eta_d": eta_d,
                    "dark_count_rate_p_dark": p_dark,
                    "P_arrival": round(p_arrival, 6),
                },
                "calculation_steps": [
                    f"P_arrival = {eta_ch:.6f} * {eta_d} = {p_arrival:.6f}",
                    f"P_click = {p_arrival:.6f} + {p_dark} - ({p_arrival:.6f} * {p_dark}) = {p_click:.6f}",
                ],
                "result": round(p_click, 6),
                "interpretation": f"Mean probability of detector event per transmitted pulse is {p_click * 100:.4f}%.",
            },
            "qber_bob": {
                "metric_name": "Bob Quantum Bit Error Rate (QBER_B)",
                "formula": "QBER_B = mismatch_count_bob / conclusive_count_bob",
                "inputs": {
                    "mismatch_count_bob": bob_errors,
                    "conclusive_count_bob": k_b,
                    "baseline_qber_e0": e0,
                },
                "calculation_steps": [
                    f"mismatch_count_bob = {bob_errors}",
                    f"conclusive_count_bob = {k_b}",
                    f"QBER_B = {bob_errors} / {k_b} = {qber_bob:.6f}",
                ],
                "result": round(qber_bob, 5),
                "interpretation": f"Empirically observed error rate on conclusive key register K_B is {qber_bob * 100:.2f}%.",
            },
            "qber_charlie": {
                "metric_name": "Charlie Quantum Bit Error Rate (QBER_C)",
                "formula": "QBER_C = mismatch_count_charlie / conclusive_count_charlie",
                "inputs": {
                    "mismatch_count_charlie": charlie_errors,
                    "conclusive_count_charlie": k_c,
                    "baseline_qber_e0": e0,
                },
                "calculation_steps": [
                    f"mismatch_count_charlie = {charlie_errors}",
                    f"conclusive_count_charlie = {k_c}",
                    f"QBER_C = {charlie_errors} / {k_c} = {qber_charlie:.6f}",
                ],
                "result": round(qber_charlie, 5),
                "interpretation": f"Empirically observed error rate on conclusive key register K_C is {qber_charlie * 100:.2f}%.",
            },
            "test_bit_split": {
                "metric_name": "Conclusive Bit Allocation (Test vs Untested)",
                "formula": "n_test = floor(beta * |K|); M_u = |K| - n_test",
                "inputs": {
                    "beta": beta,
                    "conclusive_count_bob": k_b,
                    "conclusive_count_charlie": k_c,
                },
                "calculation_steps": [
                    f"Bob: n_test = floor({beta} * {k_b}) = {n_test_bob}, M_u = {m_u_bob}",
                    f"Charlie: n_test = floor({beta} * {k_c}) = {n_test_charlie}, M_u = {m_u_charlie}",
                    f"Total signature material M_u = {m_u_bob + m_u_charlie} bits",
                ],
                "result": {
                    "bob_test_count": n_test_bob,
                    "bob_untested_count": m_u_bob,
                    "charlie_test_count": n_test_charlie,
                    "charlie_untested_count": m_u_charlie,
                    "total_untested_M_u": m_u_bob + m_u_charlie,
                },
                "interpretation": f"{beta * 100:.0f}% of conclusive bits sampled for QBER verification; remaining {100 - beta * 100:.0f}% retained for message signing.",
            },
        }

        # ── 8. Advisory Warnings & Health Checks ──
        warnings: list[str] = []
        if not k_b or not k_c:
            warnings.append("No conclusive data on at least one channel: zero reported QBER is undefined, not evidence of a clean channel. Consult parameter_estimation.")
        if qber_bob > request.authentication_threshold:
            warnings.append(
                f"Bob observed QBER ({qber_bob * 100:.2f}%) exceeds Authentication Threshold Ta ({request.authentication_threshold * 100:.2f}%). Signature will be rejected under baseline noise."
            )
        if qber_charlie > request.authentication_threshold:
            warnings.append(
                f"Charlie observed QBER ({qber_charlie * 100:.2f}%) exceeds Authentication Threshold Ta ({request.authentication_threshold * 100:.2f}%)."
            )
        if L > 100.0:
            warnings.append(
                f"Long transmission distance ({L} km) results in severe optical attenuation ({L * alpha:.1f} dB loss). Conclusive bit rate is substantially reduced."
            )
        if N < 1000:
            warnings.append(
                f"Small pulse count (N={N}) may lead to significant finite-sample statistical fluctuations in parameter estimation."
            )

        # ── 9. Assemble Canonical State ──
        config = SimulationConfiguration(
            measurement_backend=request.measurement_backend,
            interception_fraction=interception,
            pulse_count=N,
            distance_km=L,
            fiber_attenuation=alpha,
            detector_efficiency=eta_d,
            dark_count_rate=p_dark,
            baseline_qber=e0,
            beta=beta,
            authentication_threshold=request.authentication_threshold,
            verification_threshold=request.verification_threshold,
            security_target=REFERENCE_BASELINES.SECURITY_BOUND_TARGET,
        )

        material = SignatureMaterialData(
            generated_states=alice_bits[:64].tolist(),
            bob_measurements=bob_measured[:64].tolist(),
            charlie_measurements=charlie_measured[:64].tolist(),
            bob_conclusive_bits=bob_conclusive_str,
            charlie_conclusive_bits=charlie_conclusive_str,
            test_bits={
                "beta": beta,
                "bob_test_count": n_test_bob,
                "charlie_test_count": n_test_charlie,
                "bob_test_errors": estimation["bob"]["test_errors"],
                "charlie_test_errors": estimation["charlie"]["test_errors"],
                "sample_test_indices_bob": bob_test_idx[:16].tolist() if len(bob_test_idx) > 0 else [],
                "sample_test_indices_charlie": charlie_test_idx[:16].tolist() if len(charlie_test_idx) > 0 else [],
            },
            untested_bits={
                "M_u_bob": m_u_bob,
                "M_u_charlie": m_u_charlie,
                "total_M_u": m_u_bob + m_u_charlie,
                "sample_untested_bits_bob": "".join(str(bob_conclusive_bits_arr[i]) for i in bob_untested_idx[:32]) if len(bob_untested_idx) > 0 else "",
                "sample_untested_bits_charlie": "".join(str(charlie_conclusive_bits_arr[i]) for i in charlie_untested_idx[:32]) if len(charlie_untested_idx) > 0 else "",
            },
        )

        statistics = MeasurementStatistics(
            transmitted_pulses=N,
            detected_events=total_detections,
            conclusive_count_bob=k_b,
            conclusive_count_charlie=k_c,
            mismatch_count_bob=bob_errors,
            mismatch_count_charlie=charlie_errors,
            qber_bob=round(qber_bob, 5),
            qber_charlie=round(qber_charlie, 5),
        )

        thresholds = {
            "Ta": request.authentication_threshold,
            "Tv": request.verification_threshold,
            "gap": round(request.verification_threshold - request.authentication_threshold, 6),
        }

        signing = SigningExecution(
            message=msg,
            sha256_hash=sha256_hash,
            signature_length=2 * N,
        )

        metadata = ModelMetadata(
            model_name=REFERENCE_BASELINES.MODEL_NAME,
            model_version=model_version,
            model_type="SIMULATION MODEL",
            disclaimer=f"SIMULATION MODEL — Measurements: {request.measurement_backend}; erasure/detector sampling: NumPy. Not laboratory hardware or a complete QDS security proof.",
            assumptions=list(REFERENCE_BASELINES.ASSUMPTIONS),
            simplifications=list(REFERENCE_BASELINES.SIMPLIFICATIONS),
        )

        sim_id = f"sim-qds-{uuid4().hex[:10]}"

        return CanonicalSimulationState(
            simulation_id=sim_id,
            seed=seed,
            protocol="practical_qds",
            model_version=model_version,
            timestamp=round(time.time(), 3),
            configuration=config,
            material=material,
            measurement_statistics=statistics,
            thresholds=thresholds,
            signing=signing,
            model_metadata=metadata,
            trace=trace_data,
            warnings=warnings,
            execution=execution,
            parameter_estimation=estimation,
        )
