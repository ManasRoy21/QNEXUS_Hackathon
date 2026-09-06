"""Bit flip attack: Pre-measurement operator modification."""
from qiskit import QuantumCircuit

def inject_bit_flip(qc: QuantumCircuit, target_qubit: int, probability: float = 1.0) -> QuantumCircuit:
    """Injects Pauli-X bit flip gate into circuit on target qubit."""
    qc.x(target_qubit)
    return qc
