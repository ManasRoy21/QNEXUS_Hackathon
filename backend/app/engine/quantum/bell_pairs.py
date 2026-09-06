"""Module A: Bell-State Generation.

Generates maximally entangled Bell pairs (|Phi+> = (|00> + |11>) / sqrt(2))
for Quantum Digital Signatures (QDS) key distribution and teleportation channels.
"""

from typing import Optional, Union
from qiskit import QuantumCircuit
from qiskit.circuit import Qubit


def create_bell_pair(
    qc: Optional[QuantumCircuit] = None,
    q_alice: Union[int, Qubit] = 0,
    q_bob: Union[int, Qubit] = 1,
) -> QuantumCircuit:
    """Applies Hadamard and CNOT (CX) gates to entangle q_alice and q_bob into |Phi+> state.

    State Evolution:
        |00> -> (H on q_alice) -> 1/sqrt(2)(|0> + |1>)|0>
             -> (CX from q_alice to q_bob) -> 1/sqrt(2)(|00> + |11>) = |Phi+>

    Args:
        qc: QuantumCircuit to append the Bell pair gates to. If None,
            a new 2-qubit QuantumCircuit is created and returned.
        q_alice: Index or Qubit instance representing Alice's half of the pair.
        q_bob: Index or Qubit instance representing Bob's half of the pair.

    Returns:
        QuantumCircuit containing the entangled Bell pair.
    """
    if qc is None:
        qc = QuantumCircuit(2, name="bell_pair")

    qc.h(q_alice)
    qc.cx(q_alice, q_bob)
    return qc
