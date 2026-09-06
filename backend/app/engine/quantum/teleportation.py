"""Module A: 3-Qubit Quantum Teleportation Circuit & Execution Engine.

Executes standard quantum teleportation pipeline for QDS signature verification:
- q0: Source / Signature Qubit (Prepared in Pauli eigenstate)
- q1: Alice's half of the shared Bell pair
- q2: Bob's target qubit receiving the teleported state
Deterministic verification uses feedforward classical conditioning (if_test)
and post-basis rotation to verify transmitted states against theoretical limits.
"""

from typing import Dict
from qiskit import ClassicalRegister, QuantumCircuit, QuantumRegister
from qiskit_aer import AerSimulator

from app.engine.quantum.bell_pairs import create_bell_pair
from app.engine.quantum.pauli_ops import encode_pauli_state


def build_teleportation_circuit(state_prep: str = "+") -> QuantumCircuit:
    """Assembles the complete 3-qubit quantum teleportation circuit.

    Architecture & Registers:
        - QuantumRegister(3, 'q'):
            * q[0]: Source / Signature Qubit (prepared using encode_pauli_state)
            * q[1]: Alice's entangled qubit (half of |Phi+> Bell pair)
            * q[2]: Bob's target qubit (receiving teleported state)
        - ClassicalRegister(2, 'c_alice'):
            * c_alice[0]: Alice's measurement of q0 (controls Z correction on Bob)
            * c_alice[1]: Alice's measurement of q1 (controls X correction on Bob)
        - ClassicalRegister(1, 'c_bob'):
            * c_bob[0]: Bob's verification measurement outcome

    Circuit Protocol Steps:
        1. Encode initial Pauli state ('0', '1', '+', '-') on q0.
        2. Create Bell pair (|Phi+> = (|00> + |11>)/sqrt(2)) between q1 and q2.
        3. Alice Bell measurement: CX(q0, q1), H(q0), measure q0 into c_alice[0], q1 into c_alice[1].
        4. Bob Pauli corrections via dynamic if_test conditioning:
            - If c_alice[0] == 1 -> Apply Z gate to q2
            - If c_alice[1] == 1 -> Apply X gate to q2
        5. Verification measurement:
            - If initial state was '+' or '-', apply Hadamard H(q2) to rotate back to Z-basis.
            - Measure q2 into c_bob[0].

    Args:
        state_prep: Initial Pauli state to teleport ('0', '1', '+', '-').

    Returns:
        QuantumCircuit implementing the full teleportation and verification protocol.
    """
    q = QuantumRegister(3, "q")
    c_alice = ClassicalRegister(2, "c_alice")
    c_bob = ClassicalRegister(1, "c_bob")
    qc = QuantumCircuit(q, c_alice, c_bob, name="teleportation_protocol")

    # Step 1: Encode initial Pauli state on q0
    encode_pauli_state(qc, q[0], state_prep)
    qc.barrier()

    # Step 2: Create entangled Bell pair (|Phi+>) between q1 and q2
    create_bell_pair(qc, q[1], q[2])
    qc.barrier()

    # Step 3: Bell Measurement on Alice's side
    qc.cx(q[0], q[1])
    qc.h(q[0])
    qc.measure(q[0], c_alice[0])
    qc.measure(q[1], c_alice[1])
    qc.barrier()

    # Step 4: Bob's Pauli Corrections using conditional if_test
    # In standard teleportation:
    # c_alice[0] outcome controls Pauli-Z correction
    # c_alice[1] outcome controls Pauli-X correction
    with qc.if_test((c_alice[0], 1)):
        qc.z(q[2])
    with qc.if_test((c_alice[1], 1)):
        qc.x(q[2])
    qc.barrier()

    # Step 5: Verification Measurement
    # If initial state was '+' or '-', rotate back to Z-basis using Hadamard H
    if state_prep in ("+", "-"):
        qc.h(q[2])
    qc.measure(q[2], c_bob[0])

    return qc


def run_teleportation_circuit(state_prep: str = "+", shots: int = 1000) -> Dict[str, int]:
    """Builds circuit, executes on AerSimulator, and returns measurement counts dictionary.

    Args:
        state_prep: Initial Pauli eigenstate to teleport ('0', '1', '+', '-'). Default is '+'.
        shots: Number of measurement simulation shots. Default is 1000.

    Returns:
        Dictionary mapping measurement bitstrings ("<c_bob> <c_alice>") to counts.
    """
    qc = build_teleportation_circuit(state_prep=state_prep)
    simulator = AerSimulator()
    job = simulator.run(qc, shots=shots)
    result = job.result()
    counts: Dict[str, int] = result.get_counts()
    return counts


if __name__ == "__main__":
    print("=" * 70)
    print(" QDS Module A: Core Quantum Physics Engine - Verification Suite")
    print(" Architecture: Qiskit 1.x / Qiskit Aer 0.14+ (Zero AI/ML Deterministic)")
    print("=" * 70)

    test_states = ["0", "1", "+", "-"]
    total_shots = 1000

    for state in test_states:
        print(f"\n[TEST] Teleporting Pauli Eigenstate |{state}> ({total_shots} shots)...")
        counts = run_teleportation_circuit(state_prep=state, shots=total_shots)
        print(f"       Raw Counts ('c_bob c_alice'): {counts}")

        # Extract Bob's target qubit (q2) measurement outcomes
        # Qiskit register bitstrings are formatted as '<c_bob> <c_alice>'
        bob_counts = {"0": 0, "1": 0}
        for bitstring, count in counts.items():
            bob_bit = bitstring.split()[0]
            bob_counts[bob_bit] += count

        # In quantum state tomography / basis verification:
        # - |0> (Z-basis) -> resolves to '0'
        # - |1> (Z-basis) -> resolves to '1'
        # - |+> (X-basis rotated via H) -> resolves to '0' (eigenvalue +1)
        # - |-> (X-basis rotated via H) -> resolves to '1' (eigenvalue -1)
        expected_bit = "0" if state in ("0", "+") else "1"
        fidelity = bob_counts[expected_bit] / total_shots

        print(f"       Bob Marginal Counts (c_bob): {bob_counts}")
        print(f"       Expected Bit: '{expected_bit}' | Measured Fidelity: {fidelity:.2%}")

        # Assert Bob's state fidelity meets the >99% requirement
        assert fidelity > 0.99, (
            f"Teleportation fidelity failure for state |{state}>: "
            f"expected bit '{expected_bit}' fidelity {fidelity:.2%} <= 99%"
        )

        # Explicitly verify post-basis-rotation resolves to bit '0' for |+> and |0>
        if state in ("0", "+"):
            zero_fidelity = bob_counts["0"] / total_shots
            assert zero_fidelity > 0.99, (
                f"Post-basis-rotation state |{state}> failed to resolve to bit '0' with >99% fidelity: "
                f"observed {zero_fidelity:.2%}"
            )

    print("\n" + "=" * 70)
    print(" [ALL TESTS PASSED] Quantum Physics Engine (Module A) 100% Operational.")
    print(" Deterministic teleportation, dynamic Pauli correction, and basis rotations verified.")
    print("=" * 70)
