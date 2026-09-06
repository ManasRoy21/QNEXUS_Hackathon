"""Module B: Multi-Party Quantum Digital Signatures (QDS) Protocol Engine.

Implements the multi-party QDS protocol connecting Alice (Signer), Bob (Verifier 1),
and Charlie (Verifier 2) through entangled Bell channels, dynamic feedforward corrections,
and post-basis state verification.
"""

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union
from uuid import uuid4
from qiskit import ClassicalRegister, QuantumCircuit, QuantumRegister
from qiskit.circuit import Qubit
from qiskit_aer import AerSimulator

from app.engine.quantum.bell_pairs import create_bell_pair
from app.engine.quantum.pauli_ops import encode_pauli_state


@dataclass
class QDSSignatureBlock:
    """Encapsulates the state preparation and cryptographic registers of a QDS signature block."""

    digest: str
    target_bases: List[str]
    pauli_states: List[str]
    signer_public_key: str = "alice-legitimate-public-key-001"
    timestamp: float = field(default_factory=time.time)
    nonce: str = field(default_factory=lambda: uuid4().hex)
    circuit: Optional[QuantumCircuit] = None
    circuits: Optional[List[QuantumCircuit]] = None
    public_key_registers: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.circuit is not None and self.circuits is None:
            self.circuits = [self.circuit]
        elif self.circuits is not None and self.circuit is None and len(self.circuits) > 0:
            self.circuit = self.circuits[0]
        if "signer_public_key" not in self.public_key_registers:
            self.public_key_registers["signer_public_key"] = self.signer_public_key


@dataclass
class QDSVerificationResult:
    """Structured cryptographic outcome of a multi-verifier QDS signature verification."""

    is_valid: bool
    raw_counts: Dict[str, int]
    fidelity: float
    qber: float
    threat_detected: bool
    severity: str = "LOW"
    attack_hypothesis: str = "CLEAN"
    metadata: Dict[str, Any] = field(default_factory=dict)


