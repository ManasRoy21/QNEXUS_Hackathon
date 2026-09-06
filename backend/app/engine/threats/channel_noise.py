"""Module B & C: Adversary Channel Models & Cryptanalytic Attack Simulation.

Simulates physical transit channel attacks and cryptanalytic threat vectors:
- Physical Layer:
    * Intercept-Resend (intermediate projective measurement and re-preparation)
    * Depolarizing Channel Noise (random Pauli X, Y, Z decoherence)
    * Coherent Phase Tampering (RZ/Phase shift perturbations)
- Cryptanalytic Layer:
    * Forgery Attack (tampering with classical digest and quantum basis payloads in transit)
    * Impersonation Attack (spoofing signer public key credentials)
    * Replay Attack (transmitting stale packets with duplicate nonces)
"""

import copy
import random
import time
from typing import List, Optional, Union
from uuid import uuid4
from qiskit import ClassicalRegister, QuantumCircuit
from qiskit.circuit import Qubit

from app.engine.protocol.qds_protocol import QDSSignatureBlock


class AdversaryChannel:
    """Simulates quantum channel attacks, decoherence noise, and cryptanalytic tampering."""

    # -------------------------------------------------------------------------
    # Physical Channel Attacks (Qiskit Circuit Interventions)
    # -------------------------------------------------------------------------

    @staticmethod
    def apply_intercept_resend(
        circuit: QuantumCircuit,
        target_qubits: List[Union[int, Qubit]],
        eavesdrop_probability: float = 0.5,
    ) -> QuantumCircuit:
        """Simulates an Eve intercept-resend attack on transit channels.

        Inserts intermediate projective measurements and random re-preparations,
        destroying entanglement and inducing deterministic entropy on intercepted qubits.

        Args:
            circuit: The QuantumCircuit containing transit qubits.
            target_qubits: List of physical/logical qubits in transit to intercept.
            eavesdrop_probability: Probability of Eve intercepting each target qubit (0.0 to 1.0).

        Returns:
            The modified QuantumCircuit with adversary measurements and re-preparations.
        """
        if not target_qubits or eavesdrop_probability <= 0.0:
            return circuit

        reg_id = uuid4().hex[:6]
        c_eve = ClassicalRegister(len(target_qubits), name=f"c_eve_{reg_id}")
        circuit.add_register(c_eve)

        for idx, q in enumerate(target_qubits):
            if random.random() < eavesdrop_probability:
                basis = random.choice(["Z", "X"])
                if basis == "X":
                    circuit.h(q)

                circuit.measure(q, c_eve[idx])
                circuit.reset(q)

                if random.random() < 0.5:
                    circuit.x(q)
                if random.random() < 0.5:
                    circuit.h(q)

        return circuit

    @staticmethod
    def apply_depolarizing_noise(
        circuit: QuantumCircuit,
        target_qubits: List[Union[int, Qubit]],
        error_rate: float,
    ) -> QuantumCircuit:
        """Inserts random Pauli (X, Y, Z) corruptions to simulate channel depolarizing decoherence.

        Args:
            circuit: The QuantumCircuit containing transit qubits.
            target_qubits: List of physical/logical qubits in transit.
            error_rate: Probability of a depolarizing error occurring on each qubit.

        Returns:
            The modified QuantumCircuit with channel noise operators.
        """
        if not target_qubits or error_rate <= 0.0:
            return circuit

        for q in target_qubits:
            if random.random() < error_rate:
                pauli_error = random.choice(["x", "y", "z"])
                getattr(circuit, pauli_error)(q)

        return circuit

    @staticmethod
    def apply_phase_tampering(
        circuit: QuantumCircuit,
        target_qubits: List[Union[int, Qubit]],
        phase_angle: float,
    ) -> QuantumCircuit:
        """Applies phase rotations (RZ/Phase gates) to disturb phase coherence in superposed states (|+>, |->).

        Args:
            circuit: The QuantumCircuit containing transit qubits.
            target_qubits: List of physical/logical qubits in transit.
            phase_angle: Phase rotation angle in radians (e.g. pi for full phase flip).

        Returns:
            The modified QuantumCircuit with phase perturbations.
        """
        if not target_qubits or phase_angle == 0.0:
            return circuit

        for q in target_qubits:
            circuit.p(phase_angle, q)

        return circuit

    # -------------------------------------------------------------------------
    # Cryptanalytic Attacks (Protocol & Payload Interventions)
    # -------------------------------------------------------------------------

    @staticmethod
    def simulate_forgery_attack(
        signature_packet: QDSSignatureBlock,
        tamper_rate: float = 0.3,
    ) -> QDSSignatureBlock:
        """Simulates active forgery by tampering with classical digest bits and basis sequences in transit.

        Args:
            signature_packet: Legitimate QDSSignatureBlock payload.
            tamper_rate: Fraction of bits/bases to randomly alter (0.0 to 1.0).

        Returns:
            Tampered QDSSignatureBlock exhibiting bit/basis inconsistency.
        """
        tampered_packet = copy.copy(signature_packet)
        tampered_packet.public_key_registers = copy.deepcopy(signature_packet.public_key_registers)

        digest_list = list(signature_packet.digest)
        bases_list = list(signature_packet.target_bases)
        pauli_list = list(signature_packet.pauli_states)
        n = len(digest_list)

        # Select indices to tamper (guarantee at least one if tamper_rate > 0)
        tampered_indices = [i for i in range(n) if random.random() < tamper_rate]
        if not tampered_indices and n > 0 and tamper_rate > 0.0:
            tampered_indices = [random.randint(0, n - 1)]

        for i in tampered_indices:
            # Flip classical digest bit
            digest_list[i] = "1" if digest_list[i] == "0" else "0"
            # Invert basis
            bases_list[i] = "X" if bases_list[i] == "Z" else "Z"
            # Invert Pauli state
            if pauli_list[i] == "0":
                pauli_list[i] = "1"
            elif pauli_list[i] == "1":
                pauli_list[i] = "0"
            elif pauli_list[i] == "+":
                pauli_list[i] = "-"
            elif pauli_list[i] == "-":
                pauli_list[i] = "+"

        tampered_packet.digest = "".join(digest_list)
        tampered_packet.target_bases = bases_list
        tampered_packet.pauli_states = pauli_list
        tampered_packet.public_key_registers["tampered"] = True
        tampered_packet.public_key_registers["tamper_rate"] = tamper_rate
        tampered_packet.public_key_registers["tampered_indices"] = tampered_indices
        tampered_packet.public_key_registers["original_digest"] = signature_packet.digest

        return tampered_packet

    @staticmethod
    def simulate_impersonation_attack(
        signature_packet: QDSSignatureBlock,
        forged_public_key: str = "eve-forged-pubkey-0xDEADBEEF",
    ) -> QDSSignatureBlock:
        """Simulates an impersonation attack by overwriting signer public key credentials.

        Args:
            signature_packet: Legitimate QDSSignatureBlock payload.
            forged_public_key: Unauthorized public key string injected by adversary.

        Returns:
            Tampered QDSSignatureBlock bearing spoofed signer credentials.
        """
        tampered_packet = copy.copy(signature_packet)
        tampered_packet.public_key_registers = copy.deepcopy(signature_packet.public_key_registers)

        tampered_packet.signer_public_key = forged_public_key
        tampered_packet.public_key_registers["signer_public_key"] = forged_public_key
        tampered_packet.public_key_registers["impersonated"] = True

        return tampered_packet

    @staticmethod
    def simulate_replay_attack(
        valid_packet: QDSSignatureBlock,
        age_seconds: float = 300.0,
    ) -> QDSSignatureBlock:
        """Simulates a replay attack by modifying packet metadata with a stale timestamp and duplicate nonce.

        Args:
            valid_packet: Previously authenticated QDSSignatureBlock payload.
            age_seconds: Number of seconds elapsed since original transmission (default 300s).

        Returns:
            Replayed QDSSignatureBlock with stale timestamp and duplicate request nonce.
        """
        replayed_packet = copy.copy(valid_packet)
        replayed_packet.public_key_registers = copy.deepcopy(valid_packet.public_key_registers)

        replayed_packet.timestamp = time.time() - age_seconds
        replayed_packet.nonce = valid_packet.nonce
        replayed_packet.public_key_registers["replayed"] = True
        replayed_packet.public_key_registers["replayed_age_seconds"] = age_seconds

        return replayed_packet