class QDSProtocolEngine:
    """Orchestrates end-to-end multi-party QDS signature generation, channel transit, and verification."""

    def __init__(self, simulator: Optional[AerSimulator] = None):
        self.simulator = simulator or AerSimulator()

    def generate_signature_stream(
        self,
        digest: str,
        bases: Optional[List[str]] = None,
        signer_public_key: str = "alice-legitimate-public-key-001",
        timestamp: Optional[float] = None,
        nonce: Optional[str] = None,
    ) -> QDSSignatureBlock:
        """Maps a binary digest string (e.g. '10110100') to Pauli eigenstates (|0>, |1>, |+>, |->).

        Basis encoding:
            - Basis 'Z':
                * bit '0' -> '|0>' (eigenstate +1)
                * bit '1' -> '|1>' (eigenstate -1)
            - Basis 'X':
                * bit '0' -> '|+>' = (|0> + |1>)/sqrt(2) (eigenstate +1)
                * bit '1' -> '|->' = (|0> - |1>)/sqrt(2) (eigenstate -1)

        Args:
            digest: Binary string representing message or hash digest.
            bases: Optional list of basis choices ('Z' or 'X') per bit. Defaults to alternating bases.
            signer_public_key: Public key identifier of signing entity.
            timestamp: Packet generation timestamp (default current time).
            nonce: Unique packet nonce token (default random UUID).

        Returns:
            QDSSignatureBlock populated with bases, mapped eigenstates, and key metadata.
        """
        for char in digest:
            if char not in ("0", "1"):
                raise ValueError(f"Invalid character '{char}' in digest. Expected binary string.")

        n_bits = len(digest)
        if bases is None:
            # Alternating bases 'Z' and 'X' ensure both bases are thoroughly tested
            bases = ["Z" if i % 2 == 0 else "X" for i in range(n_bits)]
        elif len(bases) != n_bits:
            raise ValueError(f"Bases length ({len(bases)}) must match digest length ({n_bits}).")

        pauli_states: List[str] = []
        for bit, basis in zip(digest, bases):
            if basis == "Z":
                state = "0" if bit == "0" else "1"
            elif basis == "X":
                state = "+" if bit == "0" else "-"
            else:
                raise ValueError(f"Invalid basis '{basis}'. Must be 'Z' or 'X'.")
            pauli_states.append(state)

        pkt_timestamp = timestamp if timestamp is not None else time.time()
        pkt_nonce = nonce if nonce is not None else uuid4().hex

        return QDSSignatureBlock(
            digest=digest,
            target_bases=bases,
            pauli_states=pauli_states,
            signer_public_key=signer_public_key,
            timestamp=pkt_timestamp,
            nonce=pkt_nonce,
            public_key_registers={
                "bit_length": n_bits,
                "parties": ["Alice (Signer)", "Bob (Verifier 1)", "Charlie (Verifier 2)"],
                "protocol": "Teleportation-Based QDS",
                "signer_public_key": signer_public_key,
            },
        )

    def build_multi_party_circuit(
        self,
        signature_block: QDSSignatureBlock,
        channel_adversary: Optional[Any] = None,
        eavesdrop_probability: float = 0.0,
        depolarizing_error_rate: float = 0.0,
        phase_tampering_angle: float = 0.0,
        target_channel: str = "bob",
    ) -> QuantumCircuit:
        """Constructs a unified multi-qubit Qiskit circuit connecting Alice, Bob, and Charlie.

        Architecture & Channel Distribution:
            - Alice (Signer) shares entangled Bell pairs (|Phi+>) with Bob and Charlie:
                * Alice-Bob channel: (q_bell_ab, q_bob)
                * Alice-Charlie channel: (q_bell_ac, q_charlie)
            - Signature states prepared on Alice's source registers: q_alice_b and q_alice_c.
            - Channel Transit: If channel_adversary is provided, adversary operators intercept
              transit qubits before Bob and Charlie measurement.
            - Bell measurements: Alice measures in Bell basis and classically communicates outcomes.
            - Verification: Bob and Charlie apply dynamic Pauli corrections (if_test) and
              post-basis rotations before projective measurement.

        Args:
            signature_block: Input QDSSignatureBlock containing states and bases.
            channel_adversary: Optional AdversaryChannel instance to simulate eavesdropping or noise.
            eavesdrop_probability: Intercept-resend attack probability.
            depolarizing_error_rate: Channel depolarizing noise error rate.
            phase_tampering_angle: Channel phase rotation angle (radians).
            target_channel: Which verifier channel to attack: 'bob', 'charlie', or 'both'.

        Returns:
            Unified QuantumCircuit implementing the multi-party QDS protocol.
        """
        n_bits = len(signature_block.digest)

        # Quantum Registers
        q_alice_b = QuantumRegister(n_bits, "q_alice_b")
        q_bell_ab = QuantumRegister(n_bits, "q_bell_ab")
        q_bob = QuantumRegister(n_bits, "q_bob")

        q_alice_c = QuantumRegister(n_bits, "q_alice_c")
        q_bell_ac = QuantumRegister(n_bits, "q_bell_ac")
        q_charlie = QuantumRegister(n_bits, "q_charlie")

        # Classical Registers
        c_ab = ClassicalRegister(2 * n_bits, "c_ab")
        c_ac = ClassicalRegister(2 * n_bits, "c_ac")
        c_bob = ClassicalRegister(n_bits, "c_bob")
        c_charlie = ClassicalRegister(n_bits, "c_charlie")

        qc = QuantumCircuit(
            q_alice_b,
            q_bell_ab,
            q_bob,
            q_alice_c,
            q_bell_ac,
            q_charlie,
            c_ab,
            c_ac,
            c_bob,
            c_charlie,
            name="multi_party_qds",
        )

        # -------------------------------------------------------------
        # 1. State Preparation: Alice encodes signature stream
        # -------------------------------------------------------------
        for i in range(n_bits):
            state = signature_block.pauli_states[i]
            encode_pauli_state(qc, q_alice_b[i], state)
            encode_pauli_state(qc, q_alice_c[i], state)
        qc.barrier()

        # -------------------------------------------------------------
        # 2. Key Distribution: Alice generates entangled Bell pairs
        # -------------------------------------------------------------
        for i in range(n_bits):
            create_bell_pair(qc, q_bell_ab[i], q_bob[i])
            create_bell_pair(qc, q_bell_ac[i], q_charlie[i])
        qc.barrier()

        # -------------------------------------------------------------
        # 3. Channel Transit & Adversary Interference (Module D Hook)
        # -------------------------------------------------------------
        if channel_adversary is not None:
            target_qubits: List[Union[int, Qubit]] = []
            if target_channel in ("bob", "both"):
                target_qubits.extend([q_bob[i] for i in range(n_bits)])
            if target_channel in ("charlie", "both"):
                target_qubits.extend([q_charlie[i] for i in range(n_bits)])

            if eavesdrop_probability > 0:
                channel_adversary.apply_intercept_resend(
                    circuit=qc,
                    target_qubits=target_qubits,
                    eavesdrop_probability=eavesdrop_probability,
                )
            if depolarizing_error_rate > 0:
                channel_adversary.apply_depolarizing_noise(
                    circuit=qc,
                    target_qubits=target_qubits,
                    error_rate=depolarizing_error_rate,
                )
            if phase_tampering_angle != 0.0:
                channel_adversary.apply_phase_tampering(
                    circuit=qc,
                    target_qubits=target_qubits,
                    phase_angle=phase_tampering_angle,
                )
            qc.barrier()

        # -------------------------------------------------------------
        # 4. Alice Bell Measurements (Teleportation Stage)
        # -------------------------------------------------------------
        for i in range(n_bits):
            # Alice to Bob teleportation measurement
            qc.cx(q_alice_b[i], q_bell_ab[i])
            qc.h(q_alice_b[i])
            qc.measure(q_alice_b[i], c_ab[2 * i])
            qc.measure(q_bell_ab[i], c_ab[2 * i + 1])

            # Alice to Charlie teleportation measurement
            qc.cx(q_alice_c[i], q_bell_ac[i])
            qc.h(q_alice_c[i])
            qc.measure(q_alice_c[i], c_ac[2 * i])
            qc.measure(q_bell_ac[i], c_ac[2 * i + 1])
        qc.barrier()

        # -------------------------------------------------------------
        # 5. Verifier Feedforward Pauli Corrections (Dynamic if_test)
        # -------------------------------------------------------------
        for i in range(n_bits):
            # Bob Pauli corrections
            with qc.if_test((c_ab[2 * i], 1)):
                qc.z(q_bob[i])
            with qc.if_test((c_ab[2 * i + 1], 1)):
                qc.x(q_bob[i])

            # Charlie Pauli corrections
            with qc.if_test((c_ac[2 * i], 1)):
                qc.z(q_charlie[i])
            with qc.if_test((c_ac[2 * i + 1], 1)):
                qc.x(q_charlie[i])
        qc.barrier()

        # -------------------------------------------------------------
        # 6. Post-Basis Rotation and Verification Measurements
        # -------------------------------------------------------------
        for i in range(n_bits):
            basis = signature_block.target_bases[i]
            # In X-basis, apply Hadamard H to rotate eigenstate to Z-basis
            if basis == "X":
                qc.h(q_bob[i])
                qc.h(q_charlie[i])

            qc.measure(q_bob[i], c_bob[i])
            qc.measure(q_charlie[i], c_charlie[i])

        signature_block.circuit = qc
        signature_block.circuits = [qc]
        return qc

    def execute_protocol(
        self,
        circuit: QuantumCircuit,
        shots: int = 4096,
    ) -> Dict[str, int]:
        """Executes the QDS circuit on Qiskit Aer and returns measurement outcome distributions."""
        job = self.simulator.run(circuit, shots=shots)
        result = job.result()
        counts: Dict[str, int] = result.get_counts()
        return counts

    def extract_verifier_counts(
        self,
        circuit: QuantumCircuit,
        raw_counts: Dict[str, int],
        verifier: str = "bob",
    ) -> Dict[str, int]:
        """Extracts marginal measurement counts for a designated verifier ('bob' or 'charlie').

        Bit ordering in Qiskit classical register strings:
            c_reg = 'b_{N-1} ... b_1 b_0'.
            Reversing (b[::-1]) maps index i to bit i.
        """
        reg_name = "c_bob" if verifier.lower() == "bob" else "c_charlie"

        # Match classical register index in space-separated Qiskit bitstring
        reg_order = [r.name for r in reversed(circuit.cregs)]
        if reg_name not in reg_order:
            raise KeyError(f"Register '{reg_name}' not found in circuit registers: {reg_order}")

        target_idx = reg_order.index(reg_name)
        verifier_counts: Dict[str, int] = {}

        for bitstring, count in raw_counts.items():
            tokens = bitstring.split()
            if target_idx < len(tokens):
                verifier_token = tokens[target_idx]
            else:
                verifier_token = tokens[0]

            # Convert from Qiskit little-endian register representation to standard index ordering
            ordered_token = verifier_token[::-1]
            verifier_counts[ordered_token] = verifier_counts.get(ordered_token, 0) + count

        return verifier_counts
